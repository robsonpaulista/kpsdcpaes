import type { ChartBar } from "@/services/production-overview.service";

type OverviewBarChartProps = {
  title: string;
  empty: string;
  bars: ChartBar[];
  /** Se true, esconde barras com valor 0 (útil em produto). */
  hideZeros?: boolean;
};

/**
 * Gráfico de barras horizontais para Visão Geral · Produção.
 */
export function OverviewBarChart({
  title,
  empty,
  bars,
  hideZeros = false,
}: OverviewBarChartProps) {
  const visible = hideZeros ? bars.filter((b) => b.value > 0) : bars;

  return (
    <section className="rounded-[14px] border border-dc-border bg-dc-surface px-5 py-5">
      <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--ink-2)]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {visible.map((bar) => (
            <li key={bar.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-[var(--ink)]">
                  {bar.label}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--ink-2)]">
                  {bar.valueLabel}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                  style={{
                    width: `${Math.max(bar.value > 0 ? 4 : 0, Math.min(100, bar.sharePercent))}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
