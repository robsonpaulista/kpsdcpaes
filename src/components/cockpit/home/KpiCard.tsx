"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Sparkline } from "@/components/cockpit/home/Sparkline";
import type { DashboardKpi } from "@/domain/cockpit/dashboard-types";
import { formatBrl, formatPercent } from "@/domain/cockpit/format-dashboard";
import { useCountUp } from "@/hooks/useCountUp";
import {
  severitySoftBgClass,
  severityTextClass,
} from "@/lib/severity/getSeverity";

function formatKpiAnimated(
  kpi: DashboardKpi,
  animated: number | null,
): string {
  if (animated == null || kpi.valueRaw == null) return kpi.value ?? "—";
  if (kpi.id === "losses") return formatBrl(Math.round(animated));
  if (kpi.id === "efficiency" || kpi.id === "adherence") {
    return formatPercent(Math.round(animated), 0);
  }
  if (kpi.id === "production-today") {
    return `${Math.round(animated).toLocaleString("pt-BR")} un.`;
  }
  return Math.round(animated).toLocaleString("pt-BR");
}

export function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const empty = kpi.value == null;
  const sparkPlayed = useRef(false);
  const animateSpark = !sparkPlayed.current;

  useEffect(() => {
    sparkPlayed.current = true;
  }, []);

  const animated = useCountUp(empty ? null : kpi.valueRaw, {
    enabled: !empty,
  });

  return (
    <Link
      href={kpi.href}
      className="dc-panel dc-panel-interactive block px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dc-text-muted">
          {kpi.label}
        </p>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums ${severitySoftBgClass(kpi.deltaTone)}`}
        >
          {kpi.deltaLabel}
        </span>
      </div>

      <p
        className={`mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-tight tabular-nums ${
          empty
            ? "text-dc-text-muted"
            : severityTextClass(
                kpi.severity === "neutral" ? "neutral" : kpi.severity,
              )
        }`}
      >
        {empty ? "—" : formatKpiAnimated(kpi, animated)}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-dc-text-secondary">
        {empty && kpi.emptyHint ? kpi.emptyHint : kpi.metaLabel}
      </p>

      <div className="mt-2.5">
        <Sparkline
          data={kpi.sparkline}
          severity={kpi.severity}
          animateOnMount={animateSpark}
        />
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-dc-text-muted">
          <span>{kpi.sparkFooterLeft}</span>
          <span className="font-mono tabular-nums">{kpi.sparkFooterRight}</span>
        </div>
      </div>
    </Link>
  );
}
