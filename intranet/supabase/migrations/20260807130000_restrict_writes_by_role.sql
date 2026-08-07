-- Restringe escrita de produtos e setores a admin/gestor/super admin.
-- Reusa public.can_write_stock_movement(target_company_id uuid), que ja codifica:
-- super admin pode escrever em qualquer empresa; admin/gestor pode escrever apenas
-- na propria empresa; operador nao escreve.

drop policy if exists "Company members can insert own products" on public.products;
create policy "Company members can insert own products"
on public.products for insert to authenticated
with check (public.can_write_stock_movement(company_id));

drop policy if exists "Company members can update own products" on public.products;
create policy "Company members can update own products"
on public.products for update to authenticated
using (public.can_write_stock_movement(company_id))
with check (public.can_write_stock_movement(company_id));

drop policy if exists "Company members can delete own products" on public.products;
create policy "Company members can delete own products"
on public.products for delete to authenticated
using (public.can_write_stock_movement(company_id));

-- A policy de setores tambem era FOR ALL. Manter SELECT para membros da empresa
-- evita reabrir leitura por OR em operacoes de escrita e deixa a simetria explicita.

drop policy if exists "Company members can read own sectors" on public.sectors;
create policy "Company members can read own sectors"
on public.sectors for select to authenticated
using (
  public.current_user_is_super_admin()
  or company_id = public.current_user_company_id()
);

drop policy if exists "Company members can write own sectors" on public.sectors;
drop policy if exists "Company members can insert own sectors" on public.sectors;
create policy "Company members can insert own sectors"
on public.sectors for insert to authenticated
with check (public.can_write_stock_movement(company_id));

drop policy if exists "Company members can update own sectors" on public.sectors;
create policy "Company members can update own sectors"
on public.sectors for update to authenticated
using (public.can_write_stock_movement(company_id))
with check (public.can_write_stock_movement(company_id));

drop policy if exists "Company members can delete own sectors" on public.sectors;
create policy "Company members can delete own sectors"
on public.sectors for delete to authenticated
using (public.can_write_stock_movement(company_id));

-- Garante que todo usuario autenticado leia o proprio profile, inclusive super
-- admin com company_id nulo. Nao ampliamos super admin para ler todos os profiles
-- nesta migration: isso exporia dados pessoais entre empresas sem requisito de UI
-- ou fluxo administrativo confirmado. Se necessario, deve ser uma policy propria.

drop policy if exists "Authenticated users can read own profile" on public.profiles;

create policy "Authenticated users can read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

-- Verificacao manual por papel (executar autenticado como o usuario indicado).
--
-- 1) Operador da empresa: leitura segue permitida; escrita de produtos deve falhar.
-- select p.id, p.name, p.company_id, p.sector_id from public.products p;
-- insert into public.products (name, category, unit, sector_id)
-- values ('teste operador produto', 'teste', 'un', public.current_user_product_sector_id());
--
-- 2) Operador da empresa: leitura de setores segue permitida; escrita deve falhar.
-- select s.id, s.name, s.company_id from public.sectors s;
-- insert into public.sectors (name) values ('teste operador setor');
--
-- 3) Gestor ou admin da empresa: escrita na propria empresa deve passar.
-- insert into public.sectors (name) values ('teste gestor setor');
-- insert into public.products (name, category, unit, sector_id)
-- select 'teste gestor produto', 'teste', 'un', s.id
-- from public.sectors s
-- where s.company_id = public.current_user_company_id()
-- limit 1;
--
-- 4) Gestor ou admin da empresa: escrita em outra empresa deve falhar.
-- insert into public.sectors (company_id, name)
-- select c.id, 'teste outra empresa'
-- from public.companies c
-- where c.id <> public.current_user_company_id()
-- limit 1;
--
-- 5) Super admin com company_id nulo: deve ler o proprio profile.
-- select id, email, company_id, is_super_admin
-- from public.profiles
-- where id = auth.uid();
--
-- 6) Super admin: escrita com company_id explicito deve passar.
-- insert into public.sectors (company_id, name)
-- select c.id, 'teste super admin setor'
-- from public.companies c
-- limit 1;
