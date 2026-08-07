begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

-- Fixtures. Inseridas como superusuario, antes de trocar de papel.

insert into public.companies (id, name, active)
values
  ('11000000-0000-0000-0000-000000000001', 'smd_test_company_a', true),
  ('11000000-0000-0000-0000-000000000002', 'smd_test_company_b', true);

insert into public.sectors (id, company_id, name, active)
values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'smd_test_bar', true),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'smd_test_cozinha', true),
  ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'smd_test_bar_b', true);

-- quantity comeca em zero porque o guard do ledger bloqueia saldo inicial direto.
insert into public.products (id, company_id, sector_id, name, category, unit, quantity, min_quantity, active, favorite)
values
  ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'smd_test_bar_item', 'test', 'un', 0, 0, true, false),
  ('31000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'smd_test_cozinha_item', 'test', 'un', 0, 0, true, false),
  ('31000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000003', 'smd_test_b_item', 'test', 'un', 0, 0, true, false);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'smd-test-operador-a@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'SMD Operador Bar A',
      'role', 'operador',
      'sector_id', '21000000-0000-0000-0000-000000000001',
      'company_id', '11000000-0000-0000-0000-000000000001'
    ),
    now(),
    now()
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'smd-test-gestor-a@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'SMD Gestor A',
      'role', 'gestor',
      'company_id', '11000000-0000-0000-0000-000000000001'
    ),
    now(),
    now()
  );

-- Movimentos. created_at explicito para exercitar o agrupamento por fuso.
--
-- 2026-08-08 01:00 UTC e 2026-08-07 22:00 em Sao Paulo: precisa cair no dia 07.
insert into public.stock_movements (company_id, product_id, movement_type, delta, balance_after, source, reason, created_at)
values
  ('11000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'entrada', 10, 0, 'replenishment', 'Reposicao teste', '2026-08-08 01:00:00+00'),
  ('11000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'entrada', 4, 0, 'inventory', 'Saldo inicial', '2026-08-08 01:00:00+00'),
  ('11000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000002', 'entrada', 7, 0, 'replenishment', 'Reposicao teste', '2026-08-08 01:00:00+00'),
  ('11000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000003', 'entrada', 5, 0, 'replenishment', 'Reposicao teste', '2026-08-08 01:00:00+00');

set local role authenticated;

-- Operador do bar da empresa A.
set local "request.jwt.claim.sub" = '41000000-0000-0000-0000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (select count(*)::int from public.stock_movement_daily where product_id = '31000000-0000-0000-0000-000000000002'),
  0,
  'operador nao ve na view produtos de outro setor da propria empresa'
);

select isnt(
  (select count(*)::int from public.stock_movement_daily where product_id = '31000000-0000-0000-0000-000000000001'),
  0,
  'operador ve na view os produtos do proprio setor'
);

select is(
  (select count(*)::int from public.stock_movement_daily where company_id = '11000000-0000-0000-0000-000000000002'),
  0,
  'operador nao ve na view nenhuma linha de outra empresa'
);

-- Gestor da empresa A ve a empresa inteira, e so ela.
set local "request.jwt.claim.sub" = '41000000-0000-0000-0000-000000000002';

select is(
  (select count(distinct product_id)::int from public.stock_movement_daily where company_id = '11000000-0000-0000-0000-000000000001'),
  2,
  'gestor ve na view os produtos de todos os setores da propria empresa'
);

select is(
  (select count(*)::int from public.stock_movement_daily where company_id = '11000000-0000-0000-0000-000000000002'),
  0,
  'gestor nao ve na view linhas de outra empresa'
);

-- Agrupamento por fuso: 22h em Sao Paulo pertence ao dia local, nao ao seguinte.
select is(
  (
    select dia
    from public.stock_movement_daily
    where product_id = '31000000-0000-0000-0000-000000000001'
      and source = 'replenishment'
  ),
  date '2026-08-07',
  'movimento das 22h em Sao Paulo cai no dia local correto, nao no dia seguinte'
);

-- A carga inicial continua visivel, porem separada por source, para o relatorio
-- conseguir exclui-la das metricas de demanda.
select is(
  (
    select total_delta
    from public.stock_movement_daily
    where product_id = '31000000-0000-0000-0000-000000000001'
      and source = 'inventory'
  ),
  4::numeric,
  'movimento de carga inicial fica isolado na coluna source'
);

select is(
  (
    select total_delta
    from public.stock_movement_daily
    where product_id = '31000000-0000-0000-0000-000000000001'
      and source = 'replenishment'
  ),
  10::numeric,
  'demanda por reposicao nao e contaminada pela carga inicial'
);

select * from finish();

rollback;
