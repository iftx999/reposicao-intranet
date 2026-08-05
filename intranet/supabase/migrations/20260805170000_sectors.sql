-- Sectors (per-company)
create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.sectors enable row level security;

create index if not exists sectors_company_id_idx on public.sectors(company_id);

create trigger sectors_set_company_id before insert on public.sectors
for each row execute function public.set_company_id_from_profile();

create policy "Company members can read own sectors"
on public.sectors for select to authenticated
using (company_id = public.current_user_company_id());

create policy "Company members can write own sectors"
on public.sectors for all to authenticated
using (company_id = public.current_user_company_id())
with check (company_id = public.current_user_company_id());

-- Seed sectors from existing distinct product sector_id text values, per company
insert into public.sectors (company_id, name)
select distinct company_id, sector_id from public.products
on conflict (company_id, name) do nothing;

-- Point products at the real sector via a new FK column, then swap it in
alter table public.products add column sector_id_new uuid references public.sectors(id);

update public.products p
set sector_id_new = s.id
from public.sectors s
where s.company_id = p.company_id and s.name = p.sector_id;

alter table public.products drop column sector_id;
alter table public.products rename column sector_id_new to sector_id;
alter table public.products alter column sector_id set not null;

create index if not exists products_sector_id_idx on public.products(sector_id);
