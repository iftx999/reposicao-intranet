# Multi-tenant Foundation Implementation Plan

> **For agentic workers:** This plan is executed by the Codex subagent (`codex:codex-rescue`) for file-editing tasks, handed off via `SendMessage` from the orchestrating Claude session — NOT via `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Tasks that touch the live remote Supabase database (applying the migration, live isolation testing) are executed by the orchestrator directly (Codex's sandbox has no network access — confirmed earlier in this session). Each task states who executes it.

**Goal:** Introduce `companies` as a tenant boundary so every user, product, and request belongs to exactly one company, with RLS enforcing isolation and a trigger auto-filling `company_id` so no client code (intranet or Android) needs to change.

**Architecture:** One SQL migration adds the schema (`companies` table, `company_id` columns, helper functions, a `before insert` trigger, rewritten RLS policies) and backfills existing data. The intranet gets a new `/api/empresas` route + Empresas screen (super-admin only, gated in `AppShell`), and `/api/usuarios` is updated to stamp `company_id` on new users.

**Tech Stack:** PostgreSQL (Supabase), Next.js/TypeScript (intranet), Supabase CLI (migration apply).

## Global Constraints

- No client code in `intranet/app/(admin)/usuarios/page.tsx`, `produtos/page.tsx`, `solicitacoes/page.tsx`, `UserModal.tsx`, `ProductModal.tsx` changes — RLS + the insert trigger handle scoping transparently (per spec).
- No Android/Kotlin changes in this phase.
- A user belongs to exactly one company; only a super admin (`is_super_admin = true`) can have `company_id` null.
- `npm run build --prefix intranet` must pass with zero errors after every code task.
- Do not commit from Codex tasks — the orchestrator reviews and commits after verifying each task.

---

### Task 1: Write the multi-tenant migration file

**Executor:** Codex (pure file creation, no network).

**Files:**
- Create: `intranet/supabase/migrations/20260805160000_multi_tenant_foundation.sql`

**Interfaces:**
- Produces (consumed by Task 2 when the orchestrator applies it, and implicitly by all later RLS-dependent behavior): tables `public.companies`; columns `profiles.company_id uuid`, `profiles.is_super_admin boolean`, `products.company_id uuid not null`, `replenishment_requests.company_id uuid not null`; functions `public.current_user_company_id() returns uuid`, `public.current_user_is_super_admin() returns boolean`.

- [ ] **Step 1: Create the migration file with this exact content**

```sql
-- Companies (tenants)
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

-- Add tenant columns (nullable first; NOT NULL enforced after backfill)
alter table public.profiles add column company_id uuid references public.companies(id);
alter table public.profiles add column is_super_admin boolean not null default false;
alter table public.products add column company_id uuid references public.companies(id);
alter table public.replenishment_requests add column company_id uuid references public.companies(id);

-- Seed one company and migrate existing data into it
insert into public.companies (name) values ('Minha Empresa');

update public.products
set company_id = (select id from public.companies order by created_at limit 1)
where company_id is null;

update public.replenishment_requests
set company_id = (select id from public.companies order by created_at limit 1)
where company_id is null;

update public.profiles
set is_super_admin = true,
    company_id = (select id from public.companies order by created_at limit 1),
    role = 'admin',
    active = true
where email = 'iftx159@gmail.com';

-- Enforce NOT NULL now that existing rows are backfilled
alter table public.products alter column company_id set not null;
alter table public.replenishment_requests alter column company_id set not null;

-- A non-super-admin must have a company; a super admin may also have one (bootstrap case)
alter table public.profiles add constraint profiles_company_or_super_admin
  check (is_super_admin or company_id is not null);

create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists products_company_id_idx on public.products(company_id);
create index if not exists replenishment_requests_company_id_idx on public.replenishment_requests(company_id);

-- Helper functions
create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_super_admin, false) from public.profiles where id = auth.uid();
$$;

-- Auto-fill company_id on insert so client code (intranet + Android) needs no changes
create or replace function public.set_company_id_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    new.company_id := public.current_user_company_id();
  end if;
  return new;
end;
$$;

