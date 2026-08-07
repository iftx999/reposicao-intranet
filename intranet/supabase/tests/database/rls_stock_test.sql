begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

insert into public.companies (id, name, active)
values
  ('10000000-0000-0000-0000-000000000001', 'rls_test_company_a', true),
  ('10000000-0000-0000-0000-000000000002', 'rls_test_company_b', true);

insert into public.sectors (id, company_id, name, active)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'rls_test_bar', true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'rls_test_kitchen', true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'rls_test_bar', true);

insert into public.products (
  id,
  company_id,
  sector_id,
  name,
  category,
  unit,
  quantity,
  min_quantity,
  active,
  favorite
)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'rls_test_a_bar_manual', 'test', 'un', 0, 0, true, false),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'rls_test_a_kitchen', 'test', 'un', 0, 0, true, false),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'rls_test_b_bar', 'test', 'un', 0, 0, true, false),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'rls_test_a_bar_replenish', 'test', 'un', 0, 0, true, false);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-test-operator-a@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'RLS Test Operator A',
      'role', 'operador',
      'sector_id', '20000000-0000-0000-0000-000000000001',
      'company_id', '10000000-0000-0000-0000-000000000001'
    ),
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-test-gestor-a@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'RLS Test Gestor A',
      'role', 'gestor',
      'sector_id', '20000000-0000-0000-0000-000000000001',
      'company_id', '10000000-0000-0000-0000-000000000001'
    ),
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-test-admin-a@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'RLS Test Admin A',
      'role', 'admin',
      'sector_id', '20000000-0000-0000-0000-000000000001',
      'company_id', '10000000-0000-0000-0000-000000000001'
    ),
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-test-operator-b@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'RLS Test Operator B',
      'role', 'operador',
      'sector_id', '20000000-0000-0000-0000-000000000003',
      'company_id', '10000000-0000-0000-0000-000000000002'
    ),
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-test-admin-b@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'RLS Test Admin B',
      'role', 'admin',
      'sector_id', '20000000-0000-0000-0000-000000000003',
      'company_id', '10000000-0000-0000-0000-000000000002'
    ),
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-test-super-admin@example.test',
    'test',
    now(),
    jsonb_build_object(
      'full_name', 'RLS Test Super Admin',
      'role', 'admin',
      'is_super_admin', true
    ),
    now(),
    now()
  );

insert into public.replenishment_requests (
  id,
  company_id,
  restaurant_unit_id,
  sector_id,
  created_by,
  priority,
  status,
  notes
)
values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'main', 'rls_test_bar', '40000000-0000-0000-0000-000000000003', 'normal', 'pending', 'rls test company a'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'main', 'rls_test_bar', '40000000-0000-0000-0000-000000000005', 'normal', 'pending', 'rls test company b');

insert into public.replenishment_request_items (
  id,
  request_id,
  product_id,
  product_name,
  quantity,
  unit,
  notes
)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'rls_test_a_bar_replenish', 4, 'un', 'rls test'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'rls_test_b_bar', 3, 'un', 'rls test');

insert into public.request_status_events (
  id,
  request_id,
  status,
  message,
  user_id
)
values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'pending', 'rls test company a', '40000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'pending', 'rls test company b', '40000000-0000-0000-0000-000000000005');

insert into public.stock_movements (
  id,
  company_id,
  product_id,
  movement_type,
  delta,
  balance_after,
  source,
  reason,
  created_by
)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'entrada', 5, 0, 'manual', 'rls test initial company a', '40000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'entrada', 7, 0, 'manual', 'rls test initial company b', '40000000-0000-0000-0000-000000000005');

set local "app.stock_ledger_write" = '';

set local role authenticated;

set local "request.jwt.claim.sub" = '40000000-0000-0000-0000-000000000003';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (select count(*)::int from public.companies where name like 'rls_test_company_%'),
  1,
  'admin da empresa A le apenas a propria empresa'
);

select is(
  (select count(*)::int from public.companies where id = '10000000-0000-0000-0000-000000000002'),
  0,
  'admin da empresa A nao le a empresa B'
);

select is(
  (
    with changed as (
      update public.companies
      set name = 'rls_test_company_b_changed'
      where id = '10000000-0000-0000-0000-000000000002'
      returning id
    )
    select count(*)::int from changed
  ),
  0,
  'admin da empresa A nao atualiza a empresa B'
);

