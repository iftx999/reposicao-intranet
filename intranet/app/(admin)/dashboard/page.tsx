"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statusLabels } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Product, RequestStatus } from "@/lib/types";

const statusOrder: RequestStatus[] = ["pending", "in_separation", "replenished", "cancelled"];

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
        <h1 className="mt-2 text-3xl font-black text-graphite">Dashboard</h1>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statusOrder.map((status) => (
          <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm" key={status}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{statusLabels[status]}</p>
            <p className="mt-2 text-3xl font-black text-graphite">{loading ? "-" : statusCounts[status]}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Estoque baixo</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-charcoal hover:bg-charcoal">
                {["Produto", "Estoque atual", "Mínimo"].map((heading) => (
                  <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell className="text-muted" colSpan={3}>Carregando...</TableCell></TableRow>
              ) : lowStock.length === 0 ? (
                <TableRow><TableCell className="text-muted" colSpan={3}>Nenhum produto abaixo do mínimo.</TableCell></TableRow>
              ) : (
                lowStock.map((product) => (
                  <TableRow className="hover:bg-ice" key={product.id}>
                    <TableCell className="font-bold text-graphite">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{product.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{product.min_quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
