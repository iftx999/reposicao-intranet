# Estoque and Dashboard Implementation Plan

> **For agentic workers:** Executed by the Codex subagent (`codex:codex-rescue`) for file-editing tasks, handed off by the orchestrating Claude session — NOT via `superpowers:subagent-driven-development` or `superpowers:executing-plans`. The migration apply/verify task is executed by the orchestrator directly.

**Goal:** Give `products` a real stock quantity that auto-increments when a replenishment request is fulfilled, surface it on the Produtos screen, and replace the Dashboard placeholder with low-stock alerts and a request-status summary.

**Architecture:** One migration adds `quantity`/`min_quantity` to `products` and an `after update` trigger on `replenishment_requests` that sums fulfilled items into stock. Three independent intranet files pick up the new fields.

**Tech Stack:** PostgreSQL (Supabase), Next.js/TypeScript, existing shadcn/ui primitives.

## Global Constraints

- No new tables — stock lives on `products` directly (per spec).
- No manual stock decrement/consumption feature — out of scope.
- `npm run build --prefix intranet` must pass with zero errors after every code task.
- Do not commit from Codex tasks — the orchestrator reviews and commits after verifying.

---

### Task 1: Write and apply the stock migration

**Executor:** Orchestrator.

**Files:**
- Create: `intranet/supabase/migrations/20260805180000_stock_and_dashboard.sql`

- [ ] **Step 1:** Create the file with this exact content:

```sql
alter table public.products add column quantity numeric not null default 0;
alter table public.products add column min_quantity numeric not null default 0;

create or replace function public.apply_replenishment_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'replenished' and (old.status is distinct from 'replenished') then
    update public.products p
    set quantity = p.quantity + i.quantity
    from public.replenishment_request_items i
    where i.request_id = new.id and i.product_id = p.id;
  end if;

  return new;
end;
$$;

drop trigger if exists replenishment_requests_apply_stock on public.replenishment_requests;
create trigger replenishment_requests_apply_stock
after update on public.replenishment_requests
for each row execute function public.apply_replenishment_to_stock();
```

- [ ] **Step 2:** Apply via `& "$env:USERPROFILE\.local-bin\supabase.exe" db push --workdir "C:\Users\tuckm\ai-dashboard-mobile\intranet"` with `SUPABASE_ACCESS_TOKEN` set.

- [ ] **Step 3:** Verify via REST (service role key): `GET /rest/v1/products?select=id,name,quantity,min_quantity`. Expected: `Campari` has `quantity: 0`, `min_quantity: 0`.

- [ ] **Step 4:** Commit the migration file.

---

### Task 2: Add quantity/min_quantity to the Product type

**Executor:** Codex (file edit).

**Files:**
- Modify: `intranet/lib/types.ts`

**Interfaces:**
- Produces: `Product.quantity: number`, `Product.min_quantity: number` — consumed by Tasks 3, 4, 5. Since `ProductFormValues = Omit<Product, "id" | "company_id">`, it automatically gains both fields too (they are meant to be editable in `ProductModal`, unlike `company_id`).

- [ ] **Step 1:** In `intranet/lib/types.ts`, change:
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
  quantity: number;
  min_quantity: number;
};
```

- [ ] **Step 2:** Run `npm run build --prefix intranet`. Expected: this will likely FAIL now in `ProductModal.tsx` (its `emptyValues` object literal, typed as `ProductFormValues`, won't have `quantity`/`min_quantity` yet — that's fixed in Task 3, which depends on this task). Report the exact build output either way.

- [ ] **Step 3:** Report the diff and build result. Do not commit.

---

### Task 3: Add Quantidade/Quantidade mínima fields to ProductModal

**Executor:** Codex (file edit). Depends on Task 2 being committed first.

**Files:**
- Modify: `intranet/components/ProductModal.tsx`

- [ ] **Step 1:** Change the `emptyValues` object:
```ts
const emptyValues: ProductFormValues = {
  name: "",
  category: "",
  sector_id: "",
  unit: "",
  active: true,
  favorite: false
};
```
to:
```ts
const emptyValues: ProductFormValues = {
  name: "",
  category: "",
  sector_id: "",
  unit: "",
  active: true,
  favorite: false,
  quantity: 0,
  min_quantity: 0
};
```

- [ ] **Step 2:** Add two fields to the form grid, right after the "Unidade" field block. Find:
```tsx
            <div>
              <Label>Unidade</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, unit: event.target.value }))}
                required
                value={values.unit}
              />
            </div>
```
and add immediately after its closing `</div>`, still inside the same `grid gap-4 sm:grid-cols-2` container:
```tsx
            <div>
              <Label>Quantidade</Label>
              <Input
                className="mt-2"
                min={0}
                onChange={(event) => setValues((current) => ({ ...current, quantity: Number(event.target.value) }))}
                required
                type="number"
                value={values.quantity}
              />
            </div>
            <div>
              <Label>Quantidade mínima</Label>
              <Input
                className="mt-2"
                min={0}
                onChange={(event) => setValues((current) => ({ ...current, min_quantity: Number(event.target.value) }))}
                required
                type="number"
                value={values.min_quantity}
              />
            </div>
