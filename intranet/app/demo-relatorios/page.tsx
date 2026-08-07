"use client";

import { useMemo, useState } from "react";
import { ReportsView } from "@/components/ReportsView";
import { buildDemoDataset } from "@/lib/demoData";
import { toDateKey, type ComparisonKey, type PeriodKey } from "@/lib/reports";

// Rota de demonstracao: renderiza a tela de relatorios com dados ficticios em
// memoria, sem sessao e sem tocar no banco. Pode ser removida a qualquer momento
// apagando este arquivo e lib/demoData.ts.
export default function DemoRelatoriosPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [comparison, setComparison] = useState<ComparisonKey>("previous");

  const today = toDateKey(new Date());
  const { products, rows, firstDataDay } = useMemo(() => buildDemoDataset(today), [today]);

  return (
    <div className="min-h-screen bg-graphite">
      <p className="bg-amber/15 px-6 py-3 text-center text-sm font-bold text-amber">
        Demonstração com dados fictícios — nada aqui vem do banco.
      </p>
      <ReportsView
        comparison={comparison}
        firstDataDay={firstDataDay}
        onComparisonChange={setComparison}
        onPeriodChange={setPeriod}
        period={period}
        products={products}
        rows={rows}
        today={today}
      />
    </div>
  );
}
