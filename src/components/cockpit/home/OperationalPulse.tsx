"use client";

import Link from "next/link";
import { MetricTrack } from "@/components/cockpit/home/MetricTrack";
import type { DashboardKpi } from "@/domain/cockpit/dashboard-types";
import { formatBrl, formatPercent } from "@/domain/cockpit/format-dashboard";
import { useCountUp } from "@/hooks/useCountUp";
import {
  severitySoftBgClass,
  severityTextClass,
} from "@/lib/severity/getSeverity";

function formatPulseValue(kpi: DashboardKpi, animated: number | null): string {
  if (kpi.value == null) return "";
  if (animated == null || kpi.valueRaw == null) return kpi.value;
  if (kpi.id === "losses") return formatBrl(Math.round(animated));
  if (kpi.id === "efficiency" || kpi.id === "adherence") {
    return formatPercent(Math.round(animated), 0);
  }
  if (kpi.id === "production-today") {
    return `${Math.round(animated).toLocaleString("pt-BR")} un.`;
  }
  return Math.round(animated).toLocaleString("pt-BR");
}

function PulseCell({ kpi }: { kpi: DashboardKpi }) {
  const empty = kpi.value == null;
  const animated = useCountUp(empty ? null : kpi.valueRaw, {
    enabled: !empty,
  });

  const direction =
    kpi.id === "losses"
      ? ("lowerIsBetter" as const)
      : ("higherIsBetter" as const);

  return (
    <div className="min-w-0 flex-1 px-4 py-4 first:pl-5 last:pr-5 sm:px-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
          {kpi.pulseLabel ?? kpi.label}
        </p>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${severitySoftBgClass(kpi.deltaTone)}`}
        >
          {kpi.deltaLabel}
        </span>
      </div>

      {empty ? (
        <>
          <p className="mt-2 text-sm font-semibold tracking-tight text-dc-text">
            {kpi.id === "efficiency"
              ? "Aguardando apontamento"
              : kpi.id === "adherence"
                ? "Não calculada"
                : "Sem dado"}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-dc-text-secondary">
            {kpi.emptyHint ?? kpi.metaLabel}
          </p>
          {kpi.emptyCtaLabel ? (
            <Link
              href={kpi.href}
              className="dc-link mt-2 inline-block text-[11px] font-semibold"
            >
              {kpi.emptyCtaLabel}
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <p
            className={`mt-2 font-mono text-[1.65rem] font-semibold leading-none tracking-tight tabular-nums ${severityTextClass(
              kpi.severity === "neutral" ? "neutral" : kpi.severity,
            )}`}
          >
            {formatPulseValue(kpi, animated)}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-dc-text-secondary">
            {kpi.metaLabel}
          </p>
          <div className="mt-3">
            <MetricTrack
              value={kpi.valueRaw}
              meta={kpi.metaRaw}
              direction={direction}
              severity={kpi.severity}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function OperationalPulse({
  kpis,
  shiftLabel,
}: {
  kpis: DashboardKpi[];
  shiftLabel: string;
}) {
  return (
    <section aria-label="Pulso operacional">
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
            Pulso operacional
          </h2>
          <p className="mt-0.5 text-xs text-dc-text-secondary">
            {shiftLabel} · Atualização em tempo real
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-dc-border bg-[var(--surface)]">
        <div className="grid grid-cols-1 divide-y divide-dc-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <PulseCell key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>
    </section>
  );
}
