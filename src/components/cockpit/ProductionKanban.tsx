"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PROCESS_ROUTE,
  getStepDefinition,
  stepTypeLabel,
} from "@/domain/production/process-route";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  formatDurationClock,
  formatStandardMinutes,
  remainingMs,
  timingToneClass,
} from "@/lib/labels/timing";
import { listOpenStepRuns } from "@/repositories/execution.repository";
import { listActiveLots } from "@/repositories/lots.repository";
import { listProducts } from "@/repositories/products.repository";
import { computeTimingStatus } from "@/services/workflow.service";
import type { LotStepRun, ProductionLot, StepType } from "@/types/production";

function pickActiveStep(
  lotId: string,
  steps: LotStepRun[],
): LotStepRun | undefined {
  const forLot = steps.filter((s) => s.lotId === lotId);
  return (
    forLot.find((s) => s.status === "IN_PROGRESS") ??
    forLot.find((s) => s.status === "READY")
  );
}

export function ProductionKanban() {
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [steps, setSteps] = useState<LotStepRun[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [activeLots, products, openSteps] = await Promise.all([
        listActiveLots(db),
        listProducts(db),
        listOpenStepRuns(db),
      ]);
      setLots(activeLots);
      setSteps(openSteps);
      const names: Record<string, string> = {};
      for (const p of products) {
        names[p.id] = p.name;
      }
      setProductNames(names);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) {
        setLots([]);
        setSteps([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const live = useFactoryLiveReload(load);

  const hasRunning = useMemo(
    () => steps.some((s) => s.status === "IN_PROGRESS" && s.startedAt),
    [steps],
  );

  useEffect(() => {
    if (!hasRunning) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasRunning]);

  const columns = DEFAULT_PROCESS_ROUTE.map((step) => ({
    stepType: step.stepType,
    standardDurationMinutes: step.standardDurationMinutes,
    lots: lots.filter((lot) => lot.currentStep === step.stepType),
  }));

  void tick;

  return (
    <div className="space-y-5">
      <CockpitPageHeader
        eyebrow="Fluxo"
        title="Produção ao vivo"
        description="Lotes ativos por etapa · passagem entre estações"
        actions={
          <>
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                Ao vivo
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="dc-btn-secondary h-10 px-4 text-sm"
            >
              Atualizar
            </button>
            <Link
              href="/display/production"
              className="text-sm font-semibold text-dc-orange"
            >
              Display TV →
            </Link>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando produção…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : lots.length === 0 ? (
        <CockpitEmpty
          title="Nenhum lote ativo"
          detail="Liberar OPs no PCP e executar no chão de fábrica gera o fluxo aqui."
          action={
            <Link href="/app/pcp" className="dc-btn-primary h-11 px-5 text-sm">
              Ir ao PCP
            </Link>
          }
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((col) => (
            <section
              key={col.stepType}
              className="dc-panel w-[220px] shrink-0 p-3 lg:w-[240px]"
            >
              <header>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-dc-text-muted">
                    {stepTypeLabel(col.stepType as StepType)}
                  </h2>
                  <span className="rounded-full bg-dc-surface-secondary px-2 py-0.5 text-xs font-bold tabular-nums text-dc-text">
                    {col.lots.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-dc-text-muted">
                  Meta {formatStandardMinutes(col.standardDurationMinutes)}
                </p>
              </header>
              <ul className="mt-3 space-y-2">
                {col.lots.length === 0 ? (
                  <li className="rounded-[12px] border border-dashed border-dc-border px-2.5 py-3 text-center text-xs text-dc-text-muted">
                    Fila vazia
                  </li>
                ) : (
                  col.lots.map((lot) => {
                    const productName =
                      productNames[lot.productId] ?? lot.productId;
                    const step = pickActiveStep(lot.id, steps);
                    const def = getStepDefinition(col.stepType);
                    const inProgress =
                      step?.status === "IN_PROGRESS" &&
                      step.startedAt &&
                      step.expectedFinishAt;

                    let timerLine: string | null = null;
                    let timerClass = "text-dc-text-secondary";

                    if (inProgress && step.startedAt && step.expectedFinishAt) {
                      const left = remainingMs(step.expectedFinishAt);
                      const status = computeTimingStatus(
                        step.startedAt,
                        step.expectedFinishAt,
                        step.toleranceMinutes ?? def?.lateToleranceMinutes ?? 0,
                      );
                      timerClass = timingToneClass(status);
                      timerLine =
                        left >= 0
                          ? formatDurationClock(left)
                          : `+${formatDurationClock(-left)}`;
                    }

                    return (
                      <li key={lot.id}>
                        <Link
                          href={`/app/cockpit/production/lots/${lot.id}`}
                          className="block rounded-[14px] border border-dc-border-soft bg-dc-surface-secondary/80 px-3 py-2.5 transition hover:border-dc-orange/30 hover:bg-dc-orange-soft"
                        >
                          <p className="text-sm font-semibold leading-snug text-dc-text">
                            {productName}
                          </p>
                          <p className="mt-1 text-xs tabular-nums text-dc-text-secondary">
                            {lot.lotCode}
                          </p>
                          {timerLine ? (
                            <p
                              className={`mt-2 text-xl font-bold tabular-nums tracking-tight ${timerClass}`}
                            >
                              {timerLine}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-medium text-dc-text-muted">
                              Aguardando início
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
