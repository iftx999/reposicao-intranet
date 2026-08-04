import type { RequestStatus } from "@/lib/types";

export const statusLabels: Record<RequestStatus, string> = {
  pending: "Pendente",
  in_separation: "Em separação",
  replenished: "Reposto",
  cancelled: "Cancelado"
};

export const statusClasses: Record<RequestStatus, string> = {
  pending: "bg-amber/15 text-graphite ring-amber/40",
  in_separation: "bg-soda/15 text-graphite ring-soda/40",
  replenished: "bg-lime/20 text-graphite ring-lime/50",
  cancelled: "bg-coral/15 text-graphite ring-coral/40"
};

export function nextStatuses(status: RequestStatus): RequestStatus[] {
  if (status === "pending") {
    return ["in_separation", "cancelled"];
  }

  if (status === "in_separation") {
    return ["replenished", "cancelled"];
  }

  return [];
}
