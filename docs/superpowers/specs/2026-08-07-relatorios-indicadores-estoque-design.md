# Relatórios e indicadores de estoque — design

Data: 2026-08-07
Status: aprovado, pronto para plano de implementação

## Problema

Não existe nenhuma tela que responda "o que sai mais do estoque e com que ritmo". Quem decide compra hoje olha o saldo atual e o `min_quantity`, que é um limiar fixo e alheio à velocidade de consumo de cada produto.

O objetivo escolhido para esta primeira versão é **planejar compra e reposição**. Controle de consumo por setor e auditoria de perdas ficam para depois, na mesma estrutura.

## Realidade dos dados

A tabela `stock_movements` foi criada em `20260806120000_stock_movements_ledger.sql`, em 06/08/2026. O backfill gravou todo o saldo pré-existente como um único movimento `source = 'inventory'`, `reason = 'Saldo inicial'`, com `created_at = now()`.

Consequências que o desenho precisa respeitar:

- Não há movimentação anterior a 06/08/2026. Comparação ano contra ano retorna vazio até agosto de 2027.
- Não existe histórico externo para importar. A base se acumula a partir de agora.
- Os movimentos `source = 'inventory'` são carga inicial, não consumo, e ficam fora de toda métrica de demanda.

## Origem de cada número

Movimentos nascem de duas formas, com confiabilidade bem diferente:

| Natureza | Como nasce | Confiabilidade |
|---|---|---|
| `entrada` / `source = 'replenishment'` | Automática, quando um pedido vira `replenished` | Alta — vem do fluxo diário dos operadores |
| `entrada` / `source = 'manual'` | Lançada por admin ou gestor na tela de Estoque | Média — depende de disciplina |
| `saida` | Lançada à mão na tela de Estoque | Baixa — depende de alguém lembrar |
| `ajuste` | Lançado à mão, correção de inventário | Não é consumo |

O indicador principal de demanda é a **entrada por reposição**, porque chega sozinha. As demais aparecem em colunas separadas, nunca somadas num número único. Contar `ajuste` como consumo inflaria a previsão de compra — é o erro clássico deste tipo de relatório.

## Camada de dados

Agregação no Postgres, não no cliente. O dashboard atual busca todos os produtos e todas as solicitações e filtra em JavaScript (`intranet/app/(admin)/dashboard/page.tsx:149`); repetir esse padrão num relatório histórico não se sustenta.

```sql
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
group by 1, 2, 3, 4, 5, 6;
```

**`security_invoker = on`** faz a view aplicar as policies de `stock_movements` e `products` do usuário que consulta. O operador continua limitado ao próprio setor sem que a camada de relatório reimplemente permissão.

**`at time zone 'America/Sao_Paulo'`** existe porque agrupar por dia em UTC empurra toda movimentação feita depois das 21h para o dia seguinte — exatamente o horário de pico de um bar. Fica fixo nesta versão; vira coluna da empresa quando houver cliente em outro fuso.

## Tela `/relatorios`

Nova rota no grupo `(admin)`, seguindo o padrão das telas existentes.

### 1. Cobertura

Para cada produto: `saldo atual ÷ demanda média diária` = dias de estoque restantes, ordenado do menor para o maior.

É o número que responde "o que compro esta semana". Mais acionável que `min_quantity`, porque leva em conta o ritmo.

**Definição da média**: soma da demanda (entrada por reposição) nos últimos 30 dias corridos, dividida pelo número de dias com dados disponíveis na janela — não pelos 30 fixos. Enquanto a base for menor que 30 dias, dividir por 30 subestimaria o consumo e superestimaria a cobertura, escondendo justamente a ruptura que a tela existe para prever.

A janela da cobertura é sempre 30 dias, independente do período selecionado nos outros blocos. Cobertura é uma projeção do estado atual, não um recorte histórico.

Quando a demanda média diária é zero, a cobertura é indefinida — exibir `—`, nunca infinito ou um número grande.

### 2. Ranking de movimentação no período

Por produto, com as quatro naturezas em colunas separadas: demanda, entrada manual, baixa, ajuste. Ordenado por demanda.

### 3. Curva diária

Barras por dia no período, reaproveitando o padrão visual de `components/RequestsChart.tsx`.

### 4. Comparação

Dois seletores independentes:

- **Período**: hoje, 7 dias, 30 dias, mês corrente, intervalo livre
- **Base**: período anterior de mesmo tamanho, ou mesmo período do ano anterior

## Comportamento sem base histórica

O sistema calcula a data do primeiro movimento da empresa (`min(created_at)` em `stock_movements`).

Se a janela de comparação cai inteiramente antes dessa data, o bloco de comparação exibe **"Sem base histórica — dados desde DD/MM/AAAA"**. Não exibe `0`, não exibe `-100%`, não exibe seta de variação.

Zero movimento e ausência de dado são estados distintos. Tratá-los igual é como um relatório de estoque perde a confiança do usuário no primeiro mês de uso.

Se a janela cai parcialmente antes, a comparação é calculada sobre o trecho com dados e rotulada como parcial.

## Testes

Estender a suíte pgTAP em `intranet/supabase/tests/database/`:

- operador consultando `stock_movement_daily` vê apenas linhas de produtos do próprio setor
- usuário da empresa A não vê nenhuma linha da empresa B
- movimentos `source = 'inventory'` não entram no cálculo de demanda
- agrupamento por dia respeita o fuso: movimento às 22h de São Paulo cai no dia local correto, não no seguinte

## Fora de escopo nesta versão

- Exportação CSV
- Valor financeiro — não existe campo de custo em `products`
- Aba de auditoria por usuário
- Consumo comparado entre setores
