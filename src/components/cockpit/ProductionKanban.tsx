"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PROCESS_ROUTE,
  getStepDefinition,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { Alert, Button, EmptyState, StatusBadge } from "@/components/ui";
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
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { buildProductMaps } from "@/lib/products/product-maps";
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
  const [productImages, setProductImages] = useState<
    Record<string, string | null>
  >({});
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
      const maps = buildProductMaps(products);
      setProductNames(maps.names);
      setProductImages(maps.images);
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
              <StatusBadge status="good" className="gap-1.5 normal-case tracking-normal">
                <span className="size-1.5 rounded-full bg-[var(--good)] dc-live-dot" />
                Ao vivo
              </StatusBadge>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Atualizar
            </Button>
            <Button href="/display/production" variant="ghost" size="sm">
              Display TV →
            </Button>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando produção…</p>
      ) : error ? (
        <Alert tone="critical">{error}</Alert>
      ) : lots.length === 0 ? (
        <EmptyState
          title="Nenhum lote ativo"
          detail="Liberar OPs no PCP e executar no chão de fábrica gera o fluxo aqui."
          action={<Button href="/app/pcp" size="lg">Ir ao PCP</Button>}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((col) => (
            <section
              key={col.stepType}
              className="w-[220px] shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 lg:w-[240px]"
            >
              <header>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                    {stepTypeLabel(col.stepType as StepType)}
                  </h2>
                  <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-[var(--ink)]">
                    {col.lots.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Meta {formatStandardMinutes(col.standardDurationMinutes)}
                </p>
              </header>
              <ul className="mt-3 space-y-2">
                {col.lots.length === 0 ? (
                  <li className="rounded-[12px] border border-dashed border-[var(--border)] px-2.5 py-3 text-center text-xs text-[var(--muted)]">
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
                    let timerClass = "text-[var(--ink-2)]";

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
                          className="flex gap-2.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 transition-[background-color,border-color] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--accent-bg)]"
                        >
                          <ProductThumbnail
                            imageUrl={productImages[lot.productId]}
                            alt={productName}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-[var(--ink)]">
                              {productName}
                            </p>
                            <p className="mt-1 font-mono text-xs tabular-nums text-[var(--ink-2)]">
                              {lot.lotCode}
                            </p>
                            {timerLine ? (
                              <p
                                className={`mt-2 font-mono text-xl font-bold tabular-nums tracking-tight ${timerClass}`}
                              >
                                {timerLine}
                              </p>
                            ) : (
                              <p className="mt-2 text-xs font-medium text-[var(--muted)]">
                                Aguardando início
                              </p>
                            )}
                          </div>
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