drop trigger if exists products_set_company_id on public.products;
create trigger products_set_company_id before insert on public.products
for each row execute function public.set_company_id_from_profile();

drop trigger if exists replenishment_requests_set_company_id on public.replenishment_requests;
create trigger replenishment_requests_set_company_id before insert on public.replenishment_requests
for each row execute function public.set_company_id_from_profile();

-- Update the existing new-user trigger to read company_id/is_super_admin from auth metadata
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, sector_id, active, company_id, is_super_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'operador'),
    new.raw_user_meta_data ->> 'sector_id',
    true,
    nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid,
    coalesce((new.raw_user_meta_data ->> 'is_super_admin')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- RLS: companies
create policy "Super admin manages companies"
on public.companies for all
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "Company members can read own company"
on public.companies for select
to authenticated
using (id = public.current_user_company_id());

-- RLS: profiles (replace old unscoped policies)
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

create policy "Company members can read own company profiles"
on public.profiles for select
to authenticated
using (company_id = public.current_user_company_id());

create policy "Company admins can insert profiles"
on public.profiles for insert
to authenticated
with check (public.current_user_is_admin() and company_id = public.current_user_company_id());

create policy "Company admins can update profiles"
on public.profiles for update
to authenticated
using (public.current_user_is_admin() and company_id = public.current_user_company_id())
with check (public.current_user_is_admin() and company_id = public.current_user_company_id());

create policy "Company admins can delete profiles"
on public.profiles for delete
to authenticated
using (public.current_user_is_admin() and company_id = public.current_user_company_id());

-- RLS: products (replace old unscoped policies)
drop policy if exists "Authenticated users can read products" on public.products;
drop policy if exists "Authenticated users can write products" on public.products;

create policy "Company members can read own products"
on public.products for select to authenticated
using (company_id = public.current_user_company_id());

create policy "Company members can write own products"
on public.products for all to authenticated
using (company_id = public.current_user_company_id())
with check (company_id = public.current_user_company_id());

-- RLS: replenishment_requests (replace old unscoped policies)
drop policy if exists "Authenticated users can read replenishment requests" on public.replenishment_requests;
drop policy if exists "Authenticated users can write replenishment requests" on public.replenishment_requests;

create policy "Company members can read own requests"
on public.replenishment_requests for select to authenticated
using (company_id = public.current_user_company_id());

create policy "Company members can write own requests"
on public.replenishment_requests for all to authenticated
using (company_id = public.current_user_company_id())
with check (company_id = public.current_user_company_id());

-- RLS: replenishment_request_items (scoped via parent request's company_id)
drop policy if exists "Authenticated users can read replenishment request items" on public.replenishment_request_items;
drop policy if exists "Authenticated users can write replenishment request items" on public.replenishment_request_items;

create policy "Company members can read own request items"
on public.replenishment_request_items for select to authenticated
using (exists (
  select 1 from public.replenishment_requests r
  where r.id = replenishment_request_items.request_id
    and r.company_id = public.current_user_company_id()
));

create policy "Company members can write own request items"
on public.replenishment_request_items for all to authenticated
using (exists (
  select 1 from public.replenishment_requests r
  where r.id = replenishment_request_items.request_id
    and r.company_id = public.current_user_company_id()
))
with check (exists (
  select 1 from public.replenishment_requests r
  where r.id = replenishment_request_items.request_id
    and r.company_id = public.current_user_company_id()
));

-- RLS: request_status_events (scoped via parent request's company_id)
drop policy if exists "Authenticated users can read request status events" on public.request_status_events;
drop policy if exists "Authenticated users can write request status events" on public.request_status_events;

create policy "Company members can read own request events"
on public.request_status_events for select to authenticated
using (exists (
  select 1 from public.replenishment_requests r
  where r.id = request_status_events.request_id
    and r.company_id = public.current_user_company_id()
));

create policy "Company members can write own request events"
on public.request_status_events for all to authenticated
using (exists (
  select 1 from public.replenishment_requests r
  where r.id = request_status_events.request_id
    and r.company_id = public.current_user_company_id()
))
with check (exists (
  select 1 from public.replenishment_requests r
  where r.id = request_status_events.request_id
    and r.company_id = public.current_user_company_id()
));
```

- [ ] **Step 2: Report the file was created.** No build/test possible for this step in Codex's sandbox (it's SQL, applied in Task 2). Do not commit.

---

### Task 2: Apply the migration and verify isolation groundwork

**Executor:** Orchestrator only (needs network access to the live Supabase project — do not delegate to Codex).

**Files:** none modified — verification only, using the migration file from Task 1.

- [ ] **Step 1:** Run `& "$env:USERPROFILE\.local-bin\supabase.exe" db push --workdir "C:\Users\tuckm\ai-dashboard-mobile\intranet"` (same CLI already used earlier in this session) with `SUPABASE_ACCESS_TOKEN` set.

- [ ] **Step 2:** Verify via REST (using the service role key, same pattern as earlier in this session):
```bash
curl.exe -s "https://cjscozqcixwniceijmsx.supabase.co/rest/v1/companies?select=*" -H "apikey: <service-role-key>" -H "Authorization: Bearer <service-role-key>"
curl.exe -s "https://cjscozqcixwniceijmsx.supabase.co/rest/v1/profiles?select=id,email,company_id,is_super_admin,role" -H "apikey: <service-role-key>" -H "Authorization: Bearer <service-role-key>"
curl.exe -s "https://cjscozqcixwniceijmsx.supabase.co/rest/v1/products?select=id,name,company_id" -H "apikey: <service-role-key>" -H "Authorization: Bearer <service-role-key>"
```
Expected: one row in `companies` named "Minha Empresa"; the `iftx159@gmail.com` profile has `is_super_admin: true`, `company_id` set to that company's id, `role: admin`; the `Campari` product has `company_id` matching the same company.

- [ ] **Step 3:** Commit the migration file: `git add intranet/supabase/migrations/20260805160000_multi_tenant_foundation.sql && git commit` with a message describing the multi-tenant foundation migration.

---

### Task 3: Update TypeScript types for the new columns

**Executor:** Codex (file edit, no network).

**Files:**
- Modify: `intranet/lib/types.ts`

**Interfaces:**
- Produces: `Company` type, `CompanyCreateValues` type — consumed by Task 5 (`/api/empresas/route.ts`) and Task 7 (Empresas page + modal). Updated `Profile` (adds `company_id: string | null`, `is_super_admin: boolean`), `Product` (adds `company_id: string`), `ReplenishmentRequest` (adds `company_id: string`).

- [ ] **Step 1: Add `company_id` to `Product` and `ReplenishmentRequest`, and change `ProductFormValues` to exclude it**

In `intranet/lib/types.ts`, change:
```ts
export type Product = {
  id: string;
  sector_id: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  favorite: boolean;
};
```
to:
```ts
export type Product = {
  id: string;
  company_id: string;
  sector_id: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  favorite: boolean;
};
```

Change:
```ts
export type ReplenishmentRequest = {
  id: string;
  restaurant_unit_id: string;
```
to:
```ts
export type ReplenishmentRequest = {
  id: string;
  company_id: string;
  restaurant_unit_id: string;
```

Change:
```ts
export type ProductFormValues = Omit<Product, "id">;
```
to:
```ts
export type ProductFormValues = Omit<Product, "id" | "company_id">;
```

(This is required — `company_id` is filled in automatically by the database trigger, `ProductModal.tsx` never sets it, so the form-values type must exclude it or the existing `emptyValues` object literal in `ProductModal.tsx` will fail to type-check.)

- [ ] **Step 2: Add `company_id` and `is_super_admin` to `Profile`**

Change:
```ts
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  sector_id: string | null;
  active: boolean;
  created_at: string;
};
```
to:
```ts
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  sector_id: string | null;
  active: boolean;
  created_at: string;
  company_id: string | null;
  is_super_admin: boolean;
};
```

Leave `ProfileCreateValues` and `ProfileUpdateValues` unchanged — `company_id` for a created profile is derived server-side in `/api/usuarios/route.ts` (Task 4), not passed from the client form.

- [ ] **Step 3: Add `Company` and `CompanyCreateValues` types**

Append to the end of the file:
```ts
export type Company = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type CompanyCreateValues = {
  company_name: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
};
```

- [ ] **Step 4:** Run `npm run build --prefix intranet`. Expected: this will now FAIL in `ProductModal.tsx` and `UserModal.tsx`/`usuarios/page.tsx` if they construct `Profile`/`Product` object literals missing the new required fields — but per the Global Constraints, those files are not supposed to change. Check specifically: does `ProductModal.tsx`'s `emptyValues` (typed as `ProductFormValues`) still type-check after Step 1's exclusion? Does anything else break? Report the exact build output — if it fails anywhere outside the intentional exclusion in Step 1, do not attempt to fix it by editing the excluded files; report it as a blocker for the orchestrator to resolve, since Global Constraints prohibit touching those files in this plan.

- [ ] **Step 5:** Report the diff and build result. Do not commit.

---

### Task 4: Update `/api/usuarios/route.ts` to stamp `company_id` on new users

**Executor:** Codex (file edit, no network).

**Files:**
- Modify: `intranet/app/api/usuarios/route.ts`

**Interfaces:**
- Consumes: `requesterProfile.company_id` (now available since Task 3 widened the `profiles` select).

- [ ] **Step 1: Fetch the requester's `company_id` alongside `role`/`active`**

Change:
```ts
  const { data: requesterProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
```
to:
```ts
  const { data: requesterProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active, company_id")
    .eq("id", user.id)
    .single();
```

- [ ] **Step 2: Pass `company_id` in the new user's metadata**

Change:
```ts
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      sector_id: sectorId
    }
  });
```
to:
```ts
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      sector_id: sectorId,
      company_id: requesterProfile.company_id,
      is_super_admin: false
    }
  });