select is(
  (select count(*)::int from public.profiles where email like 'rls-test-%@example.test'),
  3,
  'admin da empresa A le apenas profiles da propria empresa'
);

select is(
  (select count(*)::int from public.profiles where company_id = '10000000-0000-0000-0000-000000000002'),
  0,
  'admin da empresa A nao le profiles da empresa B'
);

select is(
  (
    with changed as (
      update public.profiles
      set full_name = 'RLS Test Admin B changed'
      where id = '40000000-0000-0000-0000-000000000005'
      returning id
    )
    select count(*)::int from changed
  ),
  0,
  'admin da empresa A nao atualiza profile da empresa B'
);

select is(
  (select count(*)::int from public.sectors where name like 'rls_test_%'),
  2,
  'admin da empresa A le apenas setores da propria empresa'
);

select throws_ok(
  $$
    insert into public.sectors (company_id, name)
    values ('10000000-0000-0000-0000-000000000002', 'rls_test_cross_company_sector')
  $$,
  'admin da empresa A nao insere setor na empresa B'
);

select is(
  (
    with changed as (
      update public.sectors
      set name = 'rls_test_b_bar_changed'
      where id = '20000000-0000-0000-0000-000000000003'
      returning id
    )
    select count(*)::int from changed
  ),
  0,
  'admin da empresa A nao atualiza setor da empresa B'
);

select is(
  (select count(*)::int from public.products where name like 'rls_test_%'),
  3,
  'admin da empresa A le todos os produtos da propria empresa'
);

select throws_ok(
  $$
    insert into public.products (company_id, sector_id, name, category, unit)
    values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'rls_test_cross_company_product', 'test', 'un')
  $$,
  'admin da empresa A nao insere produto na empresa B'
);

select is(
  (
    with changed as (
      update public.products
      set name = 'rls_test_b_bar_changed'
      where id = '30000000-0000-0000-0000-000000000003'
      returning id
    )
    select count(*)::int from changed
  ),
  0,
  'admin da empresa A nao atualiza produto da empresa B'
);

select is(
  (select count(*)::int from public.replenishment_requests where notes like 'rls test company %'),
  1,
  'admin da empresa A le apenas pedidos da propria empresa'
);

select throws_ok(
  $$
    insert into public.replenishment_requests (company_id, restaurant_unit_id, sector_id, created_by, priority, status, notes)
    values ('10000000-0000-0000-0000-000000000002', 'main', 'rls_test_bar', '40000000-0000-0000-0000-000000000003', 'normal', 'pending', 'rls test cross company')
  $$,
  'admin da empresa A nao insere pedido na empresa B'
);

select is(
  (
    with changed as (
      update public.replenishment_requests
      set notes = 'rls test company b changed'
      where id = '50000000-0000-0000-0000-000000000002'
      returning id
    )
    select count(*)::int from changed
  ),
  0,
  'admin da empresa A nao atualiza pedido da empresa B'
);

select is(
  (select count(*)::int from public.stock_movements where reason like 'rls test initial company %'),
  1,
  'admin da empresa A le apenas movimentos de estoque da propria empresa'
);

select throws_ok(
  $$
    insert into public.stock_movements (company_id, product_id, movement_type, delta, balance_after, source, reason, created_by)
    values ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'entrada', 1, 0, 'manual', 'rls test cross company stock', '40000000-0000-0000-0000-000000000003')
  $$,
  'admin da empresa A nao insere movimento de estoque na empresa B'
);

select is(
  (select count(*)::int from public.replenishment_request_items where notes = 'rls test'),
  1,
  'admin da empresa A le apenas itens de pedido vinculados a pedidos da propria empresa'
);

select is(
  (select count(*)::int from public.request_status_events where message like 'rls test company %'),
  1,
  'admin da empresa A le apenas eventos vinculados a pedidos da propria empresa'
);

set local "request.jwt.claim.sub" = '40000000-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.products where name like 'rls_test_%'),
  2,
  'operador le somente produtos do proprio setor'
);

select is(
  (select count(*)::int from public.products where id = '30000000-0000-0000-0000-000000000002'),
  0,
  'operador nao le produto de outro setor da mesma empresa'
);

