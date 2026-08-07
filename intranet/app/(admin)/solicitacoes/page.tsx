"use client";

import { Ban, CheckCircle2, ChevronsRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nextStatuses, statusLabels } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { ReplenishmentRequest, ReplenishmentRequestItem, RequestStatus, RequestStatusEvent } from "@/lib/types";

const fieldClassName =
  "mt-2 h-auto w-full rounded-full border border-white/10 bg-graphite px-4 py-2.5 text-sm text-ice outline-none placeholder:text-subtle transition focus-visible:border-soda/60 focus-visible:ring-2 focus-visible:ring-soda/25";

const selectContentClassName =
  "rounded-[28px] border border-white/[0.08] bg-charcoal p-2 text-ice shadow-dialog ring-0";

const selectItemClassName = "rounded-full px-3 py-2 text-sm text-ice focus:bg-white/10 focus:text-white";

const primaryButtonClassName =
  "h-auto rounded-full bg-lime px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)] transition hover:brightness-95 active:scale-[0.98]";

const dangerButtonClassName =
  "h-auto rounded-full bg-coral px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(255,90,79,0.18)] transition hover:brightness-95 active:scale-[0.98]";

const badgeClassName = "h-auto px-2.5 py-1 text-[11px] font-semibold";

const requestGridTemplateColumns =
  "minmax(110px,0.8fr) minmax(150px,1fr) minmax(170px,1.1fr) minmax(110px,0.8fr) minmax(130px,0.9fr) minmax(170px,1fr)";

const requestColumnLabels = ["ID", "Setor", "Criado por", "Prioridade", "Status", "Data"];
const validStatusFilters: RequestStatus[] = ["pending", "in_separation", "replenished", "cancelled"];

const statusBadgeVariants: Record<RequestStatus, "success" | "warning" | "destructive"> = {
  pending: "warning",
  in_separation: "success",
  replenished: "success",
  cancelled: "destructive"
};

const statusBadgeClassNames: Record<RequestStatus, string> = {
  pending: "bg-amber/15 text-amber ring-amber/35",
  in_separation: "bg-soda/15 text-soda ring-soda/35",
  replenished: "bg-lime/15 text-lime ring-lime/35",
  cancelled: "bg-coral/15 text-coral ring-coral/40"
};

const priorityBadgeClassNames: Record<string, string> = {
  alta: "bg-coral/15 text-coral ring-coral/40",
  urgente: "bg-coral/15 text-coral ring-coral/40",
  media: "bg-amber/15 text-amber ring-amber/35",
  média: "bg-amber/15 text-amber ring-amber/35",
  normal: "bg-amber/15 text-amber ring-amber/35",
  baixa: "bg-white/[0.06] text-muted ring-white/10"
};