```

- [ ] **Step 3: Include `company_id` in the explicit profile upsert**

Change:
```ts
  const profile = {
    id: authData.user.id,
    full_name: fullName,
    email,
    role,
    sector_id: sectorId,
    active
  };
```
to:
```ts
  const profile = {
    id: authData.user.id,
    full_name: fullName,
    email,
    role,
    sector_id: sectorId,
    active,
    company_id: requesterProfile.company_id,
    is_super_admin: false
  };
```

- [ ] **Step 4:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors.

- [ ] **Step 5:** Report the diff and build result. Do not commit.

---

### Task 5: Create `/api/empresas/route.ts`

**Executor:** Codex (file edit, no network).

**Files:**
- Create: `intranet/app/api/empresas/route.ts`

**Interfaces:**
- Consumes: `Company`, `CompanyCreateValues` from `@/lib/types` (Task 3).
- Produces: `POST /api/empresas` — request body `CompanyCreateValues`, response `{ company: Company }` on 201, `{ error: string }` on 4xx/5xx. Consumed by Task 7 (Empresas page).

- [ ] **Step 1: Create the file with this exact content**

```ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { CompanyCreateValues } from "@/lib/types";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY nao configurada." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Sessao ausente." }, { status: 401 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const { data: requesterProfile, error: profileError } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (profileError || requesterProfile?.is_super_admin !== true) {
    return NextResponse.json({ error: "Apenas o super admin pode criar empresas." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CompanyCreateValues>;
  const companyName = body.company_name?.trim();
  const adminFullName = body.admin_full_name?.trim();
  const adminEmail = body.admin_email?.trim().toLowerCase();
  const adminPassword = body.admin_password;

  if (!companyName || !adminFullName || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "Nome da empresa, nome do admin, email e senha temporaria sao obrigatorios." },
      { status: 400 }
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select("*")
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: companyError?.message || "Erro ao criar empresa." }, { status: 400 });
  }

  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminFullName,
      role: "admin",
      company_id: company.id,
      is_super_admin: false
    }
  });

  if (createError || !authData.user) {
    return NextResponse.json({ error: createError?.message || "Erro ao criar admin da empresa." }, { status: 400 });
  }

  const profile = {
    id: authData.user.id,
    full_name: adminFullName,
    email: adminEmail,
    role: "admin" as const,
    sector_id: null,
    active: true,
    company_id: company.id,
    is_super_admin: false
  };

  const { error: profileInsertError } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (profileInsertError) {
    return NextResponse.json({ error: profileInsertError.message }, { status: 400 });
  }

  return NextResponse.json({ company }, { status: 201 });
}
```

- [ ] **Step 2:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors.

- [ ] **Step 3:** Report confirmation and build result. Do not commit.

---

### Task 6: Gate the "Empresas" nav item to super admins

**Executor:** Codex (file edit, no network).

**Files:**
- Modify: `intranet/components/AppShell.tsx`

**Interfaces:**
- Consumes: `useAuth().profile.is_super_admin` (from `AuthProvider.tsx`, which already does `select("*")` on `profiles` — no change needed there since Task 3 widened the `Profile` type it deserializes into).

- [ ] **Step 1: Import the `Building2` icon and destructure `profile` from `useAuth()`**

Change:
```ts
import { Expand, LayoutDashboard, LogOut, PackageSearch, Settings, ClipboardList, LucideIcon, Users } from "lucide-react";
```
to:
```ts
import { Building2, Expand, LayoutDashboard, LogOut, PackageSearch, Settings, ClipboardList, LucideIcon, Users } from "lucide-react";
```

Change:
```ts
  const { session, loading } = useAuth();
