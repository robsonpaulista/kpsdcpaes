import type { ChartBar } from "@/services/production-overview.service";

const SLICE_COLORS = ["var(--accent)", "var(--warning)", "var(--good)", "var(--muted)"];

type OverviewDonutChartProps = {
  title: string;
  empty: string;
  slices: ChartBar[];
};

/**
 * Donut — distribuição proporcional (ex.: produção por turno).
 */
export function OverviewDonutChart({
  title,
  empty,
  slices,
}: OverviewDonutChartProps) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const hasData = total > 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const arcs = slices.map((slice, i) => {
    const len = total > 0 ? (slice.value / total) * c : 0;
    const dashoffset = -offset;
    offset += len;
    return {
      ...slice,
      color: SLICE_COLORS[i % SLICE_COLORS.length]!,
      dasharray: `${len} ${c - len}`,
      dashoffset,
    };
  });

  return (
    <section className="rounded-[14px] border border-dc-border bg-dc-surface px-5 py-5">
      <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      {!hasData ? (
        <p className="mt-3 text-sm text-[var(--ink-2)]">{empty}</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="14"
              />
              {arcs.map((arc) =>
                arc.value > 0 ? (
                  <circle
                    key={arc.key}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="14"
                    strokeDasharray={arc.dasharray}
                    strokeDashoffset={arc.dashoffset}
                    strokeLinecap="butt"
                  />
                ) : null,
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-lg font-semibold tabular-nums text-[var(--ink)]">
                {total.toLocaleString("pt-BR")}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                un.
              </p>
            </div>
          </div>
          <ul className="w-full min-w-0 space-y-2.5">
            {arcs.map((arc) => (
              <li
                key={arc.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-2 truncate font-medium text-[var(--ink)]">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: arc.color }}
                  />
                  {arc.label}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--ink-2)]">
                  {arc.valueLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