```

- [ ] **Step 3:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors.

- [ ] **Step 4:** Report the diff and build result. Do not commit.

---

### Task 4: Add the Estoque column to produtos/page.tsx

**Executor:** Codex (file edit). Depends on Task 2 being committed first. Independent of Task 3 (different file).

**Files:**
- Modify: `intranet/app/(admin)/produtos/page.tsx`

- [ ] **Step 1:** Change the table headings array and the `colSpan` values that reference its length. Change:
```tsx
              {["Nome", "Categoria", "Setor", "Unidade", "Ativo", "Favorito", "Ações"].map((heading) => (
```
to:
```tsx
              {["Nome", "Categoria", "Setor", "Unidade", "Estoque", "Ativo", "Favorito", "Ações"].map((heading) => (
```
Change both occurrences of `colSpan={7}` (loading row and empty row) to `colSpan={8}`.

- [ ] **Step 2:** Add the Estoque cell, right after the Unidade cell. Find:
```tsx
                  <TableCell className="text-muted">{product.unit}</TableCell>
```
and add immediately after it:
```tsx
                  <TableCell>
                    <Badge variant={product.quantity < product.min_quantity ? "destructive" : "secondary"}>
                      {product.quantity}
                    </Badge>
                  </TableCell>
```

- [ ] **Step 3:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors.

- [ ] **Step 4:** Report the diff and build result. Do not commit.

---

### Task 5: Rebuild the Dashboard with low-stock alerts and status counts

**Executor:** Codex (file edit). Depends on Task 2 being committed first. Independent of Tasks 3 and 4 (different file).

**Files:**
- Modify: `intranet/app/(admin)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `Product`, `RequestStatus` from `@/lib/types`; `statusLabels` from `@/lib/status` (already exists, maps each `RequestStatus` to a Portuguese label); shadcn `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Badge`.

- [ ] **Step 1:** Replace the entire file content with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statusLabels } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Product, RequestStatus } from "@/lib/types";

const statusOrder: RequestStatus[] = ["pending", "in_separation", "replenished", "cancelled"];

export default function DashboardPage() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<RequestStatus, number>>({
    pending: 0,
    in_separation: 0,
    replenished: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: products } = await supabase.from("products").select("*");
      const belowMinimum = ((products || []) as Product[]).filter(
        (product) => product.quantity < product.min_quantity
      );
      setLowStock(belowMinimum);

      const { data: requests } = await supabase.from("replenishment_requests").select("status");
      const counts: Record<RequestStatus, number> = {
        pending: 0,
        in_separation: 0,
        replenished: 0,
        cancelled: 0
      };
      for (const request of (requests || []) as { status: RequestStatus }[]) {
        counts[request.status] += 1;
      }
      setStatusCounts(counts);

      setLoading(false);
    }

    void load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">BAR Intranet</p>
        <h1 className="mt-2 text-3xl font-black text-graphite">Dashboard</h1>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statusOrder.map((status) => (
          <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm" key={status}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{statusLabels[status]}</p>
            <p className="mt-2 text-3xl font-black text-graphite">{loading ? "-" : statusCounts[status]}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Estoque baixo</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-charcoal hover:bg-charcoal">
                {["Produto", "Estoque atual", "Mínimo"].map((heading) => (
                  <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell className="text-muted" colSpan={3}>Carregando...</TableCell></TableRow>
              ) : lowStock.length === 0 ? (
                <TableRow><TableCell className="text-muted" colSpan={3}>Nenhum produto abaixo do mínimo.</TableCell></TableRow>
              ) : (
                lowStock.map((product) => (
                  <TableRow className="hover:bg-ice" key={product.id}>
                    <TableCell className="font-bold text-graphite">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{product.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{product.min_quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
```

(This drops the `PlaceholderPage` import/usage from this file only — `intranet/components/PlaceholderPage.tsx` itself is untouched and stays in use by `administrativo/page.tsx`.)

- [ ] **Step 2:** Run `npm run build --prefix intranet`. Expected: zero TypeScript errors.

- [ ] **Step 3:** Report the diff and build result. Do not commit.

---

### Task 6: Final consolidated verification

**Executor:** Orchestrator.

- [ ] **Step 1:** Clean rebuild (`rm -rf intranet/.next && npm run build --prefix intranet`) with all tasks' changes combined. Expected: zero errors.

- [ ] **Step 2:** Report completion to the user, noting the manual end-to-end check (create + fulfill a replenishment request, confirm stock increments; edit a product's min_quantity below current quantity, confirm it appears on the Dashboard) is the user's to do, same as prior phases.

## Self-Review Notes

- **Spec coverage:** schema + trigger → Task 1. `Product` type → Task 2. `ProductModal` fields → Task 3. Produtos table column → Task 4. Dashboard → Task 5.
- **Placeholder scan:** none — all steps have literal file content.
- **Type consistency:** `Product.quantity`/`min_quantity` defined once in Task 2; `ProductFormValues` (unchanged, derived via `Omit`) automatically includes them, consumed identically in Task 3's `emptyValues` and Task 4/5's direct field reads.
- **Task independence:** Tasks 3, 4, 5 each touch a different file and only depend on Task 2's committed type change — safe to run in parallel.
