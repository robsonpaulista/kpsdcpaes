import {
  DEFAULT_ADHERENCE_TARGET_PERCENT,
  DEFAULT_DAILY_LOSS_TARGET_BRL,
  DEFAULT_EFFICIENCY_TARGET_PERCENT,
  PROVISIONAL_LOSS_UNIT_BRL,
  type DashboardKpi,
} from "@/domain/cockpit/dashboard-types";
import {
  formatBrl,
  formatPercent,
  percentDelta,
  ppDelta,
} from "@/domain/cockpit/format-dashboard";
import { getSeverity, type Severity } from "@/lib/severity/getSeverity";
import type { CockpitTrendSeries } from "@/services/cockpit-metrics.service";

function formatUnits(value: number): string {
  return `${value.toLocaleString("pt-BR")} un.`;
}

export type KpiBuildInput = {
  /** % lotes no prazo entre os que têm timing — proxy até OEE real (shiftMetrics). */
  onTimePercent: number | null;
  lossUnitsToday: number;
  adherencePercent: number | null;
  plannedUnitsToday: number;
  /** Qtde produzida hoje (saída de embalagem concluída). */
  realizedUnitsToday: number;
  /** Lotes finalizados hoje. */
  completedLotsToday: number;
  trends: CockpitTrendSeries;
};

function sparkEnds(
  series: number[],
  format: (n: number) => string,
): string {
  if (series.every((n) => n === 0)) return "indisponível";
  const first = series.find((n) => n !== 0) ?? series[0] ?? 0;
  const last = series[series.length - 1] ?? 0;
  return `${format(first)} → ${format(last)}`;
}

