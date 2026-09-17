/**
 * Severidade central do Cockpit — usada no veredito, KPIs e decisões.
 * Nunca duplicar thresholds nos componentes.
 */

export type Severity = "good" | "warning" | "critical" | "neutral";

export type SeverityDirection = "higherIsBetter" | "lowerIsBetter";

/**
 * Compara valor × meta.
 * - higherIsBetter: good ≥ meta; warning ≥ meta×warnRatio; senão critical
 * - lowerIsBetter: good ≤ meta; critical ≥ meta×critMult; senão warning
 */
export function getSeverity(
  value: number | null | undefined,
  meta: number | null | undefined,
  direction: SeverityDirection = "higherIsBetter",
  opts?: {
    /** Fração da meta ainda aceitável como warning (higherIsBetter). Default 0.85 */
    warnRatio?: number;
    /** Múltiplo da meta que vira critical (lowerIsBetter). Default 2 */
    criticalMultiple?: number;
  },
): Severity {
  if (value == null || Number.isNaN(value) || meta == null || Number.isNaN(meta)) {
    return "neutral";
  }

  const warnRatio = opts?.warnRatio ?? 0.85;
  const criticalMultiple = opts?.criticalMultiple ?? 2;

  if (direction === "lowerIsBetter") {
    if (meta === 0) {
      if (value <= 0) return "good";
      if (value >= 1) return "critical";
      return "warning";
    }
    if (value <= meta) return "good";
    if (value >= meta * criticalMultiple) return "critical";
    return "warning";
  }

  // higherIsBetter
  if (meta <= 0) {
    return value > 0 ? "good" : "neutral";
  }
  if (value >= meta) return "good";
  if (value >= meta * warnRatio) return "warning";
  return "critical";
}

/** Rótulo textual — severidade nunca é só cor. */
export function severityLabel(severity: Severity): string {
  switch (severity) {
    case "good":
      return "BOM";
    case "warning":
      return "ATENÇÃO";
    case "critical":
      return "CRÍTICO";
    default:
      return "SEM DADO";
  }
}

export function severityTextClass(severity: Severity): string {
  switch (severity) {
    case "good":
      return "text-success";
    case "warning":
      return "text-warning";
    case "critical":
      return "text-danger";
    default:
      return "text-dc-text-muted";
  }
}

export function severitySoftBgClass(severity: Severity): string {
  switch (severity) {
    case "good":
      return "bg-success-soft text-success";
    case "warning":
      return "bg-warning-soft text-warning";
    case "critical":
      return "bg-danger-soft text-danger";
    default:
      return "bg-dc-surface-secondary text-dc-text-muted";
  }
}

export function severityStripeClass(severity: Severity): string {
  switch (severity) {
    case "good":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "critical":
      return "bg-danger";
    default:
      return "bg-dc-text-muted/40";
  }
}

export function severityBorderClass(severity: Severity): string {
  switch (severity) {
    case "good":
      return "border-success/35 bg-success/[0.06]";
    case "warning":
      return "border-warning/35 bg-warning/[0.07]";
    case "critical":
      return "border-danger/35 bg-danger/[0.06]";
    default:
      return "border-dc-border bg-dc-surface";
  }
}
