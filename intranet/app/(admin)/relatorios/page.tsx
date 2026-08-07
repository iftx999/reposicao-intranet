"use client";

import { useEffect, useState } from "react";
import { ReportsView } from "@/components/ReportsView";
import {
  addDays,
  coverageWindowDays,
  lastYearRange,
  previousRange,
  rangeForPeriod,
  toDateKey,
  type ComparisonKey,
  type PeriodKey
} from "@/lib/reports";
import { supabase } from "@/lib/supabase";
import type { Product, StockMovementDaily } from "@/lib/types";

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [comparison, setComparison] = useState<ComparisonKey>("previous");
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<StockMovementDaily[]>([]);
  const [firstDataDay, setFirstDataDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = toDateKey(new Date());
  const range = rangeForPeriod(period, today);
  const baseRange = comparison === "previous" ? previousRange(range) : lastYearRange(range);
  const coverageStart = addDays(today, -(coverageWindowDays - 1));
  // A janela buscada precisa cobrir periodo, base de comparacao e cobertura.
  const fetchFrom = [range.start, baseRange.start, coverageStart].sort()[0];

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const [productsResult, rowsResult, firstDayResult] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("stock_movement_daily").select("*").gte("dia", fetchFrom),
        supabase.from("stock_movement_daily").select("dia").order("dia", { ascending: true }).limit(1)
      ]);

      const loadError = productsResult.error || rowsResult.error || firstDayResult.error;

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setProducts((productsResult.data || []) as Product[]);
      setRows((rowsResult.data || []) as StockMovementDaily[]);
      setFirstDataDay(((firstDayResult.data || [])[0] as { dia: string } | undefined)?.dia ?? null);
      setLoading(false);
    }

    void load();
  }, [fetchFrom]);

  return (
    <ReportsView
      comparison={comparison}
      error={error}
      firstDataDay={firstDataDay}
      loading={loading}
      onComparisonChange={setComparison}
      onPeriodChange={setPeriod}
      period={period}
      products={products}
      rows={rows}
      today={today}
    />
  );
}
