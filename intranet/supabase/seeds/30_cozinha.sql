-- ============================================================================
-- 30_COZINHA.sql  -  Produtos do setor COZINHA (76 itens)
-- ============================================================================
-- PRE-REQUISITO: rode 00_prelude.sql antes.
--
-- NAO ha nada para ajustar aqui: o nome da empresa vem de public._seed_config.
--
-- IDEMPOTENTE: nao insere produto cujo nome ja exista na mesma empresa.
-- Precos do cardapio foram DESCARTADOS.
--
-- NOTAS SOBRE NOMES (importante):
--   1. O cardapio repete o mesmo nome em secoes diferentes. "A Parmegiana"
--      aparece em Pintado, Tilapia e File; "Moqueca" aparece em Pintado e
--      Abadejo. Como a protecao de duplicata e por NOME, esses itens foram
--      qualificados com o ingrediente principal (ex: Pintado a Parmegiana,
--      Tilapia a Parmegiana, Mignon a Parmegiana). Sem isso, o segundo e o
--      terceiro seriam silenciosamente descartados.
--   2. Itens vendidos em dois tamanhos (Isca de Tilapia, Lula Crocante)
--      receberam o tamanho no nome: 2P e 3P.
--   3. Itens do Menu Executivo foram prefixados com "Executivo" porque varios
--      repetem nomes do cardapio principal (Ceviche de Peixe, Casquinha de
--      Siri, Camarao Atlantico, Mignon a Parmegiana).
-- ============================================================================

begin;

do $$
declare v_sector uuid;
begin
  select s.id into v_sector
  from public.sectors s
  join public.companies c on c.id = s.company_id
  where c.name = (select value from public._seed_config where key = 'company_name')
    and s.name = 'COZINHA';

  if v_sector is null then
    raise exception 'Setor COZINHA nao encontrado. Rode 00_prelude.sql primeiro.';
  end if;
end $$;

