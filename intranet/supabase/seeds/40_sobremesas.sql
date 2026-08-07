-- ============================================================================
-- 40_SOBREMESAS.sql  -  Produtos do setor SOBREMESAS (8 itens)
-- ============================================================================
-- PRE-REQUISITO: rode 00_prelude.sql antes.
--
-- NAO ha nada para ajustar aqui: o nome da empresa vem de public._seed_config.
--
-- IDEMPOTENTE: nao insere produto cujo nome ja exista na mesma empresa.
-- Precos do cardapio foram DESCARTADOS.
--
-- NOTA: Pudim de Leite, Mini Churros, Petit Gateau e Loucos por Chocolate
-- aparecem DUAS vezes no cardapio (na secao Sobremesas e dentro do Menu
-- Executivo). Foram inseridos UMA vez so, aqui.
-- ============================================================================

begin;

do $$
declare v_sector uuid;
begin
  select s.id into v_sector
  from public.sectors s
  join public.companies c on c.id = s.company_id
  where c.name = (select value from public._seed_config where key = 'company_name')
    and s.name = 'SOBREMESAS';

  if v_sector is null then
    raise exception 'Setor SOBREMESAS nao encontrado. Rode 00_prelude.sql primeiro.';
  end if;
end $$;

with alvo as (
  select c.id as company_id, s.id as sector_id
  from public.companies c
  join public.sectors s on s.company_id = c.id and s.name = 'SOBREMESAS'
  where c.name = (select value from public._seed_config where key = 'company_name')
),
itens (name, category, unit) as (values
  ('Pudim de Leite',          'Sobremesas', 'PORÇÃO'),
  ('Mini Churros Jangada',    'Sobremesas', 'PORÇÃO'),
  ('Loucos por Chocolate',    'Sobremesas', 'PORÇÃO'),
  ('Petit Gateau',            'Sobremesas', 'PORÇÃO'),
  ('Creme de Papaya',         'Sobremesas', 'PORÇÃO'),
  ('Profiterole',             'Sobremesas', 'PORÇÃO'),
  ('Mini Cannoli',            'Sobremesas', 'PORÇÃO'),
  ('Banoffe do Janga',        'Sobremesas', 'PORÇÃO')
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
-- CONFERENCIA GERAL (rode depois de TODOS os arquivos da serie)
-- ============================================================================
-- select s.name as setor, count(p.id) as produtos
-- from public.sectors s
-- join public.companies c on c.id = s.company_id
-- left join public.products p on p.sector_id = s.id
-- where c.name = (select value from public._seed_config where key = 'company_name')
-- group by s.name order by s.name;
--
-- Esperado: BAR 64 | COZINHA 76 | SOBREMESAS 8 | SUSHI 25  = 173 no total

-- ============================================================================
-- REVERTER
-- ============================================================================
-- delete from public.products p
-- using public.sectors s, public.companies c
-- where p.sector_id = s.id and p.company_id = c.id
--   and s.name = 'SOBREMESAS'
--   and c.name = (select value from public._seed_config where key = 'company_name');

-- ============================================================================
-- LIMPEZA (opcional, depois de conferir tudo)
-- ============================================================================
-- drop table if exists public._seed_config;
