-- Guardas de estoque e fluxo de status.

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

  if next_balance < 0 then
    raise exception 'Saldo de estoque nao pode ficar negativo para este produto';
  end if;

  new.balance_after := next_balance;
  return new;
end;
$$;

create or replace function public.prevent_invalid_replenishment_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending'
     and new.status in ('in_separation', 'cancelled') then
    return new;
  end if;

  if old.status = 'in_separation'
     and new.status in ('replenished', 'cancelled') then
    return new;
  end if;

  raise exception 'Transicao de status invalida: % para %', old.status, new.status;
end;
$$;

drop trigger if exists replenishment_requests_prevent_invalid_status_transition on public.replenishment_requests;
create trigger replenishment_requests_prevent_invalid_status_transition
before update of status on public.replenishment_requests
for each row execute function public.prevent_invalid_replenishment_status_transition();

-- Antes de validar historico em producao, auditar valores existentes:
-- select lower(priority) as priority, count(*) as total
-- from public.replenishment_requests
-- group by lower(priority)
-- order by lower(priority);

alter table public.replenishment_requests
drop constraint if exists replenishment_requests_priority_check;

alter table public.replenishment_requests
add constraint replenishment_requests_priority_check
check (lower(priority) in ('normal', 'alta', 'urgente', 'media', 'média', 'baixa')) not valid;

-- Verificacoes manuais:
--
-- Estoque nao pode ficar negativo:
-- insert into public.stock_movements (
--   company_id,
--   product_id,
--   movement_type,
--   delta,
--   balance_after,
--   source,
--   reason
-- )
-- select
--   p.company_id,
--   p.id,
--   'saida',
--   -(p.quantity + 1),
--   0,
--   'manual',
--   'Teste saldo negativo'
-- from public.products p
-- limit 1;
--
-- Transicoes validas devem passar:
-- update public.replenishment_requests
-- set status = 'in_separation'
-- where id = '<request_id_pendente>';
--
-- Transicoes invalidas devem falhar:
-- update public.replenishment_requests
-- set status = 'replenished'
-- where id = '<request_id_cancelado>';
--
-- Prioridades fora do dominio devem falhar em novas escritas:
-- insert into public.replenishment_requests (
--   restaurant_unit_id,
--   sector_id,
--   created_by,
--   priority
-- )
-- values ('main', 'bar', 'teste', 'critica');