export function buildDashboardKpis(input: KpiBuildInput): DashboardKpi[] {
  const lossBrl = Math.round(input.lossUnitsToday * PROVISIONAL_LOSS_UNIT_BRL);
  const lossMeta = DEFAULT_DAILY_LOSS_TARGET_BRL;
  const effMeta = DEFAULT_EFFICIENCY_TARGET_PERCENT;
  const adhMeta = DEFAULT_ADHERENCE_TARGET_PERCENT;

  const effSeverity = getSeverity(input.onTimePercent, effMeta, "higherIsBetter");
  const lossSeverity = getSeverity(lossBrl, lossMeta, "lowerIsBetter");
  const adhSeverity =
    input.plannedUnitsToday <= 0
      ? ("neutral" as Severity)
      : getSeverity(input.adherencePercent, adhMeta, "higherIsBetter");
  const productionSeverity =
    input.plannedUnitsToday > 0
      ? getSeverity(
          input.realizedUnitsToday,
          input.plannedUnitsToday,
          "higherIsBetter",
        )
      : input.realizedUnitsToday > 0
        ? ("good" as Severity)
        : ("neutral" as Severity);

  const effDelta =
    input.onTimePercent != null ? ppDelta(input.onTimePercent, effMeta) : null;
  const lossTrendPrev =
    input.trends.lossBrl.length >= 2
      ? input.trends.lossBrl[input.trends.lossBrl.length - 2]
      : lossMeta;
  const lossDeltaPct = percentDelta(lossBrl, lossTrendPrev || lossMeta);

  const productionSpark = [
    0,
    0,
    0,
    0,
    0,
    0,
    input.realizedUnitsToday,
  ];

  const kpis: DashboardKpi[] = [
    {
      id: "production-today",
      label: "Produção do dia",
      pulseLabel: "Produção do dia",
      value: formatUnits(input.realizedUnitsToday),
      valueRaw: input.realizedUnitsToday,
      metaLabel:
        input.plannedUnitsToday > 0
          ? `Meta: ${formatUnits(input.plannedUnitsToday)} · ${input.completedLotsToday} lote${input.completedLotsToday === 1 ? "" : "s"} finalizado${input.completedLotsToday === 1 ? "" : "s"}`
          : `${input.completedLotsToday} lote${input.completedLotsToday === 1 ? "" : "s"} finalizado${input.completedLotsToday === 1 ? "" : "s"}`,
      metaRaw: input.plannedUnitsToday > 0 ? input.plannedUnitsToday : null,
      severity: productionSeverity,
      deltaLabel:
        input.plannedUnitsToday > 0
          ? `${Math.min(100, Math.round((input.realizedUnitsToday / input.plannedUnitsToday) * 100))}% da meta`
          : input.realizedUnitsToday > 0
            ? "produzido"
            : "sem saída",
      deltaTone: productionSeverity,
      sparkline: productionSpark,
      sparkFooterLeft: "hoje",
      sparkFooterRight: formatUnits(input.realizedUnitsToday),
      href: "/app/cockpit/production/history",
    },
    {
      id: "adherence",
      label: "Programado X realizado",
      pulseLabel: "Programado X realizado",
      value:
        input.plannedUnitsToday <= 0 || input.adherencePercent == null
          ? null
          : formatPercent(input.adherencePercent, 0),
      valueRaw:
        input.plannedUnitsToday <= 0 ? null : input.adherencePercent,
      metaLabel:
        input.plannedUnitsToday <= 0
          ? "Plano de produção ainda não cadastrado."
          : `${formatUnits(input.realizedUnitsToday)} de ${formatUnits(input.plannedUnitsToday)} programadas · meta ${formatPercent(adhMeta)}`,
      metaRaw: input.plannedUnitsToday <= 0 ? null : input.plannedUnitsToday,
      severity: adhSeverity,
      deltaLabel: input.plannedUnitsToday <= 0 ? "não calculada" : "plano",
      deltaTone: "neutral",
      sparkline: input.trends.adherencePercent,
      sparkFooterLeft: "7 dias",
      sparkFooterRight:
        input.plannedUnitsToday <= 0
          ? "indisponível"
          : sparkEnds(input.trends.adherencePercent, (n) =>
              formatPercent(n, 0),
            ),
      href: "/app/pcp",
      emptyHint: "Plano de produção ainda não cadastrado.",
      emptyCtaLabel: "Cadastrar plano →",
    },
    {
      id: "efficiency",
      label: "Eficiência global (no prazo)",
      pulseLabel: "Eficiência global",
      value:
        input.onTimePercent != null
          ? formatPercent(input.onTimePercent)
          : null,
      valueRaw: input.onTimePercent,
      metaLabel: `Meta do dia: ${formatPercent(effMeta)}`,
      metaRaw: effMeta,
      severity: effSeverity,
      deltaLabel:
        effDelta == null
          ? "aguardando"
          : `${effDelta < 0 ? "▼" : "▲"} ${Math.abs(effDelta)}pp`,
      deltaTone: effDelta == null ? "neutral" : effSeverity,
      sparkline: input.trends.efficiencyPercent,
      sparkFooterLeft: "7 dias",
      sparkFooterRight: sparkEnds(input.trends.efficiencyPercent, (n) =>
        formatPercent(n),
      ),
      href: "/app/cockpit/production",
      emptyHint:
        "Nenhum lote possui tempo suficiente para calcular eficiência.",
      emptyCtaLabel: "Ver produção →",
    },
    {
      id: "losses",
      label: "Perdas hoje",
      pulseLabel: "Perdas hoje",
      value: formatBrl(lossBrl),
      valueRaw: lossBrl,
      metaLabel: `Meta do dia: ${formatBrl(lossMeta)}`,
      metaRaw: lossMeta,
      severity: lossSeverity,
      deltaLabel:
        lossDeltaPct == null
          ? "—"
          : `${lossDeltaPct < 0 ? "▼" : "▲"} ${Math.abs(lossDeltaPct)}%`,
      deltaTone: lossDeltaPct == null ? "neutral" : lossSeverity,
      sparkline: input.trends.lossBrl,
      sparkFooterLeft: "7 dias",
      sparkFooterRight: sparkEnds(input.trends.lossBrl, formatBrl),
      href: "/app/quality/losses",
    },
  ];

  return kpis;
}
