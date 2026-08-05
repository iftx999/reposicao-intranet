# Setor (Sectors) — Phase 2 of the SaaS roadmap

## Context

Phase 1 (multi-tenant foundation, `docs/superpowers/specs/2026-08-05-multi-tenant-foundation-design.md`) is implemented and live. This is Phase 2: turning `products.sector_id` from free text into a real `sectors` entity, scoped per company like everything else introduced in Phase 1.

Decisions carried over from the earlier (pre-multi-tenant) discussion of this feature, still valid:
- Only `products` gets the FK in this phase — `profiles.sector_id` and `replenishment_requests.sector_id` stay free text (out of scope).
- A sector has only `name` and `active` (no code/description fields).
- A dedicated "Setores" screen (list + create/edit modal), visible to all company members (not super-admin-gated — it's regular company data, like Produtos).

## Schema

```sql
create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
```

`company_id` is filled in automatically by the existing `set_company_id_from_profile()` trigger (added in Phase 1) — reused as-is, applied to `sectors` too. RLS follows the same pattern as `products`: any authenticated member of the company can read and write their company's sectors (no admin gating — consistent with how `products` already works).

`products.sector_id` changes from `text not null` to `uuid not null references public.sectors(id)`.

## Data migration

1. Seed `sectors` from the distinct `(company_id, sector_id)` pairs already in `products` (today: one row, `"BAR"`, for the one seeded company).
2. Add a new nullable `products.sector_id_new uuid` column, backfill it by matching the old text value to the newly seeded sector's name within the same company, then drop the old `sector_id` text column and rename the new one into its place, then set it `not null`.

## Intranet changes

- **New `Sector`, `SectorCreateValues`, `SectorUpdateValues` types** in `intranet/lib/types.ts`.
- **New page** `intranet/app/(admin)/setores/page.tsx` + **new component** `intranet/components/SectorModal.tsx`, same list/modal pattern as `usuarios/page.tsx`/`UserModal.tsx`, using existing shadcn primitives (`Table`, `Badge`, `Dialog`, `Input`, `Checkbox`, `Button`, `Label`). Straight `supabase.from("sectors").insert/update(...)` calls — no new API route needed, since sectors don't involve `auth.users` the way user/company creation does.
- **`AppShell.tsx`**: adds a "Setores" nav item (unconditional, next to "Pesquisa/Produtos" — visible to everyone, not super-admin-gated).
- **`ProductModal.tsx`**: the "Setor" field changes from a free-text `Input` to a `Select` populated from `sectors` (fetched on mount, filtered to `active = true`).
- **`produtos/page.tsx`**: the Setor filter changes from deriving distinct text values out of loaded products to a `Select` listing the company's sectors by name (value = sector id); the products table displays the sector's name (looked up from the loaded sectors list), not the raw id.

## Out of scope

`profiles.sector_id` and `replenishment_requests.sector_id` (still free text), sector deletion (only deactivation via the `active` toggle, same convention as Produtos/Usuários), Android app changes.

## Testing / verification

- After migration: confirm via REST that `sectors` has one row (`"BAR"`) for the seeded company, and the `Campari` product's `sector_id` now points to that sector's `id`.
- `npm run build --prefix intranet` passes.
- Manual check (left to the user, same as Phase 1): Setores screen lists/creates sectors; Produtos' Setor filter and the ProductModal's Setor dropdown both show sector names, not raw ids or free text.
