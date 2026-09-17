"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  SegmentedControl,
  StatTile,
  StatusBadge,
  equipmentStatusTone,
} from "@/components/ui";
import { getStepDefinition, stepTypeLabel } from "@/domain/production/process-route";
import { getStation } from "@/domain/production/stations";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  equipmentStatusLabel,
  equipmentTypeLabel,
} from "@/lib/labels/equipment";
import {
  formatDurationClock,
  remainingMs,
  timingToneClass,
} from "@/lib/labels/timing";
import { buildProductMaps } from "@/lib/products/product-maps";
import { listOpenStepRuns } from "@/repositories/execution.repository";
import { listEquipment } from "@/repositories/equipment.repository";
import { listActiveLots } from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import {
  releaseEquipment,
  stopEquipment,
} from "@/services/equipment-ops.service";
import { computeTimingStatus } from "@/services/workflow.service";
import type { Equipment } from "@/types/equipment";
import type { StepType, TimingStatus } from "@/types/production";

type Filter = "all" | "operating" | "stopped" | "available";

type EquipmentRun = {
  lotId: string;
  lotCode: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  plannedQuantity: number | null;
  stepType: StepType;
  stepLabel: string;
  orderNumber: string | null;
  startedAt: string | null;
  expectedFinishAt: string | null;
  timing: TimingStatus | null;
};

function stoppedMinutes(stoppedAt?: string): number | null {
  if (!stoppedAt) return null;
  return Math.max(
    0,
    Math.round((Date.now() - new Date(stoppedAt).getTime()) / 60_000),
  );
}

function formatUnits(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR")} un.`;
}

/**
 * Visão operacional Doc 02 §67 — status do chão, não cadastro.
 */
