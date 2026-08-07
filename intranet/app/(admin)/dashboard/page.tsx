"use client";

import { CheckCircle2, Clock3, PackageSearch, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RequestsChart, type RequestsChartDay } from "@/components/RequestsChart";
import { statusLabels } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Product, RequestStatus } from "@/lib/types";

const statusOrder: RequestStatus[] = ["pending", "in_separation", "replenished", "cancelled"];
type PeriodKey = "today" | "7d" | "30d";

const lowStockGridTemplateColumns = "minmax(220px,2fr) minmax(120px,1fr) minmax(100px,0.8fr)";
const lowStockColumnLabels = ["Produto", "Estoque atual", "Mínimo"];
const badgeClassName = "h-auto px-2.5 py-1 text-[11px] font-semibold";
const emptyStatusCounts: Record<RequestStatus, number> = {
  pending: 0,
  in_separation: 0,
  replenished: 0,
  cancelled: 0
};

const periods: { key: PeriodKey; label: string; helper: string; days: number }[] = [
  { key: "today", label: "Hoje", helper: "hoje", days: 1 },
  { key: "7d", label: "7 dias", helper: "nos últimos 7 dias", days: 7 },
  { key: "30d", label: "30 dias", helper: "nos últimos 30 dias", days: 30 }
];

const statusCardConfig = {
  pending: {
    icon: Clock3,
    iconClassName: "bg-amber/15 text-amber"
  },
  in_separation: {
    icon: PackageSearch,
    iconClassName: "bg-soda/15 text-soda"
  },
  replenished: {
    icon: CheckCircle2,
    iconClassName: "bg-lime/15 text-lime"
  },
  cancelled: {
    icon: XCircle,
    iconClassName: "bg-coral/15 text-coral"
  }
} satisfies Record<RequestStatus, { icon: typeof Clock3; iconClassName: string }>;

const priorityBadgeClassNames: Record<string, string> = {
  alta: "bg-coral/15 text-coral ring-coral/40",
  urgente: "bg-coral/15 text-coral ring-coral/40",
  media: "bg-amber/15 text-amber ring-amber/35",
  média: "bg-amber/15 text-amber ring-amber/35",
  normal: "bg-amber/15 text-amber ring-amber/35",
  baixa: "bg-white/[0.06] text-muted ring-white/10"
};

const priorityOrder = ["urgente", "alta", "media", "média", "normal", "baixa"];

type RequestSummary = {
  status: RequestStatus;
  priority: string;
  created_at: string;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function periodStart(period: PeriodKey) {
  const selectedPeriod = periods.find((item) => item.key === period) ?? periods[1];
  const start = startOfLocalDay(new Date());
  start.setDate(start.getDate() - selectedPeriod.days + 1);
  return start;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildChartData(requests: RequestSummary[]) {
  const today = startOfLocalDay(new Date());
  const days: RequestsChartDay[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 13 + index);

    return {
      date: toLocalDateKey(date),
      counts: { ...emptyStatusCounts }
    };
  });
  const dayMap = new Map(days.map((day) => [day.date, day]));

  for (const request of requests) {
    const day = dayMap.get(toLocalDateKey(new Date(request.created_at)));
    if (day) {
      day.counts[request.status] += 1;
    }
  }

  return days;
}

function getPriorityClassName(priority: string) {
  return priorityBadgeClassNames[priority.toLowerCase()] || priorityBadgeClassNames.baixa;
}