```
to:
```ts
  const { session, profile, loading } = useAuth();
```

- [ ] **Step 2: Conditionally include the "Empresas" nav item**

Change:
```tsx
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
```
to:
```tsx
          <nav className="hidden items-center gap-1 lg:flex">
            {(profile?.is_super_admin
              ? [...navItems, { href: "/empresas", label: "Empresas", icon: Building2 }]
              : navItems
            ).map((item) => {
```

- [ ] **Step 3:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors.

- [ ] **Step 4:** Report the diff and build result. Do not commit.

---

### Task 7: Create the Empresas page and EmpresaModal

**Executor:** Codex (file edit, no network).

**Files:**
- Create: `intranet/components/EmpresaModal.tsx`
- Create: `intranet/app/(admin)/empresas/page.tsx`

**Interfaces:**
- Consumes: `Company`, `CompanyCreateValues` from `@/lib/types` (Task 3); `POST /api/empresas` (Task 5); shadcn `Button`, `Input`, `Label`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Badge` (all already in `intranet/components/ui/`, generated and committed earlier in this session).
- Produces: `EmpresaModal({ onClose, onCreate }: { onClose: () => void; onCreate: (values: CompanyCreateValues) => Promise<void> })` — a self-contained dialog component, no other file consumes it besides the new page.

- [ ] **Step 1: Create `intranet/components/EmpresaModal.tsx` with this exact content**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyCreateValues } from "@/lib/types";

const emptyValues: CompanyCreateValues = {
  company_name: "",
  admin_full_name: "",
  admin_email: "",
  admin_password: ""
};

export function EmpresaModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (values: CompanyCreateValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CompanyCreateValues>(emptyValues);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onCreate(values);
    setSaving(false);
  }

  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Adicionar empresa</DialogTitle>
            <DialogDescription>Cria a empresa e o primeiro usuário admin dela.</DialogDescription>
          </DialogHeader>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome da empresa</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, company_name: event.target.value }))}
                required
                value={values.company_name}
              />
            </div>
            <div>
              <Label>Nome do admin</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, admin_full_name: event.target.value }))}
                required
                value={values.admin_full_name}
              />
            </div>
            <div>
              <Label>Email do admin</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, admin_email: event.target.value }))}
                required
                type="email"
                value={values.admin_email}
              />
            </div>
            <div>
              <Label>Senha temporária</Label>
              <Input
                className="mt-2"
                minLength={6}
                onChange={(event) => setValues((current) => ({ ...current, admin_password: event.target.value }))}
                required
                type="password"
                value={values.admin_password}
              />
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button onClick={onClose} type="button" variant="outline">Cancelar</Button>
            <Button disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `intranet/app/(admin)/empresas/page.tsx` with this exact content**

