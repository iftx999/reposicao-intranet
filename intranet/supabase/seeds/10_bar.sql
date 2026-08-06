-- ============================================================================
-- 10_BAR.sql  -  Produtos do setor BAR (64 itens)
-- ============================================================================
-- PRE-REQUISITO: rode 00_prelude.sql antes. Ele define a empresa alvo e cria
-- os setores. Este arquivo aborta se isso nao tiver sido feito.
--
-- NAO ha nada para ajustar aqui: o nome da empresa vem de public._seed_config.
--
-- IDEMPOTENTE: nao insere produto cujo nome ja exista na mesma empresa.
-- Precos do cardapio foram DESCARTADOS (a tabela products nao tem essa coluna).
--
-- COMO REVERTER: veja o bloco comentado no final.
-- ============================================================================

begin;

do $$
declare v_sector uuid;
begin
  select s.id into v_sector
  from public.sectors s
  join public.companies c on c.id = s.company_id
  where c.name = (select value from public._seed_config where key = 'company_name')
    and s.name = 'BAR';

  if v_sector is null then
    raise exception 'Setor BAR nao encontrado. Rode 00_prelude.sql primeiro.';
  end if;
end $$;

with alvo as (
  select c.id as company_id, s.id as sector_id
  from public.companies c
  join public.sectors s on s.company_id = c.id and s.name = 'BAR'
  where c.name = (select value from public._seed_config where key = 'company_name')
),
itens (name, category, unit) as (values
  -- Refrigerantes e aguas
  ('Refrigerante Pepsi',                'Refrigerantes',    'LATA'),
  ('Refrigerante Pepsi Zero',           'Refrigerantes',    'LATA'),
  ('Refrigerante Guaraná',              'Refrigerantes',    'LATA'),
  ('Refrigerante Guaraná Zero',         'Refrigerantes',    'LATA'),
  ('Água Tônica',                       'Refrigerantes',    'LATA'),
  ('H2OH! Limão',                       'Refrigerantes',    'GARRAFA'),
  ('Água Mineral com Gás',              'Refrigerantes',    'GARRAFA'),
  ('Água Mineral sem Gás',              'Refrigerantes',    'GARRAFA'),
  ('Água Panna',                        'Refrigerantes',    'GARRAFA'),
  ('Água San Pellegrino',               'Refrigerantes',    'GARRAFA'),
  ('Energético Red Bull',               'Refrigerantes',    'LATA'),
  -- Cha
  ('Chá Gelado de Hibisco',             'Chá',              'COPO'),
  -- Sucos de polpa
  ('Suco de Polpa de Laranja',          'Sucos de Polpa',   'COPO'),
  ('Suco de Polpa de Limão',            'Sucos de Polpa',   'COPO'),
  ('Suco de Polpa de Melancia',         'Sucos de Polpa',   'COPO'),
  -- Sucos naturais
  ('Suco Natural de Abacaxi',           'Sucos Naturais',   'COPO'),
  ('Suco Natural de Abacaxi com Hortelã','Sucos Naturais',  'COPO'),
  ('Suco Natural de Acerola',           'Sucos Naturais',   'COPO'),
  ('Suco Natural de Morango',           'Sucos Naturais',   'COPO'),
  ('Suco Natural de Maracujá',          'Sucos Naturais',   'COPO'),
  -- Sodas italianas
  ('Soda Italiana Maçã Verde',          'Sodas Italianas',  'COPO'),
  ('Soda Italiana Capim Limão',         'Sodas Italianas',  'COPO'),
  ('Soda Italiana Gengibre',            'Sodas Italianas',  'COPO'),
  ('Soda Italiana Maracujá',            'Sodas Italianas',  'COPO'),
  ('Soda Italiana Morango',             'Sodas Italianas',  'COPO'),
  ('Soda Italiana Maracujá Light',      'Sodas Italianas',  'COPO'),
  ('Soda Italiana Morango Light',       'Sodas Italianas',  'COPO'),
  -- Cervejas
  ('Chopp Claro',                       'Cervejas',         'COPO'),
  ('Corona',                            'Cervejas',         'LONG NECK'),
  ('Budweiser',                         'Cervejas',         'LONG NECK'),
  ('Stella Artois',                     'Cervejas',         'LONG NECK'),
  ('Colorado Appia',                    'Cervejas',         'GARRAFA'),
  -- Cachacas
  ('Cachaça Seleta',                    'Cachaças',         'DOSE'),
  -- Vodka
  ('Vodka Smirnoff',                    'Vodka',            'DOSE'),
  ('Vodka Absolut',                     'Vodka',            'DOSE'),
  ('Vodka Cîroc',                       'Vodka',            'DOSE'),
  -- Whisky
  ('Johnnie Walker Red Label',          'Whisky',           'DOSE'),
  ('Johnnie Walker Black Label',        'Whisky',           'DOSE'),
  ('Johnnie Walker Gold Label',         'Whisky',           'DOSE'),
  -- Sake
  ('Sakê Azzuma Kirin',                 'Sakê',             'DOSE'),
  ('Sakê Gekkeinkan Silver',            'Sakê',             'DOSE'),
  -- Licores e diversos
  ('Licor 43 Diego Zamora',             'Licores',          'DOSE'),
  ('Licor Cointreau',                   'Licores',          'DOSE'),
  ('Campari',                           'Destilados',       'DOSE'),
  -- Caipirinhas
  ('Caipirinha de Uva Itália com Hortelã','Caipirinhas',    'COPO'),
  ('Caipirinha Leblon',                 'Caipirinhas',      'COPO'),
  -- Drinks
  ('Don Paloma',                        'Drinks',           'COPO'),
  ('Don Júlio Margarita',               'Drinks',           'COPO'),
  ('Fitzgerald',                        'Drinks',           'COPO'),
  ('Moscow Mule',                       'Drinks',           'COPO'),
  ('Mojito',                            'Drinks',           'COPO'),
  ('Caporale Cocktail',                 'Drinks',           'COPO'),
  ('Margarita José Cuervo',             'Drinks',           'COPO'),
  ('Negroni',                           'Drinks',           'COPO'),
  ('Aperol Spritz',                     'Drinks',           'COPO'),
  -- G&T
  ('G&T Limão',                         'G&T',              'COPO'),
  ('G&T Morango',                       'G&T',              'COPO'),
  ('G&T Pink Punk',                     'G&T',              'COPO'),
  ('G&T Passion Fruit',                 'G&T',              'COPO'),
  ('G&T Green Apple',                   'G&T',              'COPO'),
  ('G&T Tropical',                      'G&T',              'COPO'),
  -- Cafes
  ('Ristretto',                         'Cafés',            'COPO'),
  ('Espresso',                          'Cafés',            'COPO'),
  ('Café Brasil Orgânico',              'Cafés',            'COPO')
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
-- CONFERENCIA (rode separado, depois do commit)
-- ============================================================================
-- select p.category, count(*) as total
-- from public.products p
-- join public.sectors s on s.id = p.sector_id
-- join public.companies c on c.id = p.company_id
-- where s.name = 'BAR'
--   and c.name = (select value from public._seed_config where key = 'company_name')
-- group by p.category order by p.category;

-- ============================================================================
-- REVERTER (apaga TODOS os produtos do setor BAR desta empresa)
-- ============================================================================
-- delete from public.products p
-- using public.sectors s, public.companies c
-- where p.sector_id = s.id and p.company_id = c.id
--   and s.name = 'BAR'
--   and c.name = (select value from public._seed_config where key = 'company_name');
