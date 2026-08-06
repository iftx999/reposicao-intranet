"use client";

import { useId, useMemo, useState } from "react";
import { statusLabels } from "@/lib/status";
import type { RequestStatus } from "@/lib/types";

export type RequestsChartDay = {
  date: string;
  counts: Record<RequestStatus, number>;
};

const statusOrder: RequestStatus[] = ["pending", "in_separation", "replenished", "cancelled"];

const statusColors: Record<RequestStatus, string> = {
  pending: "#F6B44B",
  in_separation: "#48A9F8",
  replenished: "#B6E85F",
  cancelled: "#FF5A4F"
};

const chartWidth = 860;
const chartHeight = 300;
const chartPadding = { top: 22, right: 18, bottom: 44, left: 44 };
const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
const segmentGap = 2;

function formatDayLabel(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${dateValue}T12:00:00`));
}

function topRoundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height);
  const bottom = y + height;
  const right = x + width;

  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + safeRadius}`,
    `Q ${x} ${y} ${x + safeRadius} ${y}`,
    `L ${right - safeRadius} ${y}`,
    `Q ${right} ${y} ${right} ${y + safeRadius}`,
    `L ${right} ${bottom}`,
    "Z"
  ].join(" ");
}

export function RequestsChart({ data }: { data: RequestsChartDay[] }) {
  const titleId = useId();
  const descriptionId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totals = useMemo(() => data.map((day) => statusOrder.reduce((sum, status) => sum + day.counts[status], 0)), [data]);
  const maxTotal = Math.max(...totals, 0);
  const hasData = maxTotal > 0;
  const activeDay = activeIndex === null ? null : data[activeIndex];
  const activeTotal = activeIndex === null ? 0 : totals[activeIndex];
  const gridValues = maxTotal <= 1 ? [1] : [Math.ceil(maxTotal / 2), maxTotal];
  const barSlot = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(30, barSlot * 0.48);

  if (!hasData) {
    return (
      <div className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Solicitações no tempo</h2>
            <p className="mt-2 text-sm text-muted">Últimos 14 dias</p>
          </div>
        </div>
        <p className="mt-8 text-sm text-muted">Nenhuma solicitação registrada nos últimos 14 dias.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Solicitações no tempo</h2>
          <p className="mt-2 text-sm text-muted">Últimos 14 dias, por status</p>
        </div>
        <div className="flex flex-wrap gap-3" aria-label="Legenda do gráfico">
          {statusOrder.map((status) => (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted" key={status}>
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: statusColors[status] }} />
              <span>{statusLabels[status]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-5 overflow-x-auto">
        {activeDay ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10 min-w-48 rounded-[18px] border border-white/[0.08] bg-graphite px-4 py-3 text-xs shadow-panel">
            <p className="font-bold text-white">{formatDayLabel(activeDay.date)}</p>
            <div className="mt-2 space-y-1 text-muted">
              {statusOrder.map((status) => (
                <p className="flex justify-between gap-5" key={status}>
                  <span>{statusLabels[status]}</span>
                  <span className="font-semibold text-ice">{activeDay.counts[status]}</span>
                </p>
              ))}
            </div>
            <p className="mt-2 flex justify-between gap-5 border-t border-white/[0.08] pt-2 font-bold text-white">
              <span>Total</span>
              <span>{activeTotal}</span>
            </p>
          </div>
        ) : null}

        <svg
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="min-w-[760px]"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <title id={titleId}>Solicitações nos últimos 14 dias</title>
          <desc id={descriptionId}>
            Gráfico de barras empilhadas com uma barra por dia e segmentos fixos para pendente, em separação, reposto e cancelado.
          </desc>

          {gridValues.map((value) => {
            const y = chartPadding.top + plotHeight - (value / maxTotal) * plotHeight;
            return (
              <g key={value}>
                <line
                  stroke="#8A919A"
                  strokeOpacity="0.16"
                  x1={chartPadding.left}
                  x2={chartPadding.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text fill="#8A919A" fontSize="11" fontWeight="600" textAnchor="end" x={chartPadding.left - 10} y={y + 4}>
                  {value}
                </text>
              </g>
            );
          })}

          <line
            stroke="#8A919A"
            strokeOpacity="0.18"
            x1={chartPadding.left}
            x2={chartPadding.left}
            y1={chartPadding.top}
            y2={chartPadding.top + plotHeight}
          />
          <line
            stroke="#8A919A"
            strokeOpacity="0.18"
            x1={chartPadding.left}
            x2={chartPadding.left + plotWidth}
            y1={chartPadding.top + plotHeight}
            y2={chartPadding.top + plotHeight}
          />

          {data.map((day, index) => {
            const total = totals[index];
            const x = chartPadding.left + index * barSlot + (barSlot - barWidth) / 2;
            let cursorY = chartPadding.top + plotHeight;
            const nonZeroStatuses = statusOrder.filter((status) => day.counts[status] > 0);
            const topStatus = nonZeroStatuses[nonZeroStatuses.length - 1];

            return (
              <g
                key={day.date}
                onBlur={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <rect
                  aria-label={`${formatDayLabel(day.date)}: ${total} solicitações`}
                  fill="transparent"
                  height={plotHeight + 22}
                  tabIndex={0}
                  width={barSlot}
                  x={chartPadding.left + index * barSlot}
                  y={chartPadding.top}
                />
                {statusOrder.map((status) => {
                  const count = day.counts[status];
                  if (count === 0) {
                    return null;
                  }

                  const rawHeight = (count / maxTotal) * plotHeight;
                  const height = Math.max(rawHeight - (status === topStatus ? 0 : segmentGap), 1);
                  const y = cursorY - rawHeight;
                  cursorY = y;

                  return status === topStatus ? (
                    <path d={topRoundedRectPath(x, y, barWidth, height, 4)} fill={statusColors[status]} key={status} />
                  ) : (
                    <rect fill={statusColors[status]} height={height} key={status} width={barWidth} x={x} y={y + segmentGap} />
                  );
                })}
                <text fill="#8A919A" fontSize="10" fontWeight="600" textAnchor="middle" x={x + barWidth / 2} y={chartPadding.top + plotHeight + 22}>
                  {formatDayLabel(day.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <table className="sr-only">
        <caption>Dados equivalentes do gráfico de solicitações nos últimos 14 dias</caption>
        <thead>
          <tr>
            <th>Data</th>
            {statusOrder.map((status) => (
              <th key={status}>{statusLabels[status]}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((day, index) => (
            <tr key={day.date}>
              <td>{formatDayLabel(day.date)}</td>
              {statusOrder.map((status) => (
                <td key={status}>{day.counts[status]}</td>
              ))}
              <td>{totals[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
