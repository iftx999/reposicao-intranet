-- Converte FKs textuais para uuid real.
-- profiles.sector_id falha se algum vinculo existente nao puder ser resolvido.
-- replenishment_requests.created_by preserva apenas autores que apontam para profiles.id;
-- valores vazios, nao UUID ou UUID sem profile viram null.

alter table public.profiles
add column sector_id_new uuid references public.sectors(id);

do $$
declare
  ambiguous_count integer;
begin
  select count(*)
  into ambiguous_count
  from (
    select p.id
    from public.profiles p
    left join public.sectors s
      on s.company_id = p.company_id
     and (
       s.id = case
         when p.sector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then p.sector_id::uuid
         else null
       end
       or s.name = p.sector_id
     )
    where p.sector_id is not null
    group by p.id
    having count(s.id) > 1
  ) ambiguous_profiles;

  if ambiguous_count > 0 then
    raise exception 'profiles.sector_id possui % valor(es) ambiguos', ambiguous_count;
  end if;
end;
$$;

update public.profiles p
set sector_id_new = (
  select s.id
  from public.sectors s
  where s.company_id = p.company_id
    and (
      s.id = case
        when p.sector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then p.sector_id::uuid
        else null
      end
      or s.name = p.sector_id
    )
)
where p.sector_id is not null;

do $$
declare
  unresolved_count integer;
begin
  select count(*)
  into unresolved_count
  from public.profiles
  where sector_id is not null
    and sector_id_new is null;

  if unresolved_count > 0 then
    raise exception 'profiles.sector_id possui % valor(es) sem setor correspondente', unresolved_count;
  end if;
end;
$$;

alter table public.profiles drop column sector_id;
alter table public.profiles rename column sector_id_new to sector_id;

create index if not exists profiles_sector_id_idx
on public.profiles(sector_id);

alter table public.replenishment_requests
add column created_by_new uuid references public.profiles(id);

update public.replenishment_requests r
set created_by_new = p.id
from public.profiles p
where p.id = case
  when r.created_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then r.created_by::uuid
  else null
end;

alter table public.replenishment_requests drop column created_by;
alter table public.replenishment_requests rename column created_by_new to created_by;

create index if not exists replenishment_requests_created_by_idx
on public.replenishment_requests(created_by);

create or replace function public.current_user_product_sector_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sector_id
  from public.profiles
  where id = auth.uid()
    and active = true
    and sector_id is not null;
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
    case
      when new.raw_user_meta_data ->> 'sector_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (new.raw_user_meta_data ->> 'sector_id')::uuid
      else null
    end,
    true,
    nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid,
    coalesce((new.raw_user_meta_data ->> 'is_super_admin')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

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
      new.created_by
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

-- Queries de verificacao manual antes da migration:
-- select p.id, p.email, p.company_id, p.sector_id
-- from public.profiles p
-- where p.sector_id is not null
--   and not exists (
--     select 1
--     from public.sectors s
--     where p.company_id is not null
--       and s.company_id = p.company_id
--       and (
--         s.id = case
--           when p.sector_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--             then p.sector_id::uuid
--           else null
--         end
--         or s.name = p.sector_id
--       )
--   );
--
-- select created_by, count(*)
-- from public.replenishment_requests
-- where created_by is not null
--   and not exists (
--     select 1
--     from public.profiles p
--     where p.id = case
--       when created_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--         then created_by::uuid
--       else null
--     end
--   )
-- group by created_by
-- order by count(*) desc;
--
-- Queries de verificacao manual depois da migration:
-- select count(*) as profiles_sem_fk
-- from public.profiles p
-- where p.sector_id is not null
--   and not exists (select 1 from public.sectors s where s.id = p.sector_id);
--
-- select count(*) as requests_created_by_sem_fk
-- from public.replenishment_requests r
-- where r.created_by is not null
--   and not exists (select 1 from public.profiles p where p.id = r.created_by);
--
-- select count(*) as requests_created_by_null
-- from public.replenishment_requests
-- where created_by is null;
