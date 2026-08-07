-- The products/replenishment_requests triggers from the Phase 1 migration
-- (20260805160000_multi_tenant_foundation.sql) never actually landed on the
-- remote database, even though that migration reported success and the
-- sectors_set_company_id trigger from Phase 2 did land correctly. Recreating
-- them here, idempotently, restores the auto company_id fill-in behavior
-- that products/replenishment_requests inserts depend on.

drop trigger if exists products_set_company_id on public.products;
create trigger products_set_company_id before insert on public.products
for each row execute function public.set_company_id_from_profile();

drop trigger if exists replenishment_requests_set_company_id on public.replenishment_requests;
create trigger replenishment_requests_set_company_id before insert on public.replenishment_requests
for each row execute function public.set_company_id_from_profile();
