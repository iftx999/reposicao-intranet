"use client";

import { type ReactNode, useMemo } from "react";
import { StockMovementsChart } from "@/components/StockMovementsChart";
import {
  averageDailyDemand,
  comparisonState,
  coverageDays,
  coverageWindowDays,
  dailySeries,
  lastYearRange,
  percentChange,
  previousRange,
  rangeForPeriod,
  rowsInRange,
  totalsByProduct,
  totalsFor,
  type ComparisonKey,
  type MovementTotals,
  type PeriodKey
} from "@/lib/reports";
import type { Product, StockMovementDaily } from "@/lib/types";

const periods: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mês" }
];

const comparisons: { key: ComparisonKey; label: string }[] = [
  { key: "previous", label: "Período anterior" },
  { key: "last_year", label: "Ano anterior" }
];

const metricCards: { key: keyof MovementTotals; label: string; helper: string }[] = [
  { key: "demanda", label: "Demanda", helper: "Reposições atendidas" },
  { key: "entradaManual", label: "Entrada manual", helper: "Lançadas na tela de Estoque" },
  { key: "baixa", label: "Baixa", helper: "Saídas lançadas à mão" },
  { key: "ajuste", label: "Ajuste", helper: "Correção de inventário" }
];

const coverageGridTemplateColumns = "minmax(220px,2fr) minmax(110px,1fr) minmax(130px,1fr) minmax(120px,1fr)";
const rankingGridTemplateColumns = "minmax(220px,2fr) repeat(4, minmax(96px,1fr))";

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${dateKey}T12:00:00`));
}

/**
 * Abaixo de md o cabecalho da tabela some, entao cada celula carrega o proprio
 * rotulo. Sem isso o celular mostra uma fileira de numeros sem significado.
 */
function Cell({ label, children, className = "text-muted" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="mt-3 flex items-baseline justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      <span className={`text-sm ${className}`}>{children}</span>
    </div>
  );
}

export type ReportsViewProps = {
  today: string;
  period: PeriodKey;
  comparison: ComparisonKey;
  onPeriodChange: (period: PeriodKey) => void;
  onComparisonChange: (comparison: ComparisonKey) => void;
  products: Product[];
  rows: StockMovementDaily[];
  firstDataDay: string | null;
  loading?: boolean;
  error?: string;
};

export function ReportsView({
  today,
  period,
  comparison,
  onPeriodChange,
  onComparisonChange,
  products,
  rows,
  firstDataDay,
  loading = false,
  error = ""
}: ReportsViewProps) {
  const range = rangeForPeriod(period, today);
  const baseRange = comparison === "previous" ? previousRange(range) : lastYearRange(range);

  const periodTotals = useMemo(() => totalsFor(rowsInRange(rows, range)), [rows, range.start, range.end]);
  const baseTotals = useMemo(() => totalsFor(rowsInRange(rows, baseRange)), [rows, baseRange.start, baseRange.end]);

  const ranking = useMemo(() => {
    const totals = totalsByProduct(rowsInRange(rows, range));

    return products
      .map((product) => ({ product, totals: totals.get(product.id) }))
      .filter((entry): entry is { product: Product; totals: MovementTotals } => Boolean(entry.totals))
      .sort((a, b) => b.totals.demanda - a.totals.demanda);
  }, [products, rows, range.start, range.end]);

  const coverage = useMemo(
    () =>
      products
        .map((product) => {
          const productRows = rows.filter((row) => row.product_id === product.id);
          const average = averageDailyDemand(productRows, today, firstDataDay);

          return { product, average, days: coverageDays(product.quantity, average) };
        })
        .sort((a, b) => {
          if (a.days === null) {
            return b.days === null ? 0 : 1;
          }

          return b.days === null ? -1 : a.days - b.days;
        }),
    [products, rows, today, firstDataDay]
  );

  const series = useMemo(() => dailySeries(rows, range), [rows, range.start, range.end]);
  const baseState = comparisonState(baseRange, firstDataDay);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Indicadores</p>
        <h1 className="mt-2 text-3xl font-black text-white">Relatórios</h1>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-semibold text-muted">
          Período de <span className="text-ice">{formatDate(range.start)}</span> a{" "}
          <span className="text-ice">{formatDate(range.end)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full border border-white/10 bg-white/[0.05] p-1" aria-label="Selecionar período">
            {periods.map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soda/25 ${
                  period === item.key ? "bg-lime text-graphite" : "text-ice hover:bg-white/10"
                }`}
                key={item.key}
                onClick={() => onPeriodChange(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/[0.05] p-1" aria-label="Selecionar base de comparação">
            {comparisons.map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soda/25 ${
                  comparison === item.key ? "bg-soda text-graphite" : "text-ice hover:bg-white/10"
                }`}
                key={item.key}
                onClick={() => onComparisonChange(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-[20px] border border-coral/30 bg-coral/10 px-5 py-4 text-sm font-semibold text-coral">{error}</p>
      ) : null}

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => {
          const current = periodTotals[card.key];
          const change = baseState === "unavailable" ? null : percentChange(current, baseTotals[card.key]);

          return (
            <div className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel" key={card.key}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{card.label}</p>
              <p className="mt-3 text-3xl font-black leading-none text-white">{loading ? "-" : formatNumber(current)}</p>
              <p className="mt-2 text-[11px] font-semibold text-subtle">{card.helper}</p>
              <p className="mt-3 text-xs font-semibold text-muted">
                {baseState === "unavailable"
                  ? "Sem base histórica"
                  : change === null
                    ? "Sem movimento na base"
                    : `${change >= 0 ? "+" : ""}${formatNumber(change)}% vs base`}
              </p>
            </div>
          );
        })}
      </section>

      {baseState !== "ok" ? (
        <p className="mt-4 rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-muted">
          {baseState === "unavailable"
            ? firstDataDay
              ? `Sem base histórica para ${formatDate(baseRange.start)} a ${formatDate(baseRange.end)} — dados desde ${formatDate(firstDataDay)}.`
              : "Sem base histórica — nenhuma movimentação registrada ainda."
            : `Comparação parcial: a base começa em ${formatDate(firstDataDay || range.start)}, depois do início do período comparado.`}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Cobertura</h2>
        <p className="mt-2 text-sm text-muted">
          Dias de estoque restantes pelo ritmo dos últimos {coverageWindowDays} dias. Menor cobertura primeiro.
        </p>
        <div className="mt-3 overflow-x-auto rounded-[28px] border border-white/[0.08] bg-charcoal shadow-panel">
          <div
            className="hidden border-b border-white/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:min-w-[680px] md:items-center md:gap-4"
            style={{ gridTemplateColumns: coverageGridTemplateColumns }}
          >
            <div>Produto</div>
            <div>Saldo</div>
            <div>Demanda/dia</div>
            <div>Cobertura</div>
          </div>

          {loading ? (
            <p className="px-5 py-4 text-sm text-muted">Carregando...</p>
          ) : coverage.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Nenhum produto cadastrado.</p>
          ) : (
            coverage.slice(0, 20).map(({ product, average, days }) => (
              <div
                className="border-b border-white/[0.06] px-5 py-4 last:border-b-0 md:grid md:min-w-[680px] md:items-center md:gap-4"
                key={product.id}
                style={{ gridTemplateColumns: coverageGridTemplateColumns }}
              >
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <Cell label="Saldo">{formatNumber(product.quantity)}</Cell>
                <Cell label="Demanda/dia">{formatNumber(average)}</Cell>
                <Cell className={`font-bold ${days !== null && days < 3 ? "text-coral" : "text-ice"}`} label="Cobertura">
                  {days === null ? "—" : `${formatNumber(days)} dias`}
                </Cell>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">{loading ? null : <StockMovementsChart data={series} />}</section>

      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Movimentação por produto</h2>
        <div className="mt-3 overflow-x-auto rounded-[28px] border border-white/[0.08] bg-charcoal shadow-panel">
          <div
            className="hidden min-w-[680px] border-b border-white/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:items-center md:gap-4"
            style={{ gridTemplateColumns: rankingGridTemplateColumns }}
          >
            <div>Produto</div>
            <div>Demanda</div>
            <div>Entrada manual</div>
            <div>Baixa</div>
            <div>Ajuste</div>
          </div>

          {loading ? (
            <p className="px-5 py-4 text-sm text-muted">Carregando...</p>
          ) : ranking.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Nenhuma movimentação no período.</p>
          ) : (
            ranking.map(({ product, totals }) => (
              <div
                className="border-b border-white/[0.06] px-5 py-4 last:border-b-0 md:grid md:min-w-[680px] md:items-center md:gap-4"
                key={product.id}
                style={{ gridTemplateColumns: rankingGridTemplateColumns }}
              >
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <Cell className="font-bold text-lime" label="Demanda">
                  {formatNumber(totals.demanda)}
                </Cell>
                <Cell label="Entrada manual">{formatNumber(totals.entradaManual)}</Cell>
                <Cell label="Baixa">{formatNumber(totals.baixa)}</Cell>
                <Cell label="Ajuste">{formatNumber(totals.ajuste)}</Cell>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
