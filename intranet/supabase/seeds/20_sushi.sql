-- ============================================================================
-- 20_SUSHI.sql  -  Produtos do setor SUSHI (25 itens)
-- ============================================================================
-- PRE-REQUISITO: rode 00_prelude.sql antes.
--
-- NAO ha nada para ajustar aqui: o nome da empresa vem de public._seed_config.
--
-- IDEMPOTENTE: nao insere produto cujo nome ja exista na mesma empresa.
-- Precos do cardapio foram DESCARTADOS.
--
-- NOTA SOBRE NOMES: o cardapio vende o mesmo sashimi em dois tamanhos (12 e 18
-- unidades). Como nao ha coluna de tamanho nem de preco, a quantidade foi
-- incorporada ao nome, senao o segundo registro seria descartado como duplicata.
-- ============================================================================

begin;

do $$
declare v_sector uuid;
begin
  select s.id into v_sector
  from public.sectors s
  join public.companies c on c.id = s.company_id
  where c.name = (select value from public._seed_config where key = 'company_name')
    and s.name = 'SUSHI';

  if v_sector is null then
    raise exception 'Setor SUSHI nao encontrado. Rode 00_prelude.sql primeiro.';
  end if;
end $$;

with alvo as (
  select c.id as company_id, s.id as sector_id
  from public.companies c
  join public.sectors s on s.company_id = c.id and s.name = 'SUSHI'
  where c.name = (select value from public._seed_config where key = 'company_name')
),
itens (name, category, unit) as (values
  -- Sashimi (tamanho no nome para nao colidir)
  ('Sashimi de Salmão 12un',                    'Sashimi',      'UN'),
  ('Sashimi de Salmão 18un',                    'Sashimi',      'UN'),
  ('Sashimi de Atum 12un',                      'Sashimi',      'UN'),
  ('Sashimi de Atum 18un',                      'Sashimi',      'UN'),
  ('Sashimi de Polvo 12un',                     'Sashimi',      'UN'),
  -- Niguiri
  ('Niguiri de Salmão',                         'Niguiri',      'UN'),
  ('Niguiri de Barriga de Salmão Maçaricado',   'Niguiri',      'UN'),
  ('Niguiri de Atum com Foie Gras',             'Niguiri',      'UN'),
  ('Niguiri de Viera',                          'Niguiri',      'UN'),
  -- Uramaki
  ('Uramaki de Salmão',                         'Uramaki',      'UN'),
  ('Uramaki de Camarão',                        'Uramaki',      'UN'),
  -- Outros
  ('Guioza',                                    'Oriental',     'UN'),
  ('Hot Roll',                                  'Oriental',     'UN'),
  ('Djo de Salmão com Azeite Trufado',          'Oriental',     'UN'),
  ('Gunkan de Ovo de Codorna',                  'Oriental',     'UN'),
  -- Combinados
  ('Combinado do Marujo',                       'Combinados',   'UN'),
  ('Combinado do Capitão',                      'Combinados',   'UN'),
  ('Combinado Matsu',                           'Combinados',   'UN'),
  -- Temaki
  ('Temaki de Salmão Cubos',                    'Temaki',       'UN'),
  ('Temaki de Salmão Batidinho',                'Temaki',       'UN'),
  ('Temaki de Salmão Grelhado',                 'Temaki',       'UN'),
  ('Temaki de Atum',                            'Temaki',       'UN'),
  ('Temaki de Shimeji',                         'Temaki',       'UN'),
  ('Temaki de Camarão',                         'Temaki',       'UN'),
  -- Festival
  ('Festival Oriental',                         'Festival Oriental', 'UN')
)
insert into public.products
  (name, category, unit, sector_id, company_id, quantity, min_quantity, active, favorite)
select i.name, i.category, i.unit, a.sector_id, a.company_id, 0, 0, true, false
from itens i
cross join alvo a
where not exists (
  select 1 from public.products p
  where p.name = i.name and p.company_id = a.company_id
);

commit;

-- ============================================================================
-- CONFERENCIA
-- ============================================================================
-- select p.category, count(*) as total
-- from public.products p
-- join public.sectors s on s.id = p.sector_id
-- join public.companies c on c.id = p.company_id
-- where s.name = 'SUSHI'
--   and c.name = (select value from public._seed_config where key = 'company_name')
-- group by p.category order by p.category;

-- ============================================================================
-- REVERTER
-- ============================================================================
-- delete from public.products p
-- using public.sectors s, public.companies c
-- where p.sector_id = s.id and p.company_id = c.id
--   and s.name = 'SUSHI'
--   and c.name = (select value from public._seed_config where key = 'company_name');