export function EquipmentOpsClient() {
  const { can } = useFactoryRole();
  const canManage = can("manageEquipment");
  const [items, setItems] = useState<Equipment[]>([]);
  const [runByEquipment, setRunByEquipment] = useState<
    Record<string, EquipmentRun>
  >({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stopReasonDraft, setStopReasonDraft] = useState<
    Record<string, string>
  >({});
  const [tick, setTick] = useState(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [equipment, steps, lots, products, orders] = await Promise.all([
        listEquipment(db),
        listOpenStepRuns(db),
        listActiveLots(db),
        listProducts(db),
        listProductionOrders(db),
      ]);
      setItems(equipment.filter((e) => e.active));

      const maps = buildProductMaps(products);
      const lotById = new Map(lots.map((l) => [l.id, l]));
      const orderById = new Map(orders.map((o) => [o.id, o]));

      const runs: Record<string, EquipmentRun> = {};
      for (const step of steps) {
        if (step.status !== "IN_PROGRESS" || !step.equipmentId) continue;
        const lot = lotById.get(step.lotId);
        if (!lot) continue;
        const order = orderById.get(lot.productionOrderId);
        const timing =
          step.startedAt && step.expectedFinishAt
            ? computeTimingStatus(
                step.startedAt,
                step.expectedFinishAt,
                step.toleranceMinutes ??
                  getStepDefinition(step.stepType, lot.processRoute)
                    ?.lateToleranceMinutes ??
                  0,
              )
            : null;

        runs[step.equipmentId] = {
          lotId: lot.id,
          lotCode: lot.lotCode,
          productId: lot.productId,
          productName: maps.names[lot.productId] ?? lot.productId,
          imageUrl: maps.images[lot.productId] ?? null,
          plannedQuantity: lot.plannedQuantity ?? null,
          stepType: step.stepType,
          stepLabel: stepTypeLabel(step.stepType),
          orderNumber: order?.externalOrderNumber ?? null,
          startedAt: step.startedAt ?? null,
          expectedFinishAt: step.expectedFinishAt ?? null,
          timing,
        };
      }
      setRunByEquipment(runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  void tick;

  const isOperating = useCallback(
    (eq: Equipment) =>
      eq.status === "OPERATING" || Boolean(runByEquipment[eq.id]),
    [runByEquipment],
  );

  const counts = useMemo(() => {
    const operating = items.filter((e) => isOperating(e)).length;
    const stopped = items.filter(
      (e) =>
        e.status === "STOPPED" ||
        e.status === "MAINTENANCE" ||
        e.status === "UNAVAILABLE",
    ).length;
    const available = items.filter(
      (e) => e.status === "AVAILABLE" && !runByEquipment[e.id],
    ).length;
    return { operating, stopped, available, total: items.length };
  }, [items, isOperating, runByEquipment]);

  const visible = useMemo(() => {
    if (filter === "operating") {
      return items.filter((e) => isOperating(e));
    }
    if (filter === "stopped") {
      return items.filter(
        (e) =>
          e.status === "STOPPED" ||
          e.status === "MAINTENANCE" ||
          e.status === "UNAVAILABLE",
      );
    }
    if (filter === "available") {
      return items.filter(
        (e) => e.status === "AVAILABLE" && !runByEquipment[e.id],
      );
    }
    return items;
  }, [items, filter, isOperating, runByEquipment]);

  async function handleStop(eq: Equipment) {
    setBusyId(eq.id);
    setMessage(null);
    setError(null);
    try {
      await stopEquipment(getFirestoreDb(), eq.id, stopReasonDraft[eq.id]);
      setMessage(`${eq.code} marcado como PARADO.`);
      setStopReasonDraft((prev) => ({ ...prev, [eq.id]: "" }));
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao parar");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRelease(eq: Equipment) {
    setBusyId(eq.id);
    setMessage(null);
    setError(null);
    try {
      await releaseEquipment(getFirestoreDb(), eq.id);
      setMessage(`${eq.code} liberado (DISPONÍVEL).`);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Chão"
        title="Equipamentos"
        description="Status operacional · parada tira o recurso da fila do Floor."
        actions={
          <Button href="/app/settings/equipment" variant="secondary" size="sm">
            Cadastro / semear →
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Operando" value={counts.operating} tone="ink" />
        <StatTile
          label="Parados"
          value={counts.stopped}
          tone={counts.stopped > 0 ? "critical" : "ink"}
        />
        <StatTile label="Disponíveis" value={counts.available} tone="ink" />
      </div>

      <SegmentedControl
        activeId={filter}
        onSelect={(id) => setFilter(id as Filter)}
        items={[
          { id: "all", label: "Todos", count: counts.total },
          { id: "operating", label: "Operando", count: counts.operating },
          { id: "stopped", label: "Parados", count: counts.stopped },
          { id: "available", label: "Disponíveis", count: counts.available },
        ]}
      />

      {message ? <Alert tone="good">{message}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}
      {!canManage ? (
        <AccessDeniedNote action="parar/liberar equipamentos" />
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nenhum equipamento neste filtro"
          detail="Semee o catálogo ou mude o filtro."
          action={
            <Button href="/app/settings/equipment">Semear catálogo →</Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((eq) => {
            const station = eq.stationId
              ? getStation(eq.stationId)
              : undefined;
            const run = runByEquipment[eq.id];
            const mins = stoppedMinutes(eq.stoppedAt);
            const canStop =
              canManage &&
              eq.status !== "STOPPED" &&
              !isOperating(eq) &&
              eq.status !== "MAINTENANCE" &&
              eq.status !== "UNAVAILABLE";
            const canRelease =
              canManage &&
              (eq.status === "STOPPED" ||
                eq.status === "MAINTENANCE" ||
                eq.status === "UNAVAILABLE");
            const stopped =
              eq.status === "STOPPED" ||
              eq.status === "MAINTENANCE" ||
              eq.status === "UNAVAILABLE";
            const operating = isOperating(eq);

            let timerLine: string | null = null;
            let timerClass = "text-[var(--ink-2)]";
            if (run?.expectedFinishAt) {
              const left = remainingMs(run.expectedFinishAt);
              timerLine =
                left >= 0
                  ? formatDurationClock(left)
                  : `+${formatDurationClock(-left)}`;
              if (run.timing) timerClass = timingToneClass(run.timing);
            }

            return (
              <li key={eq.id}>
                <Card
                  className="px-5 py-4"
                  tone={
                    stopped
                      ? "critical"
                      : operating
                        ? "good"
                        : "default"
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/app/equipment/${encodeURIComponent(eq.id)}`}
                        className="font-mono text-sm font-semibold tabular-nums tracking-tight text-[var(--ink)] transition-colors duration-150 hover:text-[var(--accent-strong)]"
                      >
                        {eq.code}
                      </Link>
                      <p className="mt-0.5 text-sm text-[var(--ink)]">
                        {eq.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {equipmentTypeLabel(eq.type)}
                        {station ? ` · ${station.label}` : ""}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        operating
                          ? "good"
                          : equipmentStatusTone(eq.status)
                      }
                    >
                      {operating
                        ? "OPERANDO"
                        : equipmentStatusLabel(eq.status)}
                      {mins != null && eq.status === "STOPPED"
                        ? ` · ${mins} min`
                        : ""}
                    </StatusBadge>
                  </div>

                  {run ? (
                    <div className="mt-3 flex gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
                      <ProductThumbnail
                        imageUrl={run.imageUrl}
                        alt={run.productName}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
                            {run.productName}
                          </p>
                          {timerLine ? (
                            <p
                              className={`shrink-0 font-mono text-base font-bold tabular-nums tracking-tight ${timerClass}`}
                            >
                              {timerLine}
                            </p>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--ink-2)]">
                          <Link
                            href={`/app/cockpit/production/lots/${encodeURIComponent(run.lotId)}`}
                            className="font-mono font-semibold tabular-nums text-[var(--accent)] hover:underline"
                          >
                            {run.lotCode}
                          </Link>
                          {run.orderNumber ? ` · OP ${run.orderNumber}` : ""}
                          {` · ${run.stepLabel}`}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {run.plannedQuantity != null
                            ? `Qtde ${formatUnits(run.plannedQuantity)}`
                            : "Sem qtde planejada"}
                          {run.timing === "LATE"
                            ? " · Atraso"
                            : run.timing === "ATTENTION"
                              ? " · Atenção"
                              : run.timing === "ON_TIME"
                                ? " · No prazo"
                                : ""}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {eq.stopReason ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Motivo: {eq.stopReason}
                    </p>
                  ) : null}

                  {canManage ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                      {canStop ? (
                        <>
                          <Input
                            type="text"
                            placeholder="Motivo (opcional)"
                            value={stopReasonDraft[eq.id] ?? ""}
                            onChange={(e) =>
                              setStopReasonDraft((prev) => ({
                                ...prev,
                                [eq.id]: e.target.value,
                              }))
                            }
                            className="min-w-[10rem] flex-1 text-xs"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busyId === eq.id}
                            onClick={() => void handleStop(eq)}
                          >
                            Parar
                          </Button>
                        </>
                      ) : null}
                      {canRelease ? (
                        <Button
                          size="sm"
                          disabled={busyId === eq.id}
                          onClick={() => void handleRelease(eq)}
                        >
                          Liberar
                        </Button>
                      ) : null}
                      {operating ? (
                        <p className="text-[11px] text-[var(--muted)]">
                          Em uso — finalize a etapa no Floor para liberar.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