select is(
  (select count(*)::int from public.products where id = '30000000-0000-0000-0000-000000000003'),
  0,
  'operador nao le produto de outra empresa'
);

select throws_ok(
  $$
    insert into public.products (company_id, sector_id, name, category, unit)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'operator_must_not_write_product', 'test', 'un')
  $$,
  'operador nao insere produtos'
);

select throws_ok(
  $$
    insert into public.stock_movements (company_id, product_id, movement_type, delta, balance_after, source, reason, created_by)
    values ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'entrada', 1, 0, 'manual', 'rls test operator stock write', '40000000-0000-0000-0000-000000000001')
  $$,
  'operador nao insere stock_movements'
);

set local "request.jwt.claim.sub" = '40000000-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.products where name like 'rls_test_%'),
  3,
  'gestor le todos os produtos da propria empresa'
);

select lives_ok(
  $$
    insert into public.stock_movements (company_id, product_id, movement_type, delta, balance_after, source, reason, created_by)
    values ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'entrada', 2, 0, 'manual', 'rls test gestor stock write', '40000000-0000-0000-0000-000000000002')
  $$,
  'gestor insere stock_movements na propria empresa'
);

set local "app.stock_ledger_write" = '';
set local "request.jwt.claim.sub" = '40000000-0000-0000-0000-000000000003';

select throws_ok(
  $$
    update public.products
    set quantity = quantity + 1
    where id = '30000000-0000-0000-0000-000000000001'
  $$,
  'products.quantity nao pode ser atualizado diretamente'
);

select throws_ok(
  $$
    insert into public.products (company_id, sector_id, name, category, unit, quantity)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'rls_test_direct_quantity_insert', 'test', 'un', 9)
  $$,
  'products.quantity nao pode iniciar diferente de zero fora do ledger'
);

select lives_ok(
  $$
    insert into public.stock_movements (id, company_id, product_id, movement_type, delta, balance_after, source, reason, created_by)
    values ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'entrada', 3, 0, 'manual', 'rls test admin stock write', '40000000-0000-0000-0000-000000000003')
  $$,
  'admin insere stock_movements na propria empresa'
);

select is(
  (select quantity from public.products where id = '30000000-0000-0000-0000-000000000001'),
  10::numeric,
  'stock_movements atualiza products.quantity via trigger'
);

select is(
  (select balance_after from public.stock_movements where id = '80000000-0000-0000-0000-000000000003'),
  10::numeric,
  'stock_movements grava balance_after apos aplicar delta'
);

select throws_ok(
  $$
    update public.stock_movements
    set reason = 'rls test mutated'
    where id = '80000000-0000-0000-0000-000000000003'
  $$,
  'stock_movements e append-only para update'
);

select throws_ok(
  $$
    delete from public.stock_movements
    where id = '80000000-0000-0000-0000-000000000003'
  $$,
  'stock_movements e append-only para delete'
);

update public.replenishment_requests
set status = 'in_separation'
where id = '50000000-0000-0000-0000-000000000001';

update public.replenishment_requests
set status = 'replenished'
where id = '50000000-0000-0000-0000-000000000001';

update public.replenishment_requests
set status = 'replenished'
where id = '50000000-0000-0000-0000-000000000001';

select is(
  (
    select count(*)::int
    from public.stock_movements
    where reference_id = '50000000-0000-0000-0000-000000000001'
      and product_id = '30000000-0000-0000-0000-000000000004'
      and source = 'replenishment'
  ),
  1,
  'reposicao replenished duas vezes gera apenas um movimento de estoque'
);

select is(
  (select quantity from public.products where id = '30000000-0000-0000-0000-000000000004'),
  4::numeric,
  'reposicao replenished duas vezes credita estoque apenas uma vez'
);

set local "request.jwt.claim.sub" = '40000000-0000-0000-0000-000000000006';

select is(
  (select count(*)::int from public.products where name like 'rls_test_%'),
  4,
  'super admin le produtos de todas as empresas'
);

select is(
  (select count(*)::int from public.profiles where id = '40000000-0000-0000-0000-000000000006'),
  1,
  'super admin com company_id nulo le o proprio profile'
);

select * from finish();

rollback;
