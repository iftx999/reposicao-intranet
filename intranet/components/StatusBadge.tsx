import type { RequestStatus } from "@/lib/types";
import { statusClasses, statusLabels } from "@/lib/status";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
