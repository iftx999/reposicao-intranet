# Multi-tenant Foundation (Phase 1 of the SaaS roadmap)

## Context

This is the first of a three-phase roadmap to turn the intranet + Android app into a multi-tenant SaaS:

1. **Multi-tenant foundation** (this spec) — companies as isolated workspaces
2. **Setor as a real entity** — depends on this spec (sectors belong to a company)
3. **Estoque (inventory) + Requisição/Reposição linkage** — depends on both prior phases

Today the schema (`intranet/supabase/migrations/`) has no concept of a company/tenant. All authenticated users see all rows in `products`, `profiles`, `replenishment_requests`, etc. (RLS policies check `to authenticated using (true)`). This spec introduces `companies` as the tenant boundary and scopes every existing table to one.

## Goals

- A user belongs to exactly one company (`profiles.company_id`), except a platform-level **super admin** who manages the list of companies and belongs to none.
- All business data (`products`, `replenishment_requests`, and their children) is scoped to a company via RLS — a user can only ever see/write rows belonging to their own company.
- New rows get their `company_id` filled in automatically, so **no client code (intranet or Android) needs to pass `company_id` explicitly**.
- Existing data (today: one user, one product) is migrated into a single seeded company so nothing breaks.

## Non-goals (deferred to later phases or explicitly out of scope)

- A user switching between multiple companies (out of scope — always exactly one company per user).
- Public self-service company signup (out of scope — only a super admin creates companies).
- Setor and Estoque entities (later phases).
- Any change to the Android app's Kotlin code (Phase 1 is designed specifically so none is needed — see "Automatic `company_id` fill-in" below).

## Schema

### New table: `companies`

```sql
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### `profiles` changes

- Add `company_id uuid references public.companies(id)` — **nullable**, because a super admin has no company.
- Add `is_super_admin boolean not null default false`.
- Add a check constraint: a row must either be a super admin with `company_id is null`, or a non-super-admin with `company_id is not null`:
  ```sql
  alter table public.profiles add constraint profiles_company_or_super_admin
    check (is_super_admin or company_id is not null);
  ```
  (A super admin's `company_id` is unconstrained — usually null, but the bootstrap super admin in this spec's Data migration section also holds a `company_id`, which this constraint permits. Every non-super-admin must have a `company_id`.)

### `products` and `replenishment_requests` changes

- Add `company_id uuid not null references public.companies(id)` to both.
- `replenishment_request_items` and `request_status_events` do **not** get a `company_id` column — their RLS (below) checks the parent `replenishment_requests.company_id` via `exists (...)`, avoiding a denormalized column that could drift from its parent.

## Automatic `company_id` fill-in

A `before insert` trigger on `products` and `replenishment_requests`, reusing the existing `current_user_company_id()` helper (defined below):

```sql
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

create trigger products_set_company_id before insert on public.products
for each row execute function public.set_company_id_from_profile();

create trigger replenishment_requests_set_company_id before insert on public.replenishment_requests
for each row execute function public.set_company_id_from_profile();
```

This runs before the RLS `with check` on insert, so a plain `insert into products (...)` from the Android app (which has no `company_id` column in its Kotlin models today) or from the intranet's `ProductModal`/`solicitacoes` flow continues to work unmodified — Postgres fills it in from the inserting user's own profile.

## Helper functions

```sql
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
```

`current_user_is_admin()` (already exists from the `profiles` migration, checks `role = 'admin' and active = true`) is unchanged and combines with the new company scoping in policies below.

## RLS policies

**`companies`**
- Select: `current_user_is_super_admin()` (sees all) `or id = current_user_company_id()` (a company's own users can read their own company's name/status).
- Insert/update: `current_user_is_super_admin()` only. No delete policy (companies are deactivated via `active = false`, never deleted).

**`profiles`**
- Select: `company_id = current_user_company_id()` (same-company only). Super admin does not get blanket access to profiles — company data stays private even from the platform operator, per this spec's scope (see Note below).
- Insert/update/delete: `current_user_is_admin() and company_id = current_user_company_id()` (an admin can only manage profiles within their own company) — replaces the current unscoped `public.current_user_is_admin()` check.

**`products`, `replenishment_requests`**
- Select/insert/update/delete: `company_id = current_user_company_id()`.

**`replenishment_request_items`, `request_status_events`**
- Select/insert/update/delete: `exists (select 1 from public.replenishment_requests r where r.id = replenishment_request_items.request_id and r.company_id = current_user_company_id())` (same pattern for `request_status_events`, joining on `request_id`).

**Note on super admin scope:** the super admin's RLS access is limited to the `companies` table only. They cannot read `products`/`profiles`/`requests` of any company through RLS. If future support tooling needs that, it's a separate, explicit decision — not implied by "super admin" here.

## Data migration

In the same migration that adds the columns:

1. Insert one row into `companies`: `name = 'Minha Empresa'` (placeholder, renameable later via the Empresas screen).
2. Backfill `products.company_id` and `replenishment_requests.company_id` with that company's `id` (there is currently one product and zero requests, per the live database check done during spec review).
3. Update the existing profile (`iftx159@gmail.com`) to: `is_super_admin = true`, `company_id = <that company's id>`, `role = 'admin'`, `active = true` — this user is simultaneously the platform's super admin and the admin of the seeded company, so no second login is needed to keep managing both.
4. Only after backfill, alter `products.company_id` and `replenishment_requests.company_id` to `not null`.

