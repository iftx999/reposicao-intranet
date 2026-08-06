"use client";

import { CheckCircle2, Clock3, PackageSearch, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Product, RequestStatus } from "@/lib/types";

const statusOrder: RequestStatus[] = ["pending", "in_separation", "replenished", "cancelled"];

const lowStockGridTemplateColumns = "minmax(220px,2fr) minmax(120px,1fr) minmax(100px,0.8fr)";
const lowStockColumnLabels = ["Produto", "Estoque atual", "Minimo"];
const badgeClassName = "h-auto px-2.5 py-1 text-[11px] font-semibold";

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

export default function DashboardPage() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<RequestStatus, number>>({
    pending: 0,
    in_separation: 0,
    replenished: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: products } = await supabase.from("products").select("*");
      const belowMinimum = ((products || []) as Product[]).filter(
        (product) => product.quantity < product.min_quantity
      );
      setLowStock(belowMinimum);

      const { data: requests } = await supabase.from("replenishment_requests").select("status");
      const counts: Record<RequestStatus, number> = {
        pending: 0,
        in_separation: 0,
        replenished: 0,
        cancelled: 0
      };
      for (const request of (requests || []) as { status: RequestStatus }[]) {
        counts[request.status] += 1;
      }
      setStatusCounts(counts);

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

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusOrder.map((status) => {
          const config = statusCardConfig[status];
          const Icon = config.icon;

          return (
            <div
              className="flex items-center gap-4 rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel"
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
              </div>
            </div>
          );
        })}
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
            <p className="px-5 py-4 text-sm text-muted">Nenhum produto abaixo do minimo.</p>
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
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Minimo</span>
        <span className="text-sm text-muted">{product.min_quantity}</span>
      </div>
    </div>
  );
}
