"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { formatMinutesLabel } from "@/lib/labels/timing";
import { equipmentStatusLabel } from "@/lib/labels/equipment";
import { QaCycleStrip } from "@/components/shared/QaCycleStrip";
import {
  getCockpitMetrics,
  type AttentionItem,
  type AttentionKind,
  type BottleneckInsight,
  type CockpitMetrics,
  type CompletedLotSummary,
  type EquipmentInsight,
  type FlowStepSummary,
  type IntegrationAlert,
  type LossDetailSummary,
  type OrderInsight,
  type ProductionLotSummary,
  type QualityInsight,
} from "@/services/cockpit-metrics.service";
import type { TimingStatus } from "@/types/production";

function kindLabel(kind: AttentionKind): string {
  switch (kind) {
    case "LATE":
      return "ATRASO";
    case "ATTENTION":
      return "TEMPO";
    case "QUALITY_LOSS":
      return "PERDA";
    case "PENDING_MAPPING":
      return "MAPEAR";
    case "BLOCKED":
      return "BLOQUEIO";
    default:
      return kind;
  }
}

function kindClass(kind: AttentionKind): string {
  switch (kind) {
    case "LATE":
    case "BLOCKED":
      return "bg-danger-soft text-danger";
    case "ATTENTION":
    case "QUALITY_LOSS":
    case "PENDING_MAPPING":
      return "bg-warning-soft text-warning";
    default:
      return "bg-dc-surface-secondary text-dc-text-secondary";
  }
}

function timingBadgeClass(timing: TimingStatus | null, label: string): string {
  if (label === "BLOQUEADO" || timing === "LATE") {
    return "bg-danger-soft text-danger";
  }
  if (timing === "ATTENTION") return "bg-warning-soft text-warning";
  if (timing === "ON_TIME") return "bg-success-soft text-success";
  return "bg-dc-surface-secondary text-dc-text-secondary";
}

