"use client";

import { useCallback, useEffect, useState } from "react";
import { OverviewBarChart } from "@/components/cockpit/OverviewBarChart";
import { OverviewColumnChart } from "@/components/cockpit/OverviewColumnChart";
import { OverviewDonutChart } from "@/components/cockpit/OverviewDonutChart";
import { OverviewLineChart } from "@/components/cockpit/OverviewLineChart";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  StatTile,
} from "@/components/ui";
import { formatBrl } from "@/domain/cockpit/format-dashboard";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDateBr } from "@/lib/format/date";
import {
  defaultOverviewPeriod,
  formatMinutes,
  getProductionOverviewMetrics,
  overviewPeriodPreset,
  type ProductionOverviewMetrics,
  type ProductionOverviewPeriod,
} from "@/services/production-overview.service";

function formatUnits(n: number): string {
  return `${n.toLocaleString("pt-BR")} un.`;
}

function formatPct(n: number | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/**
 * Produção · Visão Geral — KPIs e gráficos do período selecionado.
 */
export function ProductionOverviewClient() {
  const [period, setPeriod] = useState<ProductionOverviewPeriod>(
    defaultOverviewPeriod,
  );
  const [draft, setDraft] = useState<ProductionOverviewPeriod>(
    defaultOverviewPeriod,
  );
  const [metrics, setMetrics] = useState<ProductionOverviewMetrics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        if (!isFirebaseConfigured()) {
          throw new Error("Firebase não configurado.");
        }
        const db = getFirestoreDb();
        const data = await getProductionOverviewMetrics(db, period);
        setMetrics(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao carregar visão geral",
        );
        if (!opts?.silent) setMetrics(null);
      } finally {
        setLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  function applyPeriod(next: ProductionOverviewPeriod) {
    setDraft(next);
    setPeriod(next);
  }

  function applyDraft() {
    const next = {
      dateFrom: draft.dateFrom || period.dateFrom,
      dateTo: draft.dateTo || draft.dateFrom || period.dateTo,
    };
    if (next.dateFrom > next.dateTo) {
      setError("A data inicial não pode ser depois da final.");
      return;
    }
    setPeriod(next);
  }

  const periodLabel =
    period.dateFrom === period.dateTo
      ? formatDateBr(period.dateFrom)
      : `${formatDateBr(period.dateFrom)} – ${formatDateBr(period.dateTo)}`;

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Produção"
        title="Visão Geral"
        description="Produção, aderência, eficiência, tempos e perdas no período selecionado."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/app/cockpit/production" variant="secondary" size="sm">
              Ao vivo →
            </Button>
            <Button href="/app/quality/losses" variant="secondary" size="sm">
              Perdas →
            </Button>
          </div>
        }
      />

      <section
        className="rounded-[14px] border border-dc-border bg-dc-surface p-4 sm:p-5"
        aria-label="Período"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
              Período
            </h2>
            <p className="mt-0.5 text-xs text-dc-text-secondary">
              Analisando {periodLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyPeriod(overviewPeriodPreset(1))}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyPeriod(overviewPeriodPreset(7))}
            >
              7 dias
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyPeriod(overviewPeriodPreset(30))}
            >
              30 dias
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
            De
            <Input
              type="date"
              className="mt-1.5"
              value={draft.dateFrom}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
            Até
            <Input
              type="date"
              className="mt-1.5"
              value={draft.dateTo}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </label>
          <div className="flex items-end">
            <Button type="button" size="sm" onClick={applyDraft}>
              Aplicar
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert tone="critical">{error}</Alert> : null}

      {loading && !metrics ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando indicadores…</p>
      ) : !metrics ? (
        <EmptyState
          title="Sem dados para o período"
          detail="Ajuste as datas ou aguarde apontamentos no chão."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Produção"
              value={loading ? "…" : formatUnits(metrics.realizedUnits)}
              detail={
                loading
                  ? undefined
                  : `${metrics.completedLots} lote${metrics.completedLots === 1 ? "" : "s"} finalizado${metrics.completedLots === 1 ? "" : "s"}`
              }
            />
            <StatTile
              label="Programado × realizado"
              value={
                loading
                  ? "…"
                  : metrics.adherencePercent == null
                    ? "Sem plano"
                    : formatPct(metrics.adherencePercent)
              }
              detail={
                loading
                  ? undefined
                  : metrics.plannedUnits > 0
                    ? `${formatUnits(metrics.realizedUnits)} de ${formatUnits(metrics.plannedUnits)} programadas`
                    : "Nenhuma OP programada no período"
              }
              tone={
                metrics.adherencePercent == null
                  ? "neutral"
                  : metrics.adherencePercent >= 95
                    ? "good"
                    : metrics.adherencePercent >= 80
                      ? "warning"
                      : "critical"
              }
            />
            <StatTile
              label="Eficiência global (no prazo)"
              value={
                loading
                  ? "…"
                  : metrics.onTimePercent != null
                    ? formatPct(metrics.onTimePercent)
                    : "—"
              }
              detail={
                loading
                  ? undefined
                  : metrics.onTimePercent != null
                    ? `${metrics.timedSteps} etapa(s) com timing no período`
                    : "Sem timing suficiente no período"
              }
            />
            <StatTile
              label="Rendimento (saída − perda)"
              value={loading ? "…" : formatPct(metrics.yieldPercent)}
              detail={
                loading
                  ? undefined
                  : `${formatUnits(metrics.lossUnits)} perdidas · ${formatBrl(metrics.lossBrl)}`
              }
              tone={metrics.lossUnits > 0 ? "warning" : "ink"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              label="Tempo médio do lote"
              value={
                loading
                  ? "…"
                  : metrics.avgLotMinutes != null
                    ? formatMinutes(metrics.avgLotMinutes)
                    : "—"
              }
              detail={
                loading
                  ? undefined
                  : metrics.lotsWithDuration > 0
                    ? `Com base em ${metrics.lotsWithDuration} lote(s) concluído(s)`
                    : "Sem lotes concluídos com duração no período"
              }
            />
            <StatTile
              label="Tempo médio da OP"
              value={
                loading
                  ? "…"
                  : metrics.avgOrderMinutes != null
                    ? formatMinutes(metrics.avgOrderMinutes)
                    : "—"
              }
              detail={
                loading
                  ? undefined
                  : metrics.ordersWithDuration > 0
                    ? `Com base em ${metrics.ordersWithDuration} OP(s) com lote(s) finalizado(s)`
                    : "Sem OPs com duração no período"
              }
            />
          </div>

          <div className="grid gap-4">
            <OverviewLineChart
              title="Produção e perdas por data"
              empty="Sem saídas ou perdas no período."
              series={[
                {
                  id: "production",
                  label: "Produção",
                  color: "var(--accent)",
                  points: metrics.productionByDay,
                },
                {
                  id: "loss",
                  label: "Perdas",
                  color: "var(--critical)",
                  points: metrics.lossByDay,
                },
              ]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewBarChart
              title="Onde se perde mais (etapa)"
              empty="Nenhuma perda apontada neste período."
              bars={metrics.lossByStep}
            />
            <OverviewBarChart
              title="Produção por produto"
              empty="Nenhuma saída de embalagem neste período."
              bars={metrics.productionByProduct}
              hideZeros
            />
            <OverviewColumnChart
              title="Tempo médio por etapa"
              empty="Sem etapas concluídas com duração neste período."
              bars={metrics.avgMinutesByStep}
            />
            <OverviewDonutChart
              title="Produção por turno"
              empty="Nenhuma saída de embalagem neste período."
              slices={metrics.productionByShift}
            />
          </div>
        </>
      )}
    </div>
  );
}