with alvo as (
  select c.id as company_id, s.id as sector_id
  from public.companies c
  join public.sectors s on s.company_id = c.id and s.name = 'COZINHA'
  where c.name = (select value from public._seed_config where key = 'company_name')
),
itens (name, category, unit) as (values
  -- Entradas
  ('Casquinha de Siri',                       'Entradas',        'PORÇÃO'),
  ('Casquinha de Camarão',                    'Entradas',        'PORÇÃO'),
  ('Salada Italiana',                         'Entradas',        'PORÇÃO'),
  ('Salada Marinheiro',                       'Entradas',        'PORÇÃO'),
  ('Crispy Tartar',                           'Entradas',        'PORÇÃO'),
  ('Salmão Butter Lemon',                     'Entradas',        'PORÇÃO'),
  ('Tártaro de Salmão',                       'Entradas',        'PORÇÃO'),
  ('Ceviche de Peixe - Salmão',               'Entradas',        'PORÇÃO'),
  ('Ceviche de Peixe - Tilápia',              'Entradas',        'PORÇÃO'),
  -- Carpaccios
  ('Carpaccio Ao Mar',                        'Carpaccios',      'PORÇÃO'),
  ('Carpaccio de Barriga Trufado',            'Carpaccios',      'PORÇÃO'),
  -- Porcoes
  ('Dadinho de Tapioca com Salmão',           'Porções',         'PORÇÃO'),
  ('Varal de Camarão',                        'Porções',         'PORÇÃO'),
  ('Batata Frita',                            'Porções',         'PORÇÃO'),
  ('A Batata Frita Mais Gostosa Que Você Já Comeu', 'Porções',   'PORÇÃO'),
  ('Isca de Tilápia 2P',                      'Porções',         'PORÇÃO'),
  ('Isca de Tilápia 3P',                      'Porções',         'PORÇÃO'),
  ('Lula Crocante 2P',                        'Porções',         'PORÇÃO'),
  ('Lula Crocante 3P',                        'Porções',         'PORÇÃO'),
  ('Bolinhos de Siri Crocante',               'Porções',         'PORÇÃO'),
  ('Camarões e Lula à Provençal',             'Porções',         'PORÇÃO'),
  ('Mini Pastéis',                            'Porções',         'PORÇÃO'),
  ('Mini Hamburguinho',                       'Porções',         'PORÇÃO'),
  -- Pintado
  ('Pintado Espeto à Moda da Casa',           'Pintado',         'PORÇÃO'),
  ('Moqueca de Pintado',                      'Pintado',         'PORÇÃO'),
  ('Pintado à Parmegiana',                    'Pintado',         'PORÇÃO'),
  -- Salmao
  ('Salmão Vó Xica',                          'Salmão',          'PORÇÃO'),
  ('Salmão Siciliano',                        'Salmão',          'PORÇÃO'),
  ('Salmão Pipa',                             'Salmão',          'PORÇÃO'),
  -- Abadejo
  ('Abadejo à Belle Meunière',                'Abadejo',         'PORÇÃO'),
  ('Moqueca de Abadejo',                      'Abadejo',         'PORÇÃO'),
  -- Tilapia
  ('Tilápia à Belle Meunière',                'Tilápia',         'PORÇÃO'),
  ('Tilápia à Parmegiana',                    'Tilápia',         'PORÇÃO'),
  -- Peixe do Amazonas
  ('Tambaqui na Brasa',                       'Peixe do Amazonas','PORÇÃO'),
  -- Camarao
  ('Camarão Mauí',                            'Camarão',         'PORÇÃO'),
  ('Camarão Noronha',                         'Camarão',         'PORÇÃO'),
  ('Camarão Marajó',                          'Camarão',         'PORÇÃO'),
  ('Spaghetti com Camarões Médios',           'Camarão',         'PORÇÃO'),
  ('Camarão à Grega',                         'Camarão',         'PORÇÃO'),
  ('Spaghetti com Camarões Grandes',          'Camarão',         'PORÇÃO'),
  ('Camarão Atlântico',                       'Camarão',         'PORÇÃO'),
  ('Camarão Tropical',                        'Camarão',         'PORÇÃO'),
  ('Bobó de Camarão',                         'Camarão',         'PORÇÃO'),
  ('Camarão Cremoso',                         'Camarão',         'PORÇÃO'),
  -- Polvo
  ('Polvo à Provençal',                       'Polvo',           'PORÇÃO'),
  ('Polvo Baroa',                             'Polvo',           'PORÇÃO'),
  ('Polvo Nero',                              'Polvo',           'PORÇÃO'),
  -- File
  ('Mignon ao Molho Roti',                    'Filé',            'PORÇÃO'),
  ('Mignon à Parmegiana',                     'Filé',            'PORÇÃO'),
  ('Filé Papaya',                             'Filé',            'PORÇÃO'),
  -- Infantil
  ('Tilapinha',                               'Infantil',        'PORÇÃO'),
  ('Filezinho',                               'Infantil',        'PORÇÃO'),
  ('Spaghettinho',                            'Infantil',        'PORÇÃO'),
  -- Acompanhamentos
  ('Arroz Branco',                            'Acompanhamentos', 'PORÇÃO'),
  ('Arroz à Grega',                           'Acompanhamentos', 'PORÇÃO'),
  ('Arroz com Brócolis',                      'Acompanhamentos', 'PORÇÃO'),
  ('Arroz Negro',                             'Acompanhamentos', 'PORÇÃO'),
  ('Pirão',                                   'Acompanhamentos', 'PORÇÃO'),
  ('Legumes',                                 'Acompanhamentos', 'PORÇÃO'),
  ('Farofa de Banana',                        'Acompanhamentos', 'PORÇÃO'),
  ('Farofa de Dendê',                         'Acompanhamentos', 'PORÇÃO'),
  -- Menu Executivo (prefixados para nao colidir com o cardapio principal)
  ('Executivo Risoto de Camarão',             'Menu Executivo',  'PORÇÃO'),
  ('Executivo Salada Executiva',              'Menu Executivo',  'PORÇÃO'),
  ('Executivo Dadinho de Tapioca',            'Menu Executivo',  'PORÇÃO'),
  ('Executivo Ceviche de Peixe',              'Menu Executivo',  'PORÇÃO'),
  ('Executivo Mini Pastéis de Camarão',       'Menu Executivo',  'PORÇÃO'),
  ('Executivo Casquinha de Siri',             'Menu Executivo',  'PORÇÃO'),
  ('Executivo Tilápia Baroa',                 'Menu Executivo',  'PORÇÃO'),
  ('Executivo Paillard à Milanese',           'Menu Executivo',  'PORÇÃO'),
  ('Executivo Tilápia Soft',                  'Menu Executivo',  'PORÇÃO'),
  ('Executivo Tilápia Siciliana',             'Menu Executivo',  'PORÇÃO'),
  ('Executivo Camarão Atlântico',             'Menu Executivo',  'PORÇÃO'),
  ('Executivo Strogonoff de Camarão',         'Menu Executivo',  'PORÇÃO'),
  ('Executivo Spaghetti de Camarão',          'Menu Executivo',  'PORÇÃO'),
  ('Executivo Paillard de Mignon',            'Menu Executivo',  'PORÇÃO'),
  ('Executivo Mignon à Parmegiana',           'Menu Executivo',  'PORÇÃO')
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
-- where s.name = 'COZINHA'
--   and c.name = (select value from public._seed_config where key = 'company_name')
-- group by p.category order by p.category;

-- ============================================================================
-- REVERTER
-- ============================================================================
-- delete from public.products p
-- using public.sectors s, public.companies c
-- where p.sector_id = s.id and p.company_id = c.id
--   and s.name = 'COZINHA'
--   and c.name = (select value from public._seed_config where key = 'company_name');
