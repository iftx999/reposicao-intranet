create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sector_id text not null,
  name text not null,
  category text not null,
  unit text not null,
  active boolean not null default true,
  favorite boolean not null default false
);

create table if not exists public.replenishment_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_unit_id text not null,
  sector_id text not null,
  created_by text not null,
  priority text not null default 'normal',
  status text not null default 'pending' check (status in ('pending', 'in_separation', 'replenished', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists public.replenishment_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.replenishment_requests(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  notes text
);

create table if not exists public.request_status_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.replenishment_requests(id) on delete cascade,
  status text not null check (status in ('pending', 'in_separation', 'replenished', 'cancelled')),
  message text,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists products_sector_id_idx on public.products(sector_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists replenishment_requests_status_idx on public.replenishment_requests(status);
create index if not exists replenishment_requests_created_at_idx on public.replenishment_requests(created_at desc);
create index if not exists replenishment_request_items_request_id_idx on public.replenishment_request_items(request_id);
create index if not exists request_status_events_request_id_idx on public.request_status_events(request_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists replenishment_requests_set_updated_at on public.replenishment_requests;
create trigger replenishment_requests_set_updated_at
before update on public.replenishment_requests
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.replenishment_requests enable row level security;
alter table public.replenishment_request_items enable row level security;
alter table public.request_status_events enable row level security;

create policy "Authenticated users can read products"
on public.products for select
to authenticated
using (true);

create policy "Authenticated users can write products"
on public.products for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read replenishment requests"
on public.replenishment_requests for select
to authenticated
using (true);

create policy "Authenticated users can write replenishment requests"
on public.replenishment_requests for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read replenishment request items"
on public.replenishment_request_items for select
to authenticated
using (true);

create policy "Authenticated users can write replenishment request items"
on public.replenishment_request_items for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read request status events"
on public.request_status_events for select
to authenticated
using (true);

create policy "Authenticated users can write request status events"
on public.request_status_events for all
to authenticated
using (true)
with check (true);
