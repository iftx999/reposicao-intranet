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
