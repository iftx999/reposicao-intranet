# Estoque + Dashboard — Phase 3 of the SaaS roadmap

## Context

Phases 1 (multi-tenant) and 2 (Sectors) are implemented and live. This is Phase 3: `products` gains a real stock quantity, fulfilling a replenishment request automatically adds to it, and the Dashboard (currently a placeholder) shows low-stock alerts and a request-status summary.

## Decisions (from user Q&A)

- Marking a `replenishment_requests` row `replenished` sums each of its items' `quantity` into the corresponding `products.quantity` — automatic, not a separate manual-only step.
- Stock quantity lives as a new column on `products` (no separate `inventory` table) and is shown as a new "Estoque" column on the existing Produtos screen, editable via the existing `ProductModal`.
- Each product also gets a `min_quantity` (configurable per product, not a single global constant) — the Dashboard's low-stock alert is `quantity < min_quantity`.
- Dashboard shows: (1) products currently below their `min_quantity`, (2) current counts of requests by status (pending / in separation / replenished / cancelled) — current totals, not time-windowed.

## Schema

```sql
alter table public.products add column quantity numeric not null default 0;
alter table public.products add column min_quantity numeric not null default 0;
```

A trigger on `replenishment_requests` fires on `update` when `status` transitions into `'replenished'` (guarded so it only fires once per transition, not on every subsequent edit while status stays `'replenished'`), and for each of that request's `replenishment_request_items`, adds the item's `quantity` to the matching product's `quantity`.

## Intranet changes

- **`ProductModal.tsx`**: two new numeric fields, "Quantidade" and "Quantidade mínima" (`quantity`, `min_quantity`), alongside the existing fields.
- **`produtos/page.tsx`**: new "Estoque" table column showing `quantity`; visually flagged (e.g. a destructive-styled badge or text) when `quantity < min_quantity`.
- **`dashboard/page.tsx`**: replaces the `PlaceholderPage` with two sections — a table of products where `quantity < min_quantity` (name, current quantity, minimum), and four stat tiles (one per `RequestStatus`) showing the current count of `replenishment_requests` in that status. Both scoped to the logged-in user's company via existing RLS (no new query filters needed client-side).

## Out of scope

Manual stock decrement/consumption tracking (there's no "sale" or "usage" concept in this app yet — stock only ever goes up via replenishment fulfillment or manual edit in `ProductModal`), time-windowed dashboard metrics, Android app changes, notifications/emails for low stock.

## Testing / verification

- After migration: confirm via REST that `products.quantity` and `min_quantity` exist and default to 0 on the existing `Campari` row.
- `npm run build --prefix intranet` passes.
- Manual check (left to the user): edit a product's quantity/min in ProductModal and confirm it's reflected in the Produtos table and (if below minimum) on the Dashboard; create and fulfill a replenishment request for that product and confirm its quantity increases by the requested amount.
