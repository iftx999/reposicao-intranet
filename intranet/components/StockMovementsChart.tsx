"use client";

import { useId, useState } from "react";
import type { DailyTotals } from "@/lib/reports";

const series = [
  { key: "demanda", label: "Demanda", color: "#B6E85F" },
  { key: "baixa", label: "Baixa", color: "#FF5A4F" }
] as const;

const chartWidth = 860;
const chartHeight = 260;
const chartPadding = { top: 22, right: 18, bottom: 44, left: 44 };
const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function formatDayLabel(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${dateValue}T12:00:00`));
}

function formatValue(value: number) {
  return numberFormat.format(value);
}

export function StockMovementsChart({ data }: { data: DailyTotals[] }) {
  const titleId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxValue = Math.max(...data.flatMap((day) => [day.demanda, day.baixa]), 0);
  const activeDay = activeIndex === null ? null : data[activeIndex];
  const slot = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(14, (slot * 0.7) / series.length);

  if (maxValue <= 0) {
    return (
      <div className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Movimentação no tempo</h2>
        <p className="mt-8 text-sm text-muted">Nenhuma movimentação registrada no período.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-muted">Movimentação no tempo</h2>
          <p className="mt-2 text-sm text-muted">Demanda por reposição e baixas manuais, por dia</p>
        </div>
        <div className="flex flex-wrap gap-3" aria-label="Legenda do gráfico">
          {series.map((item) => (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted" key={item.key}>
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-5 overflow-x-auto">
        {activeDay ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10 min-w-48 rounded-[18px] border border-white/[0.08] bg-graphite px-4 py-3 text-xs shadow-panel">
            <p className="font-bold text-white">{formatDayLabel(activeDay.dia)}</p>
            <div className="mt-2 space-y-1 text-muted">
              {series.map((item) => (
                <p className="flex justify-between gap-5" key={item.key}>
                  <span>{item.label}</span>
                  <span className="font-semibold text-ice">{formatValue(activeDay[item.key])}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <svg aria-labelledby={titleId} className="min-w-[760px]" role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <title id={titleId}>Demanda e baixas por dia no período selecionado</title>

          {[Math.ceil(maxValue / 2), maxValue].map((value) => {
            const y = chartPadding.top + plotHeight - (value / maxValue) * plotHeight;
            return (
              <g key={value}>
                <line stroke="#8A919A" strokeOpacity="0.16" x1={chartPadding.left} x2={chartPadding.left + plotWidth} y1={y} y2={y} />
                <text fill="#8A919A" fontSize="11" fontWeight="600" textAnchor="end" x={chartPadding.left - 10} y={y + 4}>
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          <line
            stroke="#8A919A"
            strokeOpacity="0.18"
            x1={chartPadding.left}
            x2={chartPadding.left + plotWidth}
            y1={chartPadding.top + plotHeight}
            y2={chartPadding.top + plotHeight}
          />

          {data.map((day, index) => {
            const groupWidth = barWidth * series.length + 3;
            const baseX = chartPadding.left + index * slot + (slot - groupWidth) / 2;

            return (
              <g
                key={day.dia}
                onBlur={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <rect
                  aria-label={`${formatDayLabel(day.dia)}: demanda ${formatValue(day.demanda)}, baixa ${formatValue(day.baixa)}`}
                  fill="transparent"
                  height={plotHeight + 22}
                  tabIndex={0}
                  width={slot}
                  x={chartPadding.left + index * slot}
                  y={chartPadding.top}
                />
                {series.map((item, seriesIndex) => {
                  const value = day[item.key];
                  if (value <= 0) {
                    return null;
                  }

                  const height = Math.max((value / maxValue) * plotHeight, 1);

                  return (
                    <rect
                      fill={item.color}
                      height={height}
                      key={item.key}
                      rx="3"
                      width={barWidth}
                      x={baseX + seriesIndex * (barWidth + 3)}
                      y={chartPadding.top + plotHeight - height}
                    />
                  );
                })}
              </g>
            );
          })}

          {data.map((day, index) =>
            index % Math.ceil(data.length / 14) === 0 ? (
              <text
                fill="#8A919A"
                fontSize="10"
                fontWeight="600"
                key={day.dia}
                textAnchor="middle"
                x={chartPadding.left + index * slot + slot / 2}
                y={chartPadding.top + plotHeight + 22}
              >
                {formatDayLabel(day.dia)}
              </text>
            ) : null
          )}
        </svg>
      </div>

      <table className="sr-only">
        <caption>Dados equivalentes do gráfico de movimentação</caption>
        <thead>
          <tr>
            <th>Data</th>
            {series.map((item) => (
              <th key={item.key}>{item.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((day) => (
            <tr key={day.dia}>
              <td>{formatDayLabel(day.dia)}</td>
              {series.map((item) => (
                <td key={item.key}>{formatValue(day[item.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