```tsx
"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EmpresaModal } from "@/components/EmpresaModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyCreateValues } from "@/lib/types";

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("companies").select("*").order("name");

    if (loadError) {
      setError(loadError.message);
    } else {
      setCompanies((data || []) as Company[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  async function createCompany(values: CompanyCreateValues) {
    setError("");
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const response = await fetch("/api/empresas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Erro ao criar empresa.");
      return;
    }

    setModalOpen(false);
    await loadCompanies();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Plataforma</p>
          <h1 className="mt-2 text-3xl font-black text-graphite">Empresas</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-charcoal hover:bg-charcoal">
              {["Nome", "Ativa", "Criada em"].map((heading) => (
                <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-muted" colSpan={3}>Carregando empresas...</TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell className="text-muted" colSpan={3}>Nenhuma empresa encontrada.</TableCell></TableRow>
            ) : (
              companies.map((company) => (
                <TableRow className="hover:bg-ice" key={company.id}>
                  <TableCell className="font-bold text-graphite">{company.name}</TableCell>
                  <TableCell>
                    <Badge variant={company.active ? "success" : "destructive"}>
                      {company.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{new Date(company.created_at).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {modalOpen ? <EmpresaModal onClose={() => setModalOpen(false)} onCreate={createCompany} /> : null}
    </main>
  );
}
```

