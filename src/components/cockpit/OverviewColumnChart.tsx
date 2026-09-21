import type { ChartBar } from "@/services/production-overview.service";

type OverviewColumnChartProps = {
  title: string;
  empty: string;
  bars: ChartBar[];
};

/**
 * Barras verticais — bom para tempo médio por etapa.
 */
export function OverviewColumnChart({
  title,
  empty,
  bars,
}: OverviewColumnChartProps) {
  const hasData = bars.some((b) => b.value > 0);
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <section className="rounded-[14px] border border-dc-border bg-dc-surface px-5 py-5">
      <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      {!hasData ? (
        <p className="mt-3 text-sm text-[var(--ink-2)]">{empty}</p>
      ) : (
        <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">
          {bars.map((bar) => {
            const heightPct = Math.max(
              bar.value > 0 ? 6 : 0,
              (bar.value / max) * 100,
            );
            return (
              <div
                key={bar.key}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <span className="font-mono text-[10px] tabular-nums text-[var(--ink-2)]">
                  {bar.value > 0 ? bar.valueLabel : ""}
                </span>
                <div className="flex h-28 w-full items-end justify-center rounded-t-[8px] bg-[var(--surface-2)]">
                  <div
                    className="w-[70%] max-w-10 rounded-t-[8px] bg-[var(--accent)] transition-[height] duration-300"
                    style={{ height: `${heightPct}%` }}
                    title={`${bar.label}: ${bar.valueLabel}`}
                  />
                </div>
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-[var(--ink)]">
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
