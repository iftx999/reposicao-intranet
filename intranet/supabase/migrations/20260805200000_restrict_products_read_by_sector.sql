-- Restrict product reads by sector for operadores while preserving company
-- isolation for admins/gestores and broad access for super admins.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true;
$$;

create or replace function public.current_user_product_sector_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.profiles p
  join public.sectors s
    on s.company_id = p.company_id
   and (s.id::text = p.sector_id or s.name = p.sector_id)
  where p.id = auth.uid()
    and p.active = true
    and p.sector_id is not null
  limit 1;
$$;

drop policy if exists "Company members can read own products" on public.products;

create policy "Company members can read own products"
on public.products for select
to authenticated
using (
  public.current_user_is_super_admin()
  or (
    company_id = public.current_user_company_id()
    and (
      public.current_user_role() in ('admin', 'gestor')
      or (
        public.current_user_role() = 'operador'
        and sector_id = public.current_user_product_sector_id()
      )
    )
  )
);
