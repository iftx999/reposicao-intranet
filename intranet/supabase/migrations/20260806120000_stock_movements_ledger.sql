-- Stock ledger. products.quantity becomes a cached balance maintained only by
-- stock_movements triggers.

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  product_id uuid not null references public.products(id),
  movement_type text not null check (movement_type in ('entrada', 'saida', 'ajuste')),
  delta numeric not null check (
    (movement_type = 'entrada' and delta > 0)
    or (movement_type = 'saida' and delta < 0)
    or (movement_type = 'ajuste' and delta <> 0)
  ),
  balance_after numeric not null,
  source text not null check (source in ('manual', 'replenishment', 'inventory')),
  reference_id uuid,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_created_at_idx
on public.stock_movements(product_id, created_at desc);

create index if not exists stock_movements_company_id_idx
on public.stock_movements(company_id);

create unique index if not exists stock_movements_initial_inventory_once_idx
on public.stock_movements(product_id)
where source = 'inventory' and reason = 'Saldo inicial';

create unique index if not exists stock_movements_replenishment_reference_product_idx
on public.stock_movements(reference_id, product_id)
where source = 'replenishment' and reference_id is not null;

alter table public.stock_movements enable row level security;

-- Backfill existing balances before the ledger trigger is attached, so the
-- historical saldo inicial reconciles without adding the quantity a second time.
insert into public.stock_movements (
  company_id,
  product_id,
  movement_type,
  delta,
  balance_after,
  source,
  reason,
  created_at
)
select
  p.company_id,
  p.id,
  case when p.quantity > 0 then 'entrada' else 'ajuste' end,
  p.quantity,
  p.quantity,
  'inventory',
  'Saldo inicial',
  now()
from public.products p
where p.quantity <> 0
  and not exists (
    select 1
    from public.stock_movements sm
    where sm.product_id = p.id
      and sm.source = 'inventory'
      and sm.reason = 'Saldo inicial'
  )
on conflict do nothing;

create or replace function public.apply_stock_movement_to_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric;
begin
  if not exists (
    select 1
    from public.products p
    where p.id = new.product_id
      and p.company_id = new.company_id
  ) then
    raise exception 'Produto nao encontrado para a empresa informada';
  end if;

  perform set_config('app.stock_ledger_write', 'on', true);

  update public.products p
  set quantity = p.quantity + new.delta
  where p.id = new.product_id
    and p.company_id = new.company_id
  returning p.quantity into next_balance;

  new.balance_after := next_balance;
  return new;
end;
$$;

drop trigger if exists stock_movements_apply_to_product on public.stock_movements;
create trigger stock_movements_apply_to_product
before insert on public.stock_movements
for each row execute function public.apply_stock_movement_to_product();

create or replace function public.prevent_direct_product_quantity_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     and coalesce(new.quantity, 0) <> 0
     and coalesce(current_setting('app.stock_ledger_write', true), '') <> 'on' then
    raise exception 'products.quantity deve iniciar em zero e ser alterado apenas por stock_movements';
  end if;

  if tg_op = 'UPDATE'
     and new.quantity is distinct from old.quantity
     and coalesce(current_setting('app.stock_ledger_write', true), '') <> 'on' then
    raise exception 'products.quantity deve ser alterado apenas por stock_movements';
  end if;

  return new;
end;
$$;

drop trigger if exists products_prevent_direct_quantity_insert on public.products;
create trigger products_prevent_direct_quantity_insert
before insert on public.products
for each row execute function public.prevent_direct_product_quantity_update();

drop trigger if exists products_prevent_direct_quantity_update on public.products;
create trigger products_prevent_direct_quantity_update
before update of quantity on public.products
for each row execute function public.prevent_direct_product_quantity_update();

create or replace function public.prevent_stock_movement_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'stock_movements e um ledger imutavel; corrija com um novo movimento';
end;
$$;

drop trigger if exists stock_movements_prevent_update on public.stock_movements;
create trigger stock_movements_prevent_update
before update on public.stock_movements
for each row execute function public.prevent_stock_movement_mutation();

drop trigger if exists stock_movements_prevent_delete on public.stock_movements;
create trigger stock_movements_prevent_delete
before delete on public.stock_movements
for each row execute function public.prevent_stock_movement_mutation();

create or replace function public.can_read_stock_movement_product(target_product_id uuid, target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    where p.id = target_product_id
      and p.company_id = target_company_id
      and (
        public.current_user_is_super_admin()
        or (
          p.company_id = public.current_user_company_id()
          and (
            public.current_user_role() in ('admin', 'gestor')
            or (
              public.current_user_role() = 'operador'
              and p.sector_id = public.current_user_product_sector_id()
            )
          )
        )
      )
  );
$$;

create or replace function public.can_write_stock_movement(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or (
      target_company_id = public.current_user_company_id()
      and public.current_user_role() in ('admin', 'gestor')
    );
$$;

drop policy if exists "Company members can read stock movements" on public.stock_movements;
create policy "Company members can read stock movements"
on public.stock_movements for select
to authenticated
using (public.can_read_stock_movement_product(product_id, company_id));

drop policy if exists "Admins and gestores can insert stock movements" on public.stock_movements;
create policy "Admins and gestores can insert stock movements"
on public.stock_movements for insert
to authenticated
with check (public.can_write_stock_movement(company_id));

revoke update, delete on public.stock_movements from authenticated;

create or replace function public.apply_replenishment_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'replenished' and (old.status is distinct from 'replenished') then
    insert into public.stock_movements (
      company_id,
      product_id,
      movement_type,
      delta,
      balance_after,
      source,
      reference_id,
      reason,
      created_by
    )
    select
      new.company_id,
      i.product_id,
      'entrada',
      sum(i.quantity),
      0,
      'replenishment',
      new.id,
      'Reposicao automatica',
      case
        when new.created_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then new.created_by::uuid
        else null
      end
    from public.replenishment_request_items i
    where i.request_id = new.id
      and not exists (
        select 1
        from public.stock_movements sm
        where sm.reference_id = new.id
          and sm.product_id = i.product_id
          and sm.source = 'replenishment'
      )
    group by i.product_id
    order by i.product_id
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Reconciliation query. Expected result: no rows.
-- select
--   p.id as product_id,
--   p.company_id,
--   p.quantity as product_quantity,
--   coalesce(sum(sm.delta), 0) as ledger_quantity,
--   p.quantity - coalesce(sum(sm.delta), 0) as difference
-- from public.products p
-- left join public.stock_movements sm
--   on sm.product_id = p.id
--  and sm.company_id = p.company_id
-- group by p.id, p.company_id, p.quantity
-- having p.quantity is distinct from coalesce(sum(sm.delta), 0);
