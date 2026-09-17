"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PROCESS_ROUTE,
  getStepDefinition,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { coolingZone } from "@/components/floor/FloorCoolingBoard";
import { proofingZone } from "@/components/floor/FloorProofingBoard";
import { BrandMark } from "@/components/shared/BrandMark";
import { ConnectionBadge } from "@/components/shared/ConnectionBadge";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryConnection } from "@/hooks/useFactoryConnection";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  formatDurationClock,
  formatStandardMinutes,
  remainingMs,
} from "@/lib/labels/timing";
import { listOpenStepRuns } from "@/repositories/execution.repository";
import { listActiveLots } from "@/repositories/lots.repository";
import { listProducts } from "@/repositories/products.repository";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { buildProductMaps } from "@/lib/products/product-maps";
import { computeTimingStatus } from "@/services/workflow.service";
import type {
  LotStepRun,
  ProductionLot,
  StepType,
  TimingStatus,
} from "@/types/production";

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

function toneBorder(status: TimingStatus | null | "READY_HANDOFF"): string {
  switch (status) {
    case "ATTENTION":
      return "border-warning/60 bg-warning/10";
    case "LATE":
      return "border-danger/60 bg-danger/10";
    case "READY_HANDOFF":
      return "border-dc-orange/50 bg-dc-orange/15";
    case "ON_TIME":
      return "border-success/50 bg-success/10";
    default:
      return "border-white/10 bg-white/5";
  }
}

type AttentionRow = {
  lotId: string;
  lotCode: string;
  productName: string;
  imageUrl: string | null;
  stepType: StepType;
  timing: TimingStatus | "READY_HANDOFF";
  detail: string;
  rank: number;
};

type DisplayView = "flow" | "attention";

/**
 * Factory Display TV (Doc 02 §59–62 / Doc 09 §45).
 * Dados ao vivo — sem interação necessária.
 */
