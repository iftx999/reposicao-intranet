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
