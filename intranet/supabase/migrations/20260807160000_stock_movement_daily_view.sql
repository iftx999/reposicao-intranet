-- Agregacao diaria do ledger para a tela de relatorios.
--
-- security_invoker = on faz a view aplicar as policies de stock_movements e
-- products do usuario que consulta, entao o operador continua limitado ao
-- proprio setor sem a camada de relatorio reimplementar permissao.
--
-- O at time zone existe porque agrupar por dia em UTC empurra a movimentacao
-- feita depois das 21h para o dia seguinte, que num bar e justamente o horario
-- de pico. Fixo em America/Sao_Paulo nesta versao; vira coluna da empresa
-- quando houver cliente em outro fuso.

drop view if exists public.stock_movement_daily;

create view public.stock_movement_daily
with (security_invoker = on) as
select
  sm.company_id,
  sm.product_id,
  p.sector_id,
  (sm.created_at at time zone 'America/Sao_Paulo')::date as dia,
  sm.movement_type,
  sm.source,
  sum(sm.delta) as total_delta,
  count(*) as qtd_movimentos
from public.stock_movements sm
join public.products p on p.id = sm.product_id
group by
  sm.company_id,
  sm.product_id,
  p.sector_id,
  (sm.created_at at time zone 'America/Sao_Paulo')::date,
  sm.movement_type,
  sm.source;

grant select on public.stock_movement_daily to authenticated;

-- Verificacao manual.
--
-- Como operador, deve retornar apenas linhas de produtos do proprio setor:
-- select * from public.stock_movement_daily order by dia desc;
--
-- Movimentos de carga inicial ficam identificaveis para serem excluidos das
-- metricas de demanda:
-- select dia, source, movement_type, total_delta
-- from public.stock_movement_daily
-- where source = 'inventory';
--
-- Data de inicio da base historica da empresa:
-- select min(dia) from public.stock_movement_daily;