- [ ] **Step 3:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors, `/empresas` appears in the route list.

- [ ] **Step 4:** Report the created files and build result. Do not commit.

---

### Task 8: Final verification — isolation test and build

**Executor:** Orchestrator only (needs network access to the live Supabase project and the running dev server).

**Files:** none modified — verification only.

- [ ] **Step 1:** Run `npm run build --prefix intranet` once more with all tasks' changes combined. Expected: zero errors.

- [ ] **Step 2:** Log into the dev server (`localhost:3000`) as `iftx159@gmail.com`. Confirm the "Empresas" nav item is visible, and the existing Usuários/Produtos/Solicitações screens still show the existing (now company-scoped) data.

- [ ] **Step 3:** Through the Empresas screen, create a second company with a new admin (distinct email/password). Log in as that new admin in a separate browser context (or after signing out). Confirm: zero products, zero users, zero requests visible (isolation working) and the "Empresas" nav item does NOT appear for this non-super-admin user.

- [ ] **Step 4:** As the second company's admin, create one test product via the Produtos screen. Confirm it appears for that company but does not appear when logged back in as `iftx159@gmail.com` browsing Produtos (cross-tenant isolation on writes, not just reads).

- [ ] **Step 5:** Report the outcome of Steps 2–4 to the user. This is the final task of the plan.

## Self-Review Notes

- **Spec coverage:** `companies` table + RLS → Task 1/2. Auto `company_id` fill-in trigger → Task 1. `handle_new_user_profile` update (needed for user creation to not break under the new NOT NULL/constraint — a gap in the original spec's SQL sketch, caught during planning and fixed here) → Task 1. Data migration/backfill → Task 1/2. `/api/empresas` → Task 5. Empresas screen → Task 7. AppShell nav gating → Task 6. `/api/usuarios` stamping `company_id` → Task 4. Android — explicitly verified as needing no changes, confirmed by the trigger design; no task needed, covered by Task 8's live write test which exercises the same insert path Android would use.
- **Placeholder scan:** every task has literal file content, not descriptions.
- **Type consistency:** `Company`/`CompanyCreateValues` defined once in Task 3, used identically in Tasks 5 and 7. `EmpresaModal`'s `onCreate: (values: CompanyCreateValues) => Promise<void>` signature matches exactly what `empresas/page.tsx`'s `createCompany` function provides.
- **Contradiction caught and fixed:** the spec's check constraint (`(is_super_admin and company_id is null) or (not is_super_admin and company_id is not null)`) conflicts with the spec's own data migration step, which gives the bootstrap user both `is_super_admin = true` and a `company_id`. Task 1 uses the corrected constraint `is_super_admin or company_id is not null`, which permits that combination while still requiring every non-super-admin to have a company.
