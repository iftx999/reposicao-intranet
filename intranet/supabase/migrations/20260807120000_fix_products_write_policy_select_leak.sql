-- A policy "Company members can write own products" foi criada como FOR ALL, que
-- inclui SELECT. Policies permissivas sao combinadas com OR, entao ela anulava a
-- restricao de setor de 20260805200000_restrict_products_read_by_sector.sql: um
-- operador lia qualquer produto da empresa satisfazendo apenas o company_id.
--
-- Aqui a policy FOR ALL vira INSERT/UPDATE/DELETE explicitos, com a mesma condicao
-- de empresa. Escrita continua liberada para qualquer membro da empresa; restringir
-- por papel e assunto de outra migration.

drop policy if exists "Company members can write own products" on public.products;

create policy "Company members can insert own products"
on public.products for insert to authenticated
with check (company_id = public.current_user_company_id());

create policy "Company members can update own products"
on public.products for update to authenticated
using (company_id = public.current_user_company_id())
with check (company_id = public.current_user_company_id());

create policy "Company members can delete own products"
on public.products for delete to authenticated
using (company_id = public.current_user_company_id());

-- Verificacao, autenticado como um operador com setor definido. Esperado: todas as
-- linhas com sector_id igual ao setor do proprio operador. Antes desta migration
-- vinham produtos de todos os setores da empresa.
--
-- select p.id, p.name, p.sector_id from public.products p;
-- select public.current_user_product_sector_id();
--
-- Ainda como operador, escrita segue permitida (comportamento inalterado):
--
-- insert into public.products (name, category, unit, sector_id)
-- values ('teste rls', 'teste', 'un', public.current_user_product_sector_id());
