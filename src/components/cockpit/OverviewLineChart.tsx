"use client";

import { useEffect, useRef, useState } from "react";
import type { ChartPoint } from "@/services/production-overview.service";

type Series = {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
};

type OverviewLineChartProps = {
  title: string;
  empty: string;
  /** Uma ou duas séries alinhadas pelas mesmas keys/labels. */
  series: Series[];
};

/**
 * Gráfico de linhas — ocupa toda a largura disponível da seção.
 */
export function OverviewLineChart({
  title,
  empty,
  series,
}: OverviewLineChartProps) {
  const primary = series[0];
  const labels = primary?.points.map((p) => p.label) ?? [];
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const hasData = allValues.some((v) => v > 0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const next = Math.max(280, Math.floor(el.clientWidth));
      setWidth(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const h = 200;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 32;
  const max = Math.max(1, ...allValues);
  const n = Math.max(1, labels.length);
  const plotW = Math.max(1, width - padL - padR);

  function xAt(i: number): number {
    if (n <= 1) return padL + plotW / 2;
    return padL + (i / (n - 1)) * plotW;
  }

  function yAt(v: number): number {
    return padT + (1 - v / max) * (h - padT - padB);
  }

  function pathFor(points: ChartPoint[]): string {
    return points
      .map((p, i) => {
        const cmd = i === 0 ? "M" : "L";
        return `${cmd}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`;
      })
      .join(" ");
  }

  const tickEvery = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(width / 80))));

  return (
    <section className="rounded-[14px] border border-dc-border bg-dc-surface px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        {series.length > 1 ? (
          <ul className="flex flex-wrap gap-3 text-[11px] text-[var(--ink-2)]">
            {series.map((s) => (
              <li key={s.id} className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {!hasData ? (
        <p className="mt-3 text-sm text-[var(--ink-2)]">{empty}</p>
      ) : (
        <div ref={wrapRef} className="mt-3 w-full">
          <svg
            width="100%"
            height={h}
            viewBox={`0 0 ${width} ${h}`}
            preserveAspectRatio="none"
            className="block w-full"
            role="img"
            aria-label={title}
          >
            {[0.25, 0.5, 0.75, 1].map((t) => {
              const y = yAt(max * t);
              return (
                <line
                  key={t}
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
              );
            })}
            <text
              x={4}
              y={padT + 4}
              className="fill-[var(--muted)] text-[10px]"
            >
              {Math.round(max).toLocaleString("pt-BR")}
            </text>
            {series.map((s) => (
              <g key={s.id}>
                <path
                  d={pathFor(s.points)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {s.points.map((p, i) => (
                  <circle
                    key={`${s.id}-${p.key}`}
                    cx={xAt(i)}
                    cy={yAt(p.value)}
                    r="3"
                    fill={s.color}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            ))}
            {labels.map((label, i) =>
              i % tickEvery === 0 || i === n - 1 ? (
                <text
                  key={`${label}-${i}`}
                  x={xAt(i)}
                  y={h - 8}
                  textAnchor="middle"
                  className="fill-[var(--muted)] text-[9px]"
                >
                  {label}
                </text>
              ) : null,
            )}
          </svg>
        </div>
      )}
    </section>
  );
}