export default function SolicitacoesPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [requests, setRequests] = useState<ReplenishmentRequest[]>([]);
  const [items, setItems] = useState<ReplenishmentRequestItem[]>([]);
  const [events, setEvents] = useState<RequestStatusEvent[]>([]);
  const [selected, setSelected] = useState<ReplenishmentRequest | null>(null);
  const [status, setStatus] = useState<RequestStatus | "all">(
    validStatusFilters.includes(initialStatus as RequestStatus) ? (initialStatus as RequestStatus) : "all"
  );
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
    <main className="mx-auto grid min-h-screen max-w-7xl gap-6 bg-graphite px-6 py-8 xl:grid-cols-[1fr_420px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Reposição</p>
            <h1 className="mt-2 text-3xl font-black text-white">Solicitações de Reposição</h1>
          </div>
          <div className="min-w-64">
            <Label className="text-sm font-bold text-muted">Status</Label>
            <Select onValueChange={(value) => setStatus(value as RequestStatus | "all")} value={status}>
              <SelectTrigger className={fieldClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                <SelectItem className={selectItemClassName} value="all">Todos</SelectItem>
                <SelectItem className={selectItemClassName} value="pending">Pendente</SelectItem>
                <SelectItem className={selectItemClassName} value="in_separation">Em separação</SelectItem>
                <SelectItem className={selectItemClassName} value="replenished">Reposto</SelectItem>
                <SelectItem className={selectItemClassName} value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-[28px] border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
            {error}
          </p>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-charcoal shadow-panel">
          <div
            className="hidden border-b border-white/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:items-center md:gap-4"
            style={{ gridTemplateColumns: requestGridTemplateColumns }}
          >
            {requestColumnLabels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          {loading ? (
            <p className="px-5 py-4 text-sm text-muted">Carregando solicitações...</p>
          ) : requests.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Nenhuma solicitação encontrada.</p>
          ) : (
            requests.map((request) => (
              <RequestListRow key={request.id} onOpen={() => void openRequest(request)} request={request} />
            ))
          )}
        </section>
      </section>

      <aside className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <p className="font-mono text-xs text-muted">{selected.id}</p>
                <h2 className="mt-2 text-xl font-black text-white">Detalhe da solicitação</h2>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              <Info label="Setor" value={selected.sector_id} />
              <Info label="Criado por" value={selected.created_by || "-"} />
              <InfoBadge label="Prioridade">
                <PriorityPill priority={selected.priority} />
              </InfoBadge>
              <Info label="Notas" value={selected.notes || "-"} />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Itens</h3>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted">Sem itens registrados.</p>
                ) : (
                  items.map((item) => (
                    <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-3" key={item.id}>
                      <p className="font-bold text-white">{item.product_name}</p>
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
                      <p className="text-sm font-bold text-white">{statusLabels[event.status]}</p>
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
                  className={nextStatus === "cancelled" ? dangerButtonClassName : primaryButtonClassName}
                  key={nextStatus}
                  onClick={() => void transitionRequest(nextStatus)}
                  type="button"
                >
                  {nextStatus === "cancelled" ? <Ban className="h-4 w-4" /> : nextStatus === "replenished" ? <CheckCircle2 className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                  {nextStatus === "cancelled" ? "Cancelar" : `Avançar para ${statusLabels[nextStatus]}`}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10">
            <h2 className="text-xl font-black text-white">Selecione uma solicitação</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Clique em uma linha da lista para ver itens, histórico e ações de status.
            </p>
          </div>
        )}
      </aside>
    </main>
  );
}

function RequestListRow({ onOpen, request }: { onOpen: () => void; request: ReplenishmentRequest }) {
  return (
    <button
      className="block w-full cursor-pointer border-b border-white/[0.06] px-5 py-4 text-left transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      onClick={onOpen}
      style={{ gridTemplateColumns: requestGridTemplateColumns }}
      type="button"
    >
      <div className="min-w-0">
        <span className="block truncate font-mono text-xs text-muted">{request.id.slice(0, 8)}</span>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">ID</span>
      </div>
      <RequestTextCell label="Setor" value={request.sector_id} />
      <RequestTextCell label="Criado por" value={request.created_by || "-"} />
      <RequestBadgeCell label="Prioridade">
        <PriorityPill priority={request.priority} />
      </RequestBadgeCell>
      <RequestBadgeCell label="Status">
        <StatusPill status={request.status} />
      </RequestBadgeCell>
      <RequestTextCell label="Data" value={new Date(request.created_at).toLocaleString("pt-BR")} />
    </button>
  );
}

function RequestTextCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 flex min-w-0 items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      <span className="truncate text-sm text-muted">{value}</span>
    </div>
  );
}

function RequestBadgeCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  return (
    <Badge className={`${badgeClassName} ${statusBadgeClassNames[status]}`} variant={statusBadgeVariants[status]}>
      {statusLabels[status]}
    </Badge>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const normalizedPriority = priority.toLowerCase();
  const priorityClassName = priorityBadgeClassNames[normalizedPriority] || priorityBadgeClassNames.baixa;

  return (
    <Badge className={`${badgeClassName} ${priorityClassName}`} variant="neutral">
      {priority}
    </Badge>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-bold text-muted">{label}</span>
      <span className="text-right font-semibold text-ice">{value}</span>
    </div>
  );
}

function InfoBadge({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-bold text-muted">{label}</span>
      {children}
    </div>
  );
}
