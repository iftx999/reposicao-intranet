"use client";

import { Ban, CheckCircle2, ChevronsRight } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nextStatuses, statusLabels } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { ReplenishmentRequest, ReplenishmentRequestItem, RequestStatus, RequestStatusEvent } from "@/lib/types";

export default function SolicitacoesPage() {
  const [requests, setRequests] = useState<ReplenishmentRequest[]>([]);
  const [items, setItems] = useState<ReplenishmentRequestItem[]>([]);
  const [events, setEvents] = useState<RequestStatusEvent[]>([]);
  const [selected, setSelected] = useState<ReplenishmentRequest | null>(null);
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");
    const query = supabase.from("replenishment_requests").select("*").order("created_at", { ascending: false });
    const { data, error: loadError } = status === "all" ? await query : await query.eq("status", status);

    if (loadError) {
      setError(loadError.message);
    } else {
      setRequests((data || []) as ReplenishmentRequest[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadRequests();
  }, [status]);

  async function openRequest(request: ReplenishmentRequest) {
    setSelected(request);
    setError("");

    const [{ data: itemData, error: itemError }, { data: eventData, error: eventError }] = await Promise.all([
      supabase.from("replenishment_request_items").select("*").eq("request_id", request.id).order("product_name"),
      supabase.from("request_status_events").select("*").eq("request_id", request.id).order("created_at", { ascending: false })
    ]);

    if (itemError || eventError) {
      setError(itemError?.message || eventError?.message || "Erro ao carregar detalhes.");
    }

    setItems((itemData || []) as ReplenishmentRequestItem[]);
    setEvents((eventData || []) as RequestStatusEvent[]);
  }

  async function transitionRequest(nextStatus: RequestStatus) {
    if (!selected) {
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("replenishment_requests")
      .update({ status: nextStatus, updated_at: now })
      .eq("id", selected.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const { error: eventError } = await supabase.from("request_status_events").insert({
      request_id: selected.id,
      status: nextStatus,
      message: `Status alterado para ${statusLabels[nextStatus]}`,
      user_id: userData.user?.id ?? null
    });

    if (eventError) {
      setError(eventError.message);
      return;
    }

    const updated = { ...selected, status: nextStatus, updated_at: now };
    setSelected(updated);
    await loadRequests();
    await openRequest(updated);
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[1fr_420px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Reposição</p>
            <h1 className="mt-2 text-3xl font-black text-graphite">Solicitações de Reposição</h1>
          </div>
          <div className="min-w-64">
            <Label className="text-sm font-bold text-graphite">Status</Label>
            <Select onValueChange={(value) => setStatus(value as RequestStatus | "all")} value={status}>
              <SelectTrigger className="mt-2 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_separation">Em separação</SelectItem>
                <SelectItem value="replenished">Reposto</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

        <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-charcoal hover:bg-charcoal">
                {["ID", "Setor", "Criado por", "Prioridade", "Status", "Data"].map((heading) => (
                  <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell className="text-muted" colSpan={6}>Carregando solicitações...</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell className="text-muted" colSpan={6}>Nenhuma solicitação encontrada.</TableCell></TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow
                    className="cursor-pointer hover:bg-ice"
                    key={request.id}
                    onClick={() => void openRequest(request)}
                  >
                    <TableCell className="font-mono text-xs text-graphite">{request.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-muted">{request.sector_id}</TableCell>
                    <TableCell className="text-muted">{request.created_by}</TableCell>
                    <TableCell className="font-bold text-graphite">{request.priority}</TableCell>
                    <TableCell><StatusBadge status={request.status} /></TableCell>
                    <TableCell className="text-muted">{new Date(request.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </section>

      <aside className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-charcoal/10 pb-4">
              <div>
                <p className="font-mono text-xs text-muted">{selected.id}</p>
                <h2 className="mt-2 text-xl font-black text-graphite">Detalhe da solicitação</h2>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              <Info label="Setor" value={selected.sector_id} />
              <Info label="Criado por" value={selected.created_by} />
              <Info label="Prioridade" value={selected.priority} />
              <Info label="Notas" value={selected.notes || "-"} />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Itens</h3>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted">Sem itens registrados.</p>
                ) : (
                  items.map((item) => (
                    <div className="rounded-lg border border-charcoal/10 p-3" key={item.id}>
                      <p className="font-bold text-graphite">{item.product_name}</p>
                      <p className="text-sm text-muted">{item.quantity} {item.unit}</p>
                      {item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Histórico</h3>
              <div className="mt-3 space-y-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted">Sem histórico registrado.</p>
                ) : (
                  events.map((event) => (
                    <div className="border-l-4 border-lime pl-3" key={event.id}>
                      <p className="text-sm font-bold text-graphite">{statusLabels[event.status]}</p>
                      <p className="text-xs text-muted">{new Date(event.created_at).toLocaleString("pt-BR")}</p>
                      {event.message ? <p className="mt-1 text-sm text-muted">{event.message}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {nextStatuses(selected.status).map((nextStatus) => (
                <Button
                  key={nextStatus}
                  onClick={() => void transitionRequest(nextStatus)}
                  type="button"
                  variant={nextStatus === "cancelled" ? "destructive" : "default"}
                >
                  {nextStatus === "cancelled" ? <Ban className="h-4 w-4" /> : nextStatus === "replenished" ? <CheckCircle2 className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                  {nextStatus === "cancelled" ? "Cancelar" : `Avançar para ${statusLabels[nextStatus]}`}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10">
            <h2 className="text-xl font-black text-graphite">Selecione uma solicitação</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Clique em uma linha da tabela para ver itens, histórico e ações de status.
            </p>
          </div>
        )}
      </aside>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-bold text-muted">{label}</span>
      <span className="text-right font-semibold text-graphite">{value}</span>
    </div>
  );
}
