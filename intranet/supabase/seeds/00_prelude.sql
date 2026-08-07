-- ============================================================================
-- 00_PRELUDE.sql  -  Carga do cardapio Restaurante Jangada
-- ============================================================================
-- Este e o PRIMEIRO arquivo da serie. Rode nesta ordem:
--   00_prelude.sql  ->  10_bar.sql  ->  20_sushi.sql
--                   ->  30_cozinha.sql  ->  40_sobremesas.sql
--
-- O QUE ELE FAZ:
--   1. Grava o nome da empresa alvo numa tabela de configuracao temporaria,
--      para que os arquivos seguintes nao precisem repetir esse nome.
--   2. Aborta com erro claro se a empresa nao existir.
--   3. Cria os setores BAR, SUSHI, COZINHA e SOBREMESAS (se faltarem).
--
-- AJUSTE OBRIGATORIO: troque o nome na linha marcada com ">>> AJUSTE AQUI <<<".
-- Este e o UNICO lugar da serie inteira onde o nome da empresa aparece.
--
-- POR QUE ISSO E NECESSARIO: no SQL Editor do Dashboard a sessao nao e de um
-- usuario da aplicacao, entao auth.uid() e NULO e funcoes como
-- current_user_company_id() retornam NULO. Por isso a empresa vai explicita.
--
-- IDEMPOTENTE: rodar duas vezes nao duplica nada.
--
-- COMO REVERTER: veja o bloco comentado no final deste arquivo.
-- ============================================================================

begin;

create table if not exists public._seed_config (
  key text primary key,
  value text not null
);

-- >>> AJUSTE AQUI <<< nome exato da empresa em public.companies
insert into public._seed_config (key, value)
values ('company_name', 'Restaurante Jangada')
on conflict (key) do update set value = excluded.value;

-- Aborta se a empresa nao existir, em vez de inserir dados errados.
do $$
declare
  v_name text;
  v_company uuid;
begin
  select value into v_name from public._seed_config where key = 'company_name';

  select id into v_company from public.companies where name = v_name;

  if v_company is null then
    raise exception
      'Empresa "%" nao encontrada em public.companies. Ajuste o nome no topo de 00_prelude.sql. Empresas disponiveis: %',
      v_name,
      (select coalesce(string_agg(name, ', '), '(nenhuma)') from public.companies);
  end if;
end $$;

-- Cria os quatro setores. A tabela sectors tem unique (company_id, name),
-- entao on conflict do nothing garante idempotencia.
insert into public.sectors (company_id, name, active)
select c.id, s.name, true
from public.companies c
cross join (values ('BAR'), ('SUSHI'), ('COZINHA'), ('SOBREMESAS')) as s(name)
where c.name = (select value from public._seed_config where key = 'company_name')
on conflict (company_id, name) do nothing;

commit;

-- ============================================================================
-- CONFERENCIA (rode separado, depois do commit)
-- ============================================================================
-- select s.name as setor, s.active
-- from public.sectors s
-- join public.companies c on c.id = s.company_id
-- where c.name = (select value from public._seed_config where key = 'company_name')
-- order by s.name;

-- ============================================================================
-- REVERTER
-- ============================================================================
-- Remove APENAS os setores criados aqui, e so se nao houver produto vinculado:
--
-- delete from public.sectors s
-- using public.companies c
-- where s.company_id = c.id
--   and c.name = (select value from public._seed_config where key = 'company_name')
--   and s.name in ('BAR', 'SUSHI', 'COZINHA', 'SOBREMESAS')
--   and not exists (select 1 from public.products p where p.sector_id = s.id);

-- ============================================================================
-- LIMPEZA FINAL (rode so depois que TODOS os arquivos da serie terminarem)
-- ============================================================================
-- drop table if exists public._seed_config;