export default function DashboardPage() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [loading, setLoading] = useState(true);
  const activePeriod = periods.find((item) => item.key === period) ?? periods[1];
  const statusCounts = requests.reduce<Record<RequestStatus, number>>((counts, request) => {
    if (new Date(request.created_at) >= periodStart(period)) {
      counts[request.status] += 1;
    }

    return counts;
  }, { ...emptyStatusCounts });
  const pendingPriorityCounts = requests.reduce<Record<string, number>>((counts, request) => {
    if (request.status === "pending") {
      const priority = request.priority || "normal";
      counts[priority] = (counts[priority] || 0) + 1;
    }

    return counts;
  }, {});
  const pendingPriorityEntries = Object.entries(pendingPriorityCounts).sort(([priorityA], [priorityB]) => {
    const indexA = priorityOrder.indexOf(priorityA.toLowerCase());
    const indexB = priorityOrder.indexOf(priorityB.toLowerCase());

    return (indexA === -1 ? priorityOrder.length : indexA) - (indexB === -1 ? priorityOrder.length : indexB);
  });
  const highPriorityPending = Object.entries(pendingPriorityCounts).reduce((sum, [priority, count]) => {
    const normalizedPriority = priority.toLowerCase();
    return normalizedPriority === "alta" || normalizedPriority === "urgente" ? sum + count : sum;
  }, 0);
  const chartData = buildChartData(requests);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: products } = await supabase.from("products").select("*");
      const belowMinimum = ((products || []) as Product[]).filter(
        (product) => product.quantity < product.min_quantity
      );
      setLowStock(belowMinimum);

      const { data: requestData } = await supabase.from("replenishment_requests").select("status, priority, created_at");
      setRequests((requestData || []) as RequestSummary[]);

      setLoading(false);
    }

    void load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">BAR Intranet</p>
        <h1 className="mt-2 text-3xl font-black text-white">Dashboard</h1>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-semibold text-muted">
          Cards mostrando solicitações <span className="text-ice">{activePeriod.helper}</span>.
        </p>
        <div className="flex rounded-full border border-white/10 bg-white/[0.05] p-1" aria-label="Selecionar período dos cards">
          {periods.map((item) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soda/25 ${
                period === item.key ? "bg-lime text-graphite" : "border border-white/10 bg-white/[0.05] text-ice hover:bg-white/10"
              }`}
              key={item.key}
              onClick={() => setPeriod(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusOrder.map((status) => {
          const config = statusCardConfig[status];
          const Icon = config.icon;

          return (
            <Link
              aria-label={`Ver solicitações com status ${statusLabels[status]} filtradas na tela de solicitações`}
              className="flex items-center gap-4 rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soda/25"
              href={`/solicitacoes?status=${status}`}
              key={status}
            >
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${config.iconClassName}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-black leading-none text-white">{loading ? "-" : statusCounts[status]}</p>
                <p className="mt-2 truncate text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {statusLabels[status]}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-subtle">{activePeriod.helper}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
        <Link
          aria-label="Ver solicitações pendentes filtradas por status na tela de solicitações"
          className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soda/25"
          href="/solicitacoes?status=pending"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Pendências por prioridade</h2>
              <p className="mt-2 text-sm text-muted">Solicitações pendentes agora</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black leading-none text-coral">{loading ? "-" : highPriorityPending}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Alta/Urgente</p>
            </div>
          </div>

          {loading ? (
            <p className="mt-7 text-sm text-muted">Carregando pendências...</p>
          ) : pendingPriorityEntries.length === 0 ? (
            <p className="mt-7 text-sm font-semibold text-muted">Nenhuma pendência no momento.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {pendingPriorityEntries.map(([priority, count]) => (
                <div className="flex items-center justify-between gap-4" key={priority}>
                  <Badge className={`${badgeClassName} ${getPriorityClassName(priority)}`} variant="neutral">
                    {priority}
                  </Badge>
                  <span className="text-lg font-black text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Link>

        <RequestsChart data={chartData} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Estoque baixo</h2>
        <div className="mt-3 overflow-hidden rounded-[28px] border border-white/[0.08] bg-charcoal shadow-panel">
          <div
            className="hidden border-b border-white/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:items-center md:gap-4"
            style={{ gridTemplateColumns: lowStockGridTemplateColumns }}
          >
            {lowStockColumnLabels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          {loading ? (
            <p className="px-5 py-4 text-sm text-muted">Carregando...</p>
          ) : lowStock.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Nenhum produto abaixo do mínimo.</p>
          ) : (
            lowStock.map((product) => <LowStockRow key={product.id} product={product} />)
          )}
        </div>
      </section>
    </main>
  );
}

function LowStockRow({ product }: { product: Product }) {
  return (
    <div
      className="border-b border-white/[0.06] px-5 py-4 transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      style={{ gridTemplateColumns: lowStockGridTemplateColumns }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{product.name}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Produto</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Estoque atual</span>
        <Badge className={badgeClassName} variant="destructive">
          {product.quantity}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Mínimo</span>
        <span className="text-sm text-muted">{product.min_quantity}</span>
      </div>
    </div>
  );
}
