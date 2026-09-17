"use client";

/**
 * Trilha de meta — posição do valor vs meta (sem gráfico decorativo).
 * lowerIsBetter: marcador à direita = pior.
 */
export function MetricTrack({
  value,
  meta,
  direction = "lowerIsBetter",
  severity,
}: {
  value: number | null;
  meta: number | null;
  direction?: "lowerIsBetter" | "higherIsBetter";
  severity: "good" | "warning" | "critical" | "neutral";
}) {
  if (value == null || meta == null || meta <= 0) {
    return (
      <div className="h-1 w-full rounded-full bg-[var(--border)]" aria-hidden />
    );
  }

  const ratio =
    direction === "lowerIsBetter"
      ? Math.min(1, value / (meta * 2))
      : Math.min(1, value / Math.max(meta * 1.2, 1));
  const metaPct =
    direction === "lowerIsBetter"
      ? Math.min(100, (meta / (meta * 2)) * 100)
      : Math.min(100, (meta / Math.max(meta * 1.2, 1)) * 100);

  const fill =
    severity === "critical"
      ? "bg-[var(--critical)]"
      : severity === "warning"
        ? "bg-[var(--warning)]"
        : severity === "good"
          ? "bg-[var(--good)]"
          : "bg-[var(--muted)]";

  return (
    <div className="relative h-1 w-full rounded-full bg-[var(--border)]" aria-hidden>
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${fill}`}
        style={{ width: `${Math.max(4, ratio * 100)}%` }}
      />
      <span
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--ink)] bg-[var(--surface)]"
        style={{ left: `${metaPct}%` }}
        title="Meta"
      />
    </div>
  );
}