export function DisplayProductionClient() {
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [steps, setSteps] = useState<LotStepRun[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const [view, setView] = useState<DisplayView>("flow");

  const load = useCallback(async (_opts?: { silent?: boolean }) => {
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const live = useFactoryLiveReload(load);
  const { online } = useFactoryConnection();

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setClock(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const columns = DEFAULT_PROCESS_ROUTE.map((step) => ({
    stepType: step.stepType,
    standardDurationMinutes: step.standardDurationMinutes,
    lots: lots.filter((lot) => lot.currentStep === step.stepType),
  }));

  const liveStats = useMemo(() => {
    void tick;
    let running = 0;
    let waiting = 0;
    let late = 0;
    let attention = 0;
    let handoff = 0;
    const attentionRows: AttentionRow[] = [];

    for (const lot of lots) {
      if (!lot.currentStep) continue;
      const step = pickActiveStep(lot.id, steps);
      const route = lot.processRoute;

      if (lot.currentStepStatus === "IN_PROGRESS" || step?.status === "IN_PROGRESS") {
        running += 1;
      } else if (
        lot.currentStepStatus === "READY" ||
        step?.status === "READY"
      ) {
        waiting += 1;
      }

      // Handoffs: fermentação pronta / resfriamento liberável
      if (lot.currentStep === "PROOFING" && step) {
        const zone = proofingZone(step);
        if (zone === "READY" || zone === "LATE") {
          handoff += 1;
          const releaseAt = step.expectedFinishAt
            ? new Date(step.expectedFinishAt).getTime()
            : Date.now();
          const over = Date.now() - releaseAt;
          attentionRows.push({
            lotId: lot.id,
            lotCode: lot.lotCode,
            productName: productNames[lot.productId] ?? lot.productId,
            imageUrl: productImages[lot.productId] ?? null,
            stepType: lot.currentStep,
            timing: zone === "LATE" ? "LATE" : "READY_HANDOFF",
            detail:
              zone === "LATE"
                ? `PRONTO ATRASADO +${formatDurationClock(Math.max(0, over))}`
                : `PRONTO HÁ ${formatDurationClock(Math.max(0, over))}`,
            rank: zone === "LATE" ? 0 : 2,
          });
          if (zone === "LATE") late += 1;
          continue;
        }
      }

      if (lot.currentStep === "COOLING" && step) {
        const zone = coolingZone(step);
        if (zone === "READY" || zone === "LATE") {
          handoff += 1;
          const over = step.expectedFinishAt
            ? Date.now() - new Date(step.expectedFinishAt).getTime()
            : 0;
          attentionRows.push({
            lotId: lot.id,
            lotCode: lot.lotCode,
            productName: productNames[lot.productId] ?? lot.productId,
            imageUrl: productImages[lot.productId] ?? null,
            stepType: lot.currentStep,
            timing: zone === "LATE" ? "LATE" : "READY_HANDOFF",
            detail:
              zone === "LATE"
                ? `LIBERAR EMBALAGEM +${formatDurationClock(Math.max(0, over))}`
                : `LIBERÁVEL HÁ ${formatDurationClock(Math.max(0, over))}`,
            rank: zone === "LATE" ? 0 : 2,
          });
          if (zone === "LATE") late += 1;
          continue;
        }
      }

      if (
        step?.status === "IN_PROGRESS" &&
        step.startedAt &&
        step.expectedFinishAt
      ) {
        const timing = computeTimingStatus(
          step.startedAt,
          step.expectedFinishAt,
          step.toleranceMinutes ??
            getStepDefinition(lot.currentStep, route)?.lateToleranceMinutes ??
            0,
        );
        const left = remainingMs(step.expectedFinishAt);
        if (timing === "LATE") {
          late += 1;
          attentionRows.push({
            lotId: lot.id,
            lotCode: lot.lotCode,
            productName: productNames[lot.productId] ?? lot.productId,
            imageUrl: productImages[lot.productId] ?? null,
            stepType: lot.currentStep,
            timing,
            detail: `ATRASADO +${formatDurationClock(-left)}`,
            rank: 0,
          });
        } else if (timing === "ATTENTION") {
          attention += 1;
          attentionRows.push({
            lotId: lot.id,
            lotCode: lot.lotCode,
            productName: productNames[lot.productId] ?? lot.productId,
            imageUrl: productImages[lot.productId] ?? null,
            stepType: lot.currentStep,
            timing,
            detail:
              left >= 0
                ? `${formatDurationClock(left)} restantes`
                : `+${formatDurationClock(-left)}`,
            rank: 1,
          });
        }
      }
    }

    attentionRows.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.lotCode.localeCompare(b.lotCode);
    });

    return {
      running,
      waiting,
      late,
      attention,
      handoff,
      attentionRows: attentionRows.slice(0, 10),
    };
  }, [lots, steps, tick, productNames, productImages]);

  // Rotação lenta visão geral ↔ atenção (Doc 02 §62) — só se houver alertas
  useEffect(() => {
    if (liveStats.attentionRows.length === 0) {
      setView("flow");
      return;
    }
    const id = window.setInterval(() => {
      setView((v) => (v === "flow" ? "attention" : "flow"));
    }, 25_000);
    return () => window.clearInterval(id);
  }, [liveStats.attentionRows.length]);

  return (
    <main className="display-shell flex flex-col px-6 py-7 lg:px-12 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <BrandMark href="/display/production" tone="dark" size="md" />
          <p className="mt-6 text-sm font-bold tracking-[0.22em] text-white/40">
            PRODUÇÃO AO VIVO
          </p>
          <h1 className="display-kpi mt-3 text-white">
            {lots.length}{" "}
            <span className="text-[0.45em] font-semibold tracking-tight text-white/50">
              {lots.length === 1 ? "lote ativo" : "lotes ativos"}
            </span>
          </h1>
          <p className="mt-4 text-xl text-white/55 lg:text-2xl">
            <span className="font-semibold text-white/80">
              {liveStats.running}
            </span>{" "}
            rodando
            {liveStats.waiting > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-white/80">
                  {liveStats.waiting}
                </span>{" "}
                aguardando
              </>
            ) : null}
            {liveStats.late > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-danger">
                  {liveStats.late}
                </span>{" "}
                atrasado(s)
              </>
            ) : null}
            {liveStats.handoff > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-dc-orange">
                  {liveStats.handoff}
                </span>{" "}
                handoff(s)
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <div className="mb-3 flex justify-end gap-3">
            {online && live ? (
              <p className="flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-sm font-bold text-success">
                <span className="size-2.5 animate-pulse rounded-full bg-success" />
                AO VIVO
              </p>
            ) : (
              <ConnectionBadge dense onDark />
            )}
            {liveStats.attentionRows.length > 0 ? (
              <p className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/40">
                {view === "flow" ? "Fluxo" : "Atenção"} · 25s
              </p>
            ) : null}
          </div>
          <p className="display-clock text-white">
            {clock.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>
      </header>

      {error ? (
        <p className="mt-12 text-2xl text-danger">{error}</p>
      ) : lots.length === 0 ? (
        <section className="mt-20 flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-4xl font-semibold tracking-tight lg:text-5xl">
            Nenhum lote em produção
          </p>
          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-white/50 lg:text-2xl">
            Sync no Cockpit → liberar OP no PCP → executar no Floor. Os lotes
            aparecem aqui por etapa, com timers, atrasos e handoffs.
          </p>
          <p className="mt-10 text-sm font-bold tracking-[0.2em] text-white/30">
            AGUARDANDO LIBERAÇÃO · QA DISPLAY
          </p>
        </section>
      ) : (
        <>
          {view === "attention" && liveStats.attentionRows.length > 0 ? (
            <section className="mt-12 flex flex-1 flex-col">
              <p className="text-base font-bold tracking-[0.28em] text-warning">
                ATENÇÃO AGORA
              </p>
              <ul className="mt-8 space-y-5">
                {liveStats.attentionRows.map((row) => (
                  <li
                    key={row.lotId}
                    className={`rounded-[24px] border px-7 py-6 ${toneBorder(row.timing)}`}
                  >
                    <div className="flex flex-wrap items-end justify-between gap-5">
                      <div className="flex min-w-0 items-start gap-4">
                        <ProductThumbnail
                          imageUrl={row.imageUrl}
                          alt={row.productName}
                          size="md"
                          className="!size-16 !rounded-[14px] border-white/15"
                        />
                        <div>
                        <p className="text-3xl font-bold tabular-nums tracking-tight lg:text-4xl">
                          {row.lotCode}
                        </p>
                        <p className="mt-2 text-xl text-white/70 lg:text-2xl">
                          {row.productName}
                          <span className="text-white/40">
                            {" "}
                            · {stepTypeLabel(row.stepType).toUpperCase()}
                          </span>
                        </p>
                        </div>
                      </div>
                      <p
                        className={`text-3xl font-bold tabular-nums tracking-tight lg:text-4xl ${
                          row.timing === "LATE"
                            ? "text-danger"
                            : row.timing === "READY_HANDOFF"
                              ? "text-dc-orange"
                              : "text-warning"
                        }`}
                      >
                        {row.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <>
              {liveStats.attentionRows.length > 0 ? (
                <section className="mt-10 rounded-[20px] border border-warning/35 bg-warning/10 px-6 py-5 lg:px-8 lg:py-6">
                  <p className="text-sm font-bold tracking-[0.22em] text-warning">
                    ATENÇÃO
                  </p>
                  <ul className="mt-4 space-y-3">
                    {liveStats.attentionRows.slice(0, 6).map((row) => (
                      <li
                        key={row.lotId}
                        className="flex flex-wrap items-baseline justify-between gap-3 text-xl lg:text-2xl"
                      >
                        <span className="font-bold tabular-nums">
                          {row.lotCode}
                          <span className="ml-3 font-medium text-white/55">
                            · {stepTypeLabel(row.stepType).toUpperCase()}
                          </span>
                        </span>
                        <span
                          className={`font-bold tabular-nums ${
                            row.timing === "LATE"
                              ? "text-danger"
                              : row.timing === "READY_HANDOFF"
                                ? "text-dc-orange"
                                : "text-warning"
                          }`}
                        >
                          {row.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="mt-10 text-xl font-medium text-success/85 lg:text-2xl">
                  Nenhuma atenção crítica no momento.
                </p>
              )}

              <div className="mt-10 flex flex-1 gap-4 overflow-x-auto pb-4">
                {columns.map((col) => (
                  <section key={col.stepType} className="display-col">
                    <header>
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
                          {stepTypeLabel(col.stepType as StepType)}
                        </h2>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-lg font-bold tabular-nums text-white">
                          {col.lots.length}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/30">
                        Meta {formatStandardMinutes(col.standardDurationMinutes)}
                      </p>
                    </header>
                    <ul className="mt-4 flex-1 space-y-2.5">
                      {col.lots.length === 0 ? (
                        <li className="rounded-[12px] border border-dashed border-white/10 px-3 py-4 text-center text-sm text-white/25">
                          Fila vazia
                        </li>
                      ) : (
                        col.lots.map((lot) => {
                          const step = pickActiveStep(lot.id, steps);
                          const def = getStepDefinition(
                            col.stepType,
                            lot.processRoute,
                          );
                          const inProgress =
                            step?.status === "IN_PROGRESS" &&
                            step.startedAt &&
                            step.expectedFinishAt;

                          let timing: TimingStatus | null | "READY_HANDOFF" =
                            null;
                          let timer: string | null = null;

                          if (col.stepType === "PROOFING" && step) {
                            const zone = proofingZone(step);
                            if (zone === "READY" || zone === "LATE") {
                              timing =
                                zone === "LATE" ? "LATE" : "READY_HANDOFF";
                              const over = step.expectedFinishAt
                                ? Date.now() -
                                  new Date(step.expectedFinishAt).getTime()
                                : 0;
                              timer =
                                zone === "LATE"
                                  ? `+${formatDurationClock(Math.max(0, over))}`
                                  : formatDurationClock(Math.max(0, over));
                            }
                          }

                          if (
                            timing == null &&
                            col.stepType === "COOLING" &&
                            step
                          ) {
                            const zone = coolingZone(step);
                            if (zone === "READY" || zone === "LATE") {
                              timing =
                                zone === "LATE" ? "LATE" : "READY_HANDOFF";
                              const over = step.expectedFinishAt
                                ? Date.now() -
                                  new Date(step.expectedFinishAt).getTime()
                                : 0;
                              timer = formatDurationClock(Math.max(0, over));
                            }
                          }

                          if (
                            timing == null &&
                            inProgress &&
                            step.startedAt &&
                            step.expectedFinishAt
                          ) {
                            timing = computeTimingStatus(
                              step.startedAt,
                              step.expectedFinishAt,
                              step.toleranceMinutes ??
                                def?.lateToleranceMinutes ??
                                0,
                            );
                            const left = remainingMs(step.expectedFinishAt);
                            timer =
                              left >= 0
                                ? formatDurationClock(left)
                                : `+${formatDurationClock(-left)}`;
                          }

                          return (
                            <li
                              key={lot.id}
                              className={`display-lot ${toneBorder(timing)}`}
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <ProductThumbnail
                                  imageUrl={productImages[lot.productId]}
                                  alt={productNames[lot.productId] ?? lot.productId}
                                  size="sm"
                                  className="!rounded-[10px] shrink-0 border-white/15"
                                />
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <p className="truncate text-base font-semibold leading-snug text-white">
                                    {productNames[lot.productId] ?? lot.productId}
                                  </p>
                                  <p className="mt-1 truncate text-sm tabular-nums text-white/50">
                                    {lot.lotCode}
                                  </p>
                                  {timer ? (
                                    <p className="display-timer">{timer}</p>
                                  ) : (
                                    <p className="mt-3 text-sm text-white/35">
                                      {step?.status === "READY"
                                        ? "Aguardando início"
                                        : "—"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