## Intranet changes

**New route `intranet/app/api/empresas/route.ts`** (`POST`), modeled on the existing `intranet/app/api/usuarios/route.ts`:
- Requires a valid session (`Authorization: Bearer <token>`).
- Requires the requester's profile to have `is_super_admin = true` (403 otherwise) — checked via the service-role client, same pattern as the existing admin check.
- Body: `{ company_name, admin_full_name, admin_email, admin_password }`.
- Creates the `companies` row, then creates the first admin user via `supabase.auth.admin.createUser` (same as `/api/usuarios`), then inserts/updates the resulting `profiles` row with `company_id` = the new company and `role = 'admin'`.

**New page `intranet/app/(admin)/empresas/page.tsx`**: list of companies (name, active status) + a modal to create one (company name + first admin's name/email/temp password), same list/modal pattern as `usuarios/page.tsx` and `UserModal.tsx`, using the shadcn primitives already in `intranet/components/ui/`.

**`intranet/components/AppShell.tsx`**: the "Empresas" nav item is added to `navItems`, but conditionally rendered — only shown when the logged-in user's profile has `is_super_admin = true`. This requires `AppShell` to know that flag; simplest approach is to extend whatever already loads the current user's session/profile (currently `useAuth()` in `intranet/components/AuthProvider.tsx`) to also expose `is_super_admin`, or have `AppShell` do a lightweight `profiles` select for the current `auth.uid()` on mount. The implementer should check `AuthProvider.tsx`'s current shape before deciding which.

**`intranet/app/api/usuarios/route.ts`**: after loading the requester's own profile (already done, to check `role === 'admin'`), also read that profile's `company_id` and include it explicitly when calling `.upsert(profile, ...)` for the new user's profile row (don't rely solely on the insert trigger here, since profile creation doesn't go through the `products`/`replenishment_requests` trigger — this route already does its own explicit profile insert, so it sets `company_id` directly from the requester's own profile).

**`usuarios/page.tsx`, `produtos/page.tsx`, `solicitacoes/page.tsx`, `UserModal.tsx`, `ProductModal.tsx`**: no code changes. Their `supabase.from(...).select()/insert()/update()` calls are unscoped today and stay unscoped — RLS does the filtering, and the insert trigger does the fill-in.

## Android app

No code changes in this phase. The app authenticates via Supabase Auth and inserts into `replenishment_requests`/`replenishment_request_items` via REST; RLS and the insert trigger apply transparently. This is verified manually after migration (see Testing) rather than by changing Kotlin code.

## Testing / verification

- After migration: confirm via SQL (`select * from companies`, `select company_id from profiles`, `select company_id from products`) that the seeded company and backfilled `company_id`s look right.
- Log into the intranet as `iftx159@gmail.com`: confirm the "Empresas" nav item appears, existing Usuários/Produtos/Solicitações screens still show the (now company-scoped) existing data.
- Create a second company + admin via the new Empresas screen; log in as that new admin (different browser/incognito) and confirm they see zero products/users/requests (proper isolation) and can create their own without seeing the first company's data.
- `npm run build --prefix intranet` passes.
- Manually create a replenishment request from the Android app (or confirm via existing test flow) against the live project and confirm it lands with the correct `company_id` via the trigger, with no app code changes.

## Self-review notes

- **Scope check:** this spec is exactly Phase 1 from the approved roadmap — company isolation only. Setor and Estoque are explicitly deferred.
- **Ambiguity resolved explicitly:** super admin's RLS reach is scoped to `companies` only (not blanket access to all companies' business data) — called out as a deliberate, narrow default rather than left implicit.
- **Consistency:** the trigger-based auto-fill and the RLS `with check` were checked against Postgres's actual execution order (`before insert` trigger runs and can mutate `NEW` before the row is evaluated against `with check`), so the design is mechanically sound, not just plausible.