export function CockpitHomeClient() {
  const [metrics, setMetrics] = useState<CockpitMetrics | null>(null);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [productionLots, setProductionLots] = useState<ProductionLotSummary[]>(
    [],
  );
  const [losses, setLosses] = useState<LossDetailSummary[]>([]);
  const [completedToday, setCompletedToday] = useState<CompletedLotSummary[]>(
    [],
  );
  const [flow, setFlow] = useState<FlowStepSummary[]>([]);
  const [equipment, setEquipment] = useState<EquipmentInsight[]>([]);
  const [quality, setQuality] = useState<QualityInsight[]>([]);
  const [orderInsights, setOrderInsights] = useState<OrderInsight[]>([]);
  const [integrationAlert, setIntegrationAlert] =
    useState<IntegrationAlert | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottleneckInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const result = await getCockpitMetrics(db);
      setMetrics(result.metrics);
      setAttention(result.attention);
      setProductionLots(result.productionLots);
      setCompletedToday(result.completedToday);
      setFlow(result.flow);
      setEquipment(result.equipment);
      setQuality(result.quality);
      setOrderInsights(result.orders);
      setIntegrationAlert(result.integrationAlert);
      setLosses(result.losses);
      setBottlenecks(result.bottlenecks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) {
        setMetrics(null);
        setAttention([]);
        setProductionLots([]);
        setCompletedToday([]);
        setFlow([]);
        setEquipment([]);
        setQuality([]);
        setOrderInsights([]);
        setIntegrationAlert(null);
        setLosses([]);
        setBottlenecks([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const live = useFactoryLiveReload(load);

  const cards = metrics
    ? [
        {
          label: "Situação agora",
          value: metrics.situationLabel,
          hint: metrics.situationHint,
          tabular: false,
        },
        {
          label: "Lotes em produção",
          value: String(metrics.activeLots),
          hint: `${metrics.runningLots} em andamento · ${metrics.readyLots} aguardando início`,
          tabular: true,
        },
        {
          label: "Tempo da etapa",
          value:
            metrics.lateCount > 0
              ? `${metrics.lateCount} atrasado${metrics.lateCount === 1 ? "" : "s"}`
              : metrics.attentionCount > 0
                ? `${metrics.attentionCount} em atenção`
                : metrics.onTimeCount > 0
                  ? "No prazo"
                  : "—",
          hint:
            metrics.lateCount > 0 && metrics.attentionCount > 0
              ? `+ ${metrics.attentionCount} próximo(s) do limite`
              : metrics.lateCount > 0
                ? "Fora do tempo padrão da etapa"
                : metrics.attentionCount > 0
                  ? "Próximo do limite da etapa"
                  : metrics.onTimeCount > 0
                    ? `${metrics.onTimeCount} lote(s) cronometrando dentro do padrão`
                    : "Nenhum lote cronometrando agora",
          tabular: false,
        },
        {
          label: "Aderência",
          value:
            metrics.adherencePercent != null
              ? `${metrics.adherencePercent.toLocaleString("pt-BR")}%`
              : "—",
          hint:
            metrics.plannedUnitsToday > 0
              ? `${metrics.realizedUnitsToday.toLocaleString("pt-BR")} / ${metrics.plannedUnitsToday.toLocaleString("pt-BR")} un. · ${metrics.periodLabel}`
              : `Sem OP com data ${metrics.periodLabel.toLowerCase()}`,
          tabular: true,
        },
        {
          label: "Perdas",
          value: `${metrics.totalLossUnits.toLocaleString("pt-BR")} un.`,
          hint:
            metrics.pendingLossSignals > 0
              ? `${metrics.pendingLossSignals} sem ocorrência em Qualidade`
              : "Acumulado das etapas apontadas",
          tabular: true,
        },
      ]
    : [];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="dc-eyebrow">Pulso operacional</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-dc-text">
            Central de Produção
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-dc-text-secondary">
            O que está acontecendo agora — atrasos, filas e aderência do dia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Ao vivo
            </span>
          ) : null}
          <Link
            href="/app/cockpit/production"
            className="dc-btn-secondary h-10 px-4 text-sm"
          >
            Produção ao vivo
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="h-10 rounded-[12px] px-3 text-sm font-medium text-dc-text-secondary transition hover:text-dc-text"
          >
            Atualizar
          </button>
        </div>
      </div>

      <QaCycleStrip />

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <>
          {integrationAlert ? (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-[14px] border p-4 ${
                integrationAlert.severity === "ERROR"
                  ? "border-danger/40 bg-danger/10"
                  : "border-warning/40 bg-warning/10"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      integrationAlert.severity === "ERROR"
                        ? "bg-danger/20 text-danger"
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    {integrationAlert.statusLabel}
                  </span>
                  <p className="text-sm font-semibold text-dc-text">
                    {integrationAlert.title}
                  </p>
                </div>
                <p className="mt-1 text-xs text-dc-text-secondary">
                  {integrationAlert.message}
                </p>
                <p className="mt-1 text-[11px] text-dc-text-muted">
                  Produções já internalizadas continuam funcionando.
                </p>
              </div>
              <Link
                href={integrationAlert.href}
                className="shrink-0 text-sm font-semibold text-dc-orange"
              >
                Analisar →
              </Link>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="dc-panel p-4 transition hover:shadow-dc-md"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
                  {card.label}
                </p>
                <p
                  className={`mt-3 tracking-tight text-dc-text ${
                    card.tabular
                      ? "dc-metric"
                      : "text-lg font-semibold leading-snug"
                  }`}
                >
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-snug text-dc-text-secondary">
                  {card.hint}
                </p>
              </div>
            ))}
          </div>

          <div className="dc-panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-dc-text">
                  Ordens de produção
                </h2>
                <p className="mt-1 text-xs text-dc-text-muted">
                  {metrics?.ordersReceivedToday ?? 0} com data{" "}
                  {metrics?.periodLabel?.toLowerCase() ?? "hoje"} ·{" "}
                  {metrics?.ordersInProduction ?? 0} em produção ·{" "}
                  {metrics?.completedOrdersToday ?? 0} concluída(s) hoje
                  {(metrics?.pendingMappingOrders ?? 0) > 0
                    ? ` · ${metrics!.pendingMappingOrders} aguardando configuração`
                    : ""}
                  {(metrics?.ordersOutdated ?? 0) > 0
                    ? ` · ${metrics!.ordersOutdated} com alteração na origem`
                    : ""}
                </p>
              </div>
              <Link href="/app/pcp" className="text-sm font-medium text-dc-orange">
                Abrir PCP →
              </Link>
            </div>

            {orderInsights.length === 0 ? (
              <p className="mt-3 text-sm text-dc-text-secondary">
                Nenhuma OP pendente de ação. Integração não precisa dominar a
                home quando saudável.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {orderInsights.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            item.kind === "PENDING_MAPPING" ||
                            item.kind === "OUTDATED"
                              ? "bg-warning/15 text-warning"
                              : item.kind === "WAITING_RELEASE"
                                ? "bg-dc-orange/15 text-dc-orange"
                                : "bg-dc-surface-secondary text-dc-text-secondary"
                          }`}
                        >
                          {item.kindLabel}
                        </span>
                        <p className="text-sm font-semibold tabular-nums text-dc-text">
                          {item.orderNumber}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-dc-text-secondary">
                        {item.productName}
                      </p>
                    </div>
                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-dc-orange"
                    >
                      Abrir →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-dc-text">
                  Produção · {metrics?.periodLabel ?? "HOJE"}
                </h2>
                <p className="mt-1 text-xs text-dc-text-muted">
                  Planejado = OPs com data de hoje · Realizado = saída da
                  embalagem concluída hoje (sem comparação inventada com ontem).
                </p>
              </div>
              <p className="text-xs text-dc-text-secondary">
                {metrics?.completedLotsToday ?? 0} lote(s) concluído(s)
                {(metrics?.completedOrdersToday ?? 0) > 0
                  ? ` · ${metrics!.completedOrdersToday} OP(s)`
                  : ""}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <p className="text-sm text-dc-text-secondary">
                Planejado{" "}
                <strong className="tabular-nums text-dc-text">
                  {(metrics?.plannedUnitsToday ?? 0).toLocaleString("pt-BR")}
                </strong>
              </p>
              <p className="text-sm text-dc-text-secondary">
                Realizado{" "}
                <strong className="tabular-nums text-dc-text">
                  {(metrics?.realizedUnitsToday ?? 0).toLocaleString("pt-BR")}
                </strong>
              </p>
              <p className="text-sm text-dc-text-secondary">
                Aderência{" "}
                <strong className="tabular-nums text-dc-text">
                  {metrics?.adherencePercent != null
                    ? `${metrics.adherencePercent.toLocaleString("pt-BR")}%`
                    : "—"}
                </strong>
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-dc-surface-secondary">
              <div
                className="h-full rounded-full bg-dc-orange transition-[width]"
                style={{
                  width: `${Math.min(
                    100,
                    metrics?.adherencePercent != null
                      ? metrics.adherencePercent
                      : 0,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-dc-text">
                Fluxo ao vivo
              </h2>
              <Link
                href="/app/cockpit/production"
                className="text-sm font-medium text-dc-orange"
              >
                Kanban →
              </Link>
            </div>
            <p className="mt-1 text-xs text-dc-text-muted">
              Lotes ativos por etapa agora.
            </p>
            {flow.every((f) => f.count === 0) ? (
              <p className="mt-3 text-sm text-dc-text-secondary">
                Nenhum lote no fluxo.
              </p>
            ) : (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {flow.map((step, index) => (
                  <div key={step.stepType} className="flex items-center gap-2">
                    <div
                      className={`min-w-[7.5rem] rounded-xl border px-3 py-2 ${
                        step.lateCount > 0
                          ? "border-danger/40 bg-danger/5"
                          : step.attentionCount > 0
                            ? "border-warning/40 bg-warning/5"
                            : step.count > 0
                              ? "border-dc-orange/30 bg-dc-orange/5"
                              : "border-dc-border bg-dc-bg"
                      }`}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-dc-text-muted">
                        {step.stepLabel}
                      </p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-dc-text">
                        {step.count}
                      </p>
                      {step.lateCount > 0 || step.attentionCount > 0 ? (
                        <p className="mt-0.5 text-[10px] text-dc-text-secondary">
                          {step.lateCount > 0
                            ? `${step.lateCount} atraso`
                            : null}
                          {step.lateCount > 0 && step.attentionCount > 0
                            ? " · "
                            : null}
                          {step.attentionCount > 0
                            ? `${step.attentionCount} aten.`
                            : null}
                        </p>
                      ) : null}
                    </div>
                    {index < flow.length - 1 ? (
                      <span className="shrink-0 text-dc-text-muted">→</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dc-text">
                  Atenção Agora
                </h2>
                <span className="tabular-nums text-xs text-dc-text-muted">
                  {attention.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-dc-text-muted">
                Só alertas que pedem ação.
              </p>

              {attention.length === 0 ? (
                <p className="mt-3 text-sm text-dc-text-secondary">
                  Nada crítico no momento.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {attention.slice(0, 12).map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindClass(item.kind)}`}
                          >
                            {kindLabel(item.kind)}
                          </span>
                          <p className="text-sm font-semibold tabular-nums text-dc-text">
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-dc-text-secondary">
                          {item.subtitle}
                        </p>
                      </div>
                      <Link
                        href={item.href}
                        className="text-xs font-semibold text-dc-orange"
                      >
                        {item.actionLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dc-text">
                  Em produção
                </h2>
                <Link
                  href="/app/floor"
                  className="text-sm font-medium text-dc-orange"
                >
                  Chão →
                </Link>
              </div>
              <p className="mt-1 text-xs text-dc-text-muted">
                Todos os lotes contados no indicador.
              </p>

              {productionLots.length === 0 ? (
                <p className="mt-3 text-sm text-dc-text-secondary">
                  Nenhum lote em produção.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {productionLots.map((lot) => (
                    <li
                      key={lot.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dc-text">
                          {lot.productName}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-dc-text-secondary">
                          {lot.lotCode} · {lot.stepLabel} · {lot.stepStatusLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${timingBadgeClass(lot.timing, lot.timingLabel)}`}
                        >
                          {lot.timingLabel}
                        </span>
                        <Link
                          href={lot.href}
                          className="text-xs font-semibold text-dc-orange"
                        >
                          Ver →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dc-text">Gargalos</h2>
                <Link
                  href="/app/cockpit/production"
                  className="text-sm font-medium text-dc-orange"
                >
                  Por etapa →
                </Link>
              </div>
              <p className="mt-1 text-xs text-dc-text-muted">
                Pressão = fila + atraso agora + espera média apontada.
              </p>

              {bottlenecks.every((b) => b.pressureScore === 0) ? (
                <p className="mt-3 text-sm text-dc-text-secondary">
                  Sem pressão aparente. Execute etapas para acumular espera/processo.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {bottlenecks
                    .filter((b) => b.pressureScore > 0)
                    .slice(0, 5)
                    .map((b, index) => (
                      <li
                        key={b.stepType}
                        className="flex flex-wrap items-start justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-dc-text">
                            {index === 0 ? "▲ " : ""}
                            {b.stepLabel}
                            <span className="ml-2 text-xs font-normal text-dc-text-muted">
                              {b.stationLabel}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-dc-text-secondary">
                            Fila {b.queueReady} pronta · {b.queueRunning} em
                            andamento
                            {b.lateNow > 0
                              ? ` · ${b.lateNow} atrasada(s)`
                              : ""}
                          </p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-dc-text-muted">
                            Espera méd.{" "}
                            {formatMinutesLabel(
                              b.avgWaitingMinutes ?? undefined,
                            )}{" "}
                            · Processo méd.{" "}
                            {formatMinutesLabel(
                              b.avgProcessMinutes ?? undefined,
                            )}{" "}
                            · Meta {formatMinutesLabel(b.standardMinutes)}
                            {b.completedSamples > 0
                              ? ` · ${b.completedSamples} amostra(s)`
                              : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dc-text">
                  Equipamentos
                </h2>
                <Link
                  href="/app/equipment"
                  className="text-sm font-medium text-dc-orange"
                >
                  Ver todos →
                </Link>
              </div>
              <p className="mt-1 text-xs text-dc-text-muted">
                {metrics?.equipmentOperating ?? 0} operando ·{" "}
                {metrics?.equipmentAvailable ?? 0} disponíveis ·{" "}
                {metrics?.equipmentStopped ?? 0} parados/indisponíveis
              </p>
              <p className="mt-0.5 text-[11px] text-dc-text-muted">
                Status derivado do Floor (sem % de disponibilidade inventada).
              </p>

              {equipment.length === 0 ? (
                <p className="mt-3 text-sm text-dc-text-secondary">
                  Nenhum equipamento.{" "}
                  <Link
                    href="/app/settings/equipment"
                    className="font-medium text-dc-orange"
                  >
                    Semear catálogo →
                  </Link>
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {equipment.slice(0, 8).map((eq) => (
                    <li
                      key={eq.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums text-dc-text">
                          <Link
                            href={`/app/equipment/${encodeURIComponent(eq.id)}`}
                            className="text-dc-orange hover:underline"
                          >
                            {eq.code}
                          </Link>{" "}
                          <span className="font-medium text-dc-text-secondary">
                            {eq.name}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-dc-text-muted">
                          {eq.typeLabel}
                          {eq.lotCode ? ` · ${eq.lotCode}` : ""}
                          {eq.remainingLabel
                            ? ` · ${eq.remainingLabel} restantes`
                            : ""}
                          {eq.stoppedLabel
                            ? ` · parado há ${eq.stoppedLabel}`
                            : ""}
                          {eq.stopReason ? ` · ${eq.stopReason}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            eq.displayStatus === "OPERATING"
                              ? "bg-dc-orange/15 text-dc-orange"
                              : eq.displayStatus === "AVAILABLE"
                                ? "bg-success/15 text-success"
                                : "bg-danger/15 text-danger"
                          }`}
                        >
                          {equipmentStatusLabel(eq.displayStatus)}
                        </span>
                        {eq.lotHref ? (
                          <Link
                            href={eq.lotHref}
                            className="text-xs font-semibold text-dc-orange"
                          >
                            Lote →
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dc-text">Qualidade</h2>
                <Link
                  href="/app/quality"
                  className="text-sm font-medium text-dc-orange"
                >
                  Abrir →
                </Link>
              </div>
              <p className="mt-1 text-xs text-dc-text-muted">
                {metrics?.openQualityIncidents ?? 0} ocorrência(s) aberta(s) ·{" "}
                {metrics?.qualityIncidentsToday ?? 0} registrada(s) hoje ·{" "}
                {metrics?.pendingLossSignals ?? 0} perda(s) sem ocorrência ·{" "}
                {metrics?.blockedLots ?? 0} lote(s) bloqueado(s)
              </p>
              <p className="mt-0.5 text-[11px] text-dc-text-muted">
                Sem rejeição/retrabalho inventados — só o que já é apontado.
              </p>

              {quality.length === 0 &&
              (metrics?.pendingLossSignals ?? 0) === 0 &&
              (metrics?.blockedLots ?? 0) === 0 ? (
                <p className="mt-3 text-sm text-dc-text-secondary">
                  Nenhuma pendência de qualidade agora.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(metrics?.pendingLossSignals ?? 0) > 0 ? (
                    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0">
                      <div>
                        <p className="text-sm font-semibold text-dc-text">
                          Perdas sem ocorrência
                        </p>
                        <p className="mt-0.5 text-xs text-dc-text-secondary">
                          {metrics!.pendingLossSignals} apontamento(s) na fila
                        </p>
                      </div>
                      <Link
                        href="/app/quality"
                        className="text-xs font-semibold text-dc-orange"
                      >
                        Registrar →
                      </Link>
                    </li>
                  ) : null}
                  {quality.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.blocksLot ? (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-danger/15 text-danger">
                              BLOQUEIO
                            </span>
                          ) : (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-warning/15 text-warning">
                              ABERTA
                            </span>
                          )}
                          <p className="text-sm font-semibold tabular-nums text-dc-text">
                            {item.lotCode}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-dc-text-secondary">
                          {item.productName}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-dc-text-muted">
                          {item.description}
                        </p>
                      </div>
                      <Link
                        href={item.href}
                        className="text-xs font-semibold text-dc-orange"
                      >
                        Ver →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[14px] border border-success/25 bg-success/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dc-text">
                  Concluídas hoje
                </h2>
                <Link
                  href="/app/pcp?tab=completed"
                  className="text-sm font-medium text-dc-orange"
                >
                  Ver no PCP →
                </Link>
              </div>
              <p className="mt-1 text-xs text-dc-text-muted">
                Lotes que saíram da linha ·{" "}
                {metrics?.completedOrdersToday ?? 0} OP(s) fechada(s).
              </p>

              {completedToday.length === 0 ? (
                <p className="mt-3 text-sm text-dc-text-secondary">
                  Nenhuma conclusão hoje ainda.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {completedToday.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-success/20 pt-3 first:border-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dc-text">
                          {item.productName}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-dc-text-secondary">
                          {item.lotCode} · OP {item.orderNumber}
                        </p>
                        <p className="mt-0.5 text-[11px] text-dc-text-muted">
                          {new Date(item.completedAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={item.lotHref}
                          className="text-xs font-semibold text-dc-orange"
                        >
                          Lote →
                        </Link>
                        <Link
                          href={item.orderHref}
                          className="text-xs font-semibold text-dc-orange"
                        >
                          OP →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-dc-text">Perdas</h2>
              <Link
                href="/app/quality"
                className="text-sm font-medium text-dc-orange"
              >
                Qualidade →
              </Link>
            </div>
            <p className="mt-1 text-xs text-dc-text-muted">
              Total {metrics?.totalLossUnits.toLocaleString("pt-BR") ?? 0} un. ·
              lote e estação onde foi apontada.
            </p>

            {losses.length === 0 ? (
              <p className="mt-3 text-sm text-dc-text-secondary">
                Nenhuma perda apontada ainda.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {losses.map((loss) => (
                  <li
                    key={loss.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-dc-border pt-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dc-text">
                        {loss.productName}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-dc-text-secondary">
                        {loss.lotCode} · {loss.stationLabel} · {loss.stepLabel}
                      </p>
                      <p className="mt-0.5 text-[11px] text-dc-text-muted">
                        Motivo: {loss.lossReason ?? "Não informado"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-dc-text-muted">
                        {new Date(loss.finishedAt).toLocaleString("pt-BR")}
                        {loss.pendingOccurrence
                          ? " · sem ocorrência"
                          : " · com ocorrência"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-dc-text">
                        {loss.lossQuantity.toLocaleString("pt-BR")} un.
                      </span>
                      <Link
                        href={
                          loss.pendingOccurrence
                            ? loss.qualityHref
                            : loss.href
                        }
                        className="text-xs font-semibold text-dc-orange"
                      >
                        {loss.pendingOccurrence ? "Registrar →" : "Ver →"}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
