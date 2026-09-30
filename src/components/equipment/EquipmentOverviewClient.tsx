"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OverviewBarChart } from "@/components/cockpit/OverviewBarChart";
import { OverviewDonutChart } from "@/components/cockpit/OverviewDonutChart";
import { OverviewLineChart } from "@/components/cockpit/OverviewLineChart";
import { EquipmentPeriodPicker } from "@/components/equipment/EquipmentPeriodPicker";
import { EquipmentSubnav } from "@/components/equipment/EquipmentSubnav";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { Alert, StatTile } from "@/components/ui";
import { formatBrl } from "@/domain/cockpit/format-dashboard";
import { useEquipmentManagementData } from "@/hooks/useEquipmentManagementData";
import { formatDateTimeBr } from "@/lib/format/date";
import {
  downtimeCategoryLabel,
  formatDurationMinutes,
} from "@/lib/labels/maintenance";
import {
  computeEquipmentMetrics,
  equipmentPeriodPreset,
  type EquipmentPeriod,
} from "@/services/equipment-management.service";

function formatPct(n: number | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function EquipmentOverviewClient() {
  const { data, loading, error } = useEquipmentManagementData();
  const [period, setPeriod] = useState<EquipmentPeriod>(() => equipmentPeriodPreset(30));
  const [periodError, setPeriodError] = useState<string | null>(null);

  const metrics = useMemo(
    () => computeEquipmentMetrics(data, period),
    [data, period],
  );
  const longest = useMemo(
    () =>
      [...metrics.periodDowntimes]
        .sort((a, b) => {
          const da = a.endedAt ? (a.durationMinutes ?? 0) : Number.POSITIVE_INFINITY;
          const db = b.endedAt ? (b.durationMinutes ?? 0) : Number.POSITIVE_INFINITY;
          return db - da;
        })
        .slice(0, 5),
    [metrics.periodDowntimes],
  );

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Equipamentos"
        title="Indicadores"
        description="Disponibilidade, tempo parado, tempo de reparo e cumprimento das preventivas no período."
      />

      <EquipmentSubnav />

      <EquipmentPeriodPicker
        period={period}
        onChange={(next) => {
          setPeriodError(null);
          setPeriod(next);
        }}
        onInvalid={setPeriodError}
      />

      {error || periodError ? (
        <Alert tone="critical">{periodError ?? error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando indicadores…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="Disponibilidade"
              value={formatPct(metrics.availabilityPercent)}
              detail={`Base 24 h/dia · ${metrics.equipmentCount} equipamento(s) ativo(s)`}
              tone={
                metrics.availabilityPercent != null && metrics.availabilityPercent < 90
                  ? "warning"
                  : "ink"
              }
            />
            <StatTile
              label="Tempo parado"
              value={formatDurationMinutes(metrics.downtimeMinutes)}
              detail={`${metrics.downtimeCount} parada(s) · ${metrics.openDowntimes} em aberto agora`}
            />
            <StatTile
              label="Tempo médio de reparo (MTTR)"
              value={formatDurationMinutes(metrics.mttrMinutes)}
              detail="Média das paradas encerradas no período"
            />
            <StatTile
              label="Preventivas no prazo"
              value={formatPct(metrics.preventiveCompliancePercent)}
              detail={
                metrics.preventiveDue > 0
                  ? `${metrics.preventiveOnTime} de ${metrics.preventiveDue} previstas até hoje`
                  : "Nenhuma preventiva prevista no período"
              }
              tone={
                metrics.preventiveCompliancePercent != null &&
                metrics.preventiveCompliancePercent < 80
                  ? "warning"
                  : "ink"
              }
            />
            <StatTile
              label="Manutenções concluídas"
              value={metrics.maintenanceCompleted}
              detail={`Custo registrado: ${formatBrl(metrics.maintenanceCost)}`}
            />
            <StatTile
              label="Atrasadas agora"
              value={metrics.overdueCount}
              detail={`${metrics.inProgressCount} em execução · ${metrics.upcoming7d} nos próximos 7 dias`}
              tone={metrics.overdueCount > 0 ? "critical" : "ink"}
            />
          </div>

          <OverviewLineChart
            title="Tempo parado por dia (min)"
            empty="Nenhuma parada no período."
            series={[
              {
                id: "downtime",
                label: "Tempo parado",
                color: "var(--critical)",
                points: metrics.downtimeByDay,
              },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewBarChart
              title="Tempo parado por categoria"
              empty="Nenhuma parada no período."
              bars={metrics.downtimeByCategory}
            />
            <OverviewBarChart
              title="Tempo parado por equipamento"
              empty="Nenhuma parada no período."
              bars={metrics.downtimeByEquipment}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewDonutChart
              title="Manutenções concluídas por tipo"
              empty="Nenhuma manutenção concluída no período."
              slices={metrics.maintenanceByType}
            />
            <section className="rounded-[14px] border border-dc-border bg-dc-surface px-5 py-5">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
                Maiores paradas do período
              </h2>
              {longest.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--ink-2)]">Nenhuma parada no período.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--border)]">
                  {longest.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ink)]">
                          <Link
                            href={`/app/equipment/${encodeURIComponent(d.equipmentId)}`}
                            className="font-mono hover:text-[var(--accent-strong)]"
                          >
                            {d.equipmentCode}
                          </Link>{" "}
                          · {downtimeCategoryLabel(d.category)}
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {formatDateTimeBr(d.startedAt)}
                          {d.reason ? ` · ${d.reason}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[var(--ink)]">
                        {d.endedAt ? formatDurationMinutes(d.durationMinutes) : "em aberto"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
