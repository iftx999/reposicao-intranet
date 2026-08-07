import type { StockMovementDaily } from "@/lib/types";

export type PeriodKey = "today" | "7d" | "30d" | "month" | "custom";
export type ComparisonKey = "previous" | "last_year";

// Datas circulam como "YYYY-MM-DD" no fuso local, mesma chave que a view
// stock_movement_daily devolve na coluna dia.
export type DateRange = { start: string; end: string };

export type MovementTotals = {
  demanda: number;
  entradaManual: number;
  baixa: number;
  ajuste: number;
};

// Quantos dias a janela de cobertura olha para tras ao estimar consumo diario.
export const coverageWindowDays = 30;

const emptyTotals: MovementTotals = { demanda: 0, entradaManual: 0, baixa: 0, ajuste: 0 };

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Meio-dia evita que a conversao de fuso empurre a data para o dia vizinho.
function fromDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function addDays(key: string, amount: number) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function daysBetween(start: string, end: string) {
  const diff = fromDateKey(end).getTime() - fromDateKey(start).getTime();
  return Math.round(diff / 86_400_000) + 1;
}

export function rangeForPeriod(period: PeriodKey, today: string, custom?: DateRange): DateRange {
  if (period === "today") {
    return { start: today, end: today };
  }

  if (period === "7d") {
    return { start: addDays(today, -6), end: today };
  }

  if (period === "30d") {
    return { start: addDays(today, -29), end: today };
  }

  if (period === "month") {
    const date = fromDateKey(today);
    return { start: toDateKey(new Date(date.getFullYear(), date.getMonth(), 1)), end: today };
  }

  return custom ?? { start: today, end: today };
}

export function previousRange(range: DateRange): DateRange {
  const length = daysBetween(range.start, range.end);
  const end = addDays(range.start, -1);
  return { start: addDays(end, -(length - 1)), end };
}

export function lastYearRange(range: DateRange): DateRange {
  return { start: shiftYear(range.start), end: shiftYear(range.end) };
}

// 29/02 nao existe em ano comum; o Date do JS resolve para 01/03, que e a
// aproximacao aceitavel aqui.
function shiftYear(key: string) {
  const date = fromDateKey(key);
  date.setFullYear(date.getFullYear() - 1);
  return toDateKey(date);
}

export function rowsInRange(rows: StockMovementDaily[], range: DateRange) {
  return rows.filter((row) => row.dia >= range.start && row.dia <= range.end);
}

export function totalsFor(rows: StockMovementDaily[]): MovementTotals {
  return rows.reduce<MovementTotals>((totals, row) => {
    // Carga inicial nao e consumo nem compra: fica fora de toda metrica.
    if (row.source === "inventory") {
      return totals;
    }

    if (row.movement_type === "entrada") {
      const key = row.source === "replenishment" ? "demanda" : "entradaManual";
      return { ...totals, [key]: totals[key] + row.total_delta };
    }

    if (row.movement_type === "saida") {
      // total_delta e negativo para saida; a tela mostra magnitude.
      return { ...totals, baixa: totals.baixa + Math.abs(row.total_delta) };
    }

    return { ...totals, ajuste: totals.ajuste + row.total_delta };
  }, { ...emptyTotals });
}

export function totalsByProduct(rows: StockMovementDaily[]) {
  const grouped = new Map<string, StockMovementDaily[]>();

  for (const row of rows) {
    const current = grouped.get(row.product_id);
    if (current) {
      current.push(row);
    } else {
      grouped.set(row.product_id, [row]);
    }
  }

  return new Map(Array.from(grouped, ([productId, productRows]) => [productId, totalsFor(productRows)]));
}

export type DailyTotals = MovementTotals & { dia: string };

export function dailySeries(rows: StockMovementDaily[], range: DateRange): DailyTotals[] {
  const length = daysBetween(range.start, range.end);
  const byDay = new Map<string, StockMovementDaily[]>();

  for (const row of rowsInRange(rows, range)) {
    const current = byDay.get(row.dia);
    if (current) {
      current.push(row);
    } else {
      byDay.set(row.dia, [row]);
    }
  }

  return Array.from({ length }, (_, index) => {
    const dia = addDays(range.start, index);
    return { dia, ...totalsFor(byDay.get(dia) ?? []) };
  });
}

export type ComparisonState = "ok" | "partial" | "unavailable";

// Distingue "nao houve movimento" de "nao havia sistema ainda". Tratar os dois
// como zero e como um relatorio de estoque perde a confianca do usuario.
export function comparisonState(range: DateRange, firstDataDay: string | null): ComparisonState {
  if (!firstDataDay || range.end < firstDataDay) {
    return "unavailable";
  }

  return range.start < firstDataDay ? "partial" : "ok";
}

export function percentChange(current: number, base: number) {
  if (base === 0) {
    return null;
  }

  return ((current - base) / base) * 100;
}

/**
 * Demanda media diaria dos ultimos 30 dias, dividida pelos dias com base
 * disponivel e nao pelos 30 fixos. Enquanto o historico for novo, dividir por
 * 30 subestimaria o consumo e inflaria a cobertura, escondendo justamente a
 * ruptura que a tela existe para antecipar.
 */
export function averageDailyDemand(
  rows: StockMovementDaily[],
  today: string,
  firstDataDay: string | null
) {
  const windowStart = addDays(today, -(coverageWindowDays - 1));
  const effectiveStart = firstDataDay && firstDataDay > windowStart ? firstDataDay : windowStart;
  const availableDays = Math.max(1, Math.min(coverageWindowDays, daysBetween(effectiveStart, today)));
  const { demanda } = totalsFor(rowsInRange(rows, { start: effectiveStart, end: today }));

  return demanda / availableDays;
}

export function coverageDays(quantity: number, averageDemand: number) {
  if (averageDemand <= 0) {
    return null;
  }

  return quantity / averageDemand;
}
