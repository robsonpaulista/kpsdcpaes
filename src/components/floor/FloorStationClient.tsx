"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FloorBakingBoard } from "@/components/floor/FloorBakingBoard";
import { FloorCoolingBoard } from "@/components/floor/FloorCoolingBoard";
import { FloorLotQuickInfo } from "@/components/floor/FloorLotQuickInfo";
import { FloorOccurrenceSheet } from "@/components/floor/FloorOccurrenceSheet";
import { FloorPackagingBoard } from "@/components/floor/FloorPackagingBoard";
import { FloorPrepBoard } from "@/components/floor/FloorPrepBoard";
import { FloorProofingBoard } from "@/components/floor/FloorProofingBoard";
import { FloorQrScanner } from "@/components/floor/FloorQrScanner";
import { FloorStationScanBlock } from "@/components/floor/FloorStationScanBlock";
import { stepTypeLabel } from "@/domain/production/process-route";
import { getStationForStep } from "@/domain/production/stations";
import { useFactoryConnection } from "@/hooks/useFactoryConnection";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { useStation } from "@/hooks/useStation";
import { useOperator } from "@/hooks/useOperator";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  executionStatusLabel,
  timingStatusLabel,
} from "@/lib/labels/production-status";
import { formatStandardMinutes } from "@/lib/labels/timing";
import { lotTraceabilityHref } from "@/lib/links/lots";
import { listEquipmentForStep } from "@/repositories/equipment.repository";
import { listLossReasonsForStep } from "@/repositories/loss-reason.repository";
import { getActiveStepRun, listOpenStepRuns } from "@/repositories/execution.repository";
import {
  getLotByCode,
  getLotById,
  listLotsForStationStep,
} from "@/repositories/lots.repository";
import { getProductionOrder } from "@/repositories/orders.repository";
import { getProductById } from "@/repositories/products.repository";
import { formatLossReasonSnapshot } from "@/services/loss-reason.service";
import {
  completeStep,
  computeTimingStatus,
  coolingMinimumRemainingMs,
  isCoolingMinimumReached,
  startStep,
} from "@/services/workflow.service";
import type { Equipment } from "@/types/equipment";
import type { LossReason } from "@/types/loss-reason";
import type {
  LotStepRun,
  ProductionLot,
  ProductionOrder,
  Product,
  TimingStatus,
} from "@/types/production";

const EQUIPMENT_STORAGE_PREFIX = "dc_factory_floor_equipment_";

type StationQueueItem = {
  lot: ProductionLot;
  step?: LotStepRun;
};

function timingUrgency(timing: TimingStatus | null): number {
  switch (timing) {
    case "LATE":
      return 40;
    case "ATTENTION":
      return 30;
    case "ON_TIME":
      return 10;
    default:
      return 0;
  }
}

function timingForQueueStep(step: LotStepRun | undefined): TimingStatus | null {
  if (!step || step.status !== "IN_PROGRESS") return null;
  if (!step.startedAt || !step.expectedFinishAt) {
    return step.timingStatus === "NOT_STARTED" ? null : step.timingStatus;
  }
  return computeTimingStatus(
    step.startedAt,
    step.expectedFinishAt,
    step.toleranceMinutes ?? 0,
  );
}

function sortStationQueue(
  items: Array<StationQueueItem & { timing: TimingStatus | null }>,
): Array<StationQueueItem & { timing: TimingStatus | null }> {
  return [...items].sort((a, b) => {
    const urg = timingUrgency(b.timing) - timingUrgency(a.timing);
    if (urg !== 0) return urg;
    const aProg = a.lot.currentStepStatus === "IN_PROGRESS" ? 1 : 0;
    const bProg = b.lot.currentStepStatus === "IN_PROGRESS" ? 1 : 0;
    if (bProg !== aProg) return bProg - aProg;
    return a.lot.updatedAt.localeCompare(b.lot.updatedAt);
  });
}
function newOperationId(): string {
  return `op_${crypto.randomUUID()}`;
}

function elapsedLabel(startedAt: string | undefined): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const secs = Math.max(0, Math.floor((ms % 60_000) / 1000));
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function remainingClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function timingClasses(status: TimingStatus): string {
  switch (status) {
    case "ATTENTION":
      return "bg-warning-soft text-warning";
    case "LATE":
      return "bg-danger-soft text-danger";
    case "ON_TIME":
      return "bg-success-soft text-success";
    default:
      return "bg-dc-surface-secondary text-dc-text-secondary";
  }
}

const OFFLINE_ACTION_MSG =
  "AÇÃO TEMPORARIAMENTE INDISPONÍVEL. Precisamos confirmar o estado atual deste lote antes de avançar. Tentando reconectar…";

type CompleteDraft = {
  title: string;
  outputQuantity?: number;
  lossQuantity?: number;
  effectiveLoss?: number;
  lossPercent?: number;
  plannedIn?: number;
  lossReasonId?: string;
  lossReasonSnapshot?: string;
  lossReasonLabel?: string;
};

function formatQty(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function FloorStationClient() {
  const { station } = useStation();
  const { operatorId, operatorName } = useOperator();
  const { online } = useFactoryConnection();
  const { can } = useFactoryRole();
  const canExecute = can("executeFloor");
  const [code, setCode] = useState("");
  const [lot, setLot] = useState<ProductionLot | null>(null);
  const [step, setStep] = useState<LotStepRun | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [occurrenceOpen, setOccurrenceOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [completedLotId, setCompletedLotId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [queue, setQueue] = useState<StationQueueItem[]>([]);
  const [outputQty, setOutputQty] = useState("");
  const [lossQty, setLossQty] = useState("");
  const [lossReasonId, setLossReasonId] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState("");
  /** Confirmação contextual (Doc 07 §81) — mostra o que será registrado. */
  const [completeDraft, setCompleteDraft] = useState<CompleteDraft | null>(
    null,
  );
  /** Conflito de outro dispositivo (Doc 07 §104). */
  const [staleConflict, setStaleConflict] = useState(false);

  const stepActionLabel = useMemo(() => {
    if (station.stepType === "PROOFING") {
      return {
        start: "INICIAR FERMENTAÇÃO",
        finish: "LIBERAR PARA FORNO",
      };
    }
    if (station.stepType === "BAKING") {
      return {
        start: "INICIAR FORNO",
        finish: "FINALIZAR FORNO",
      };
    }
    if (station.stepType === "COOLING") {
      return {
        start: "INICIAR RESFRIAMENTO",
        finish: "LIBERAR PARA EMBALAGEM",
      };
    }
    if (station.stepType === "PACKAGING") {
      return {
        start: "INICIAR EMBALAGEM",
        finish: "FINALIZAR EMBALAGEM",
      };
    }
    const label = stepTypeLabel(station.stepType).toUpperCase();
    return { start: `INICIAR ${label}`, finish: `FINALIZAR ${label}` };
  }, [station.stepType]);

  const isProofingStation = station.stepType === "PROOFING";
  const isBakingStation = station.stepType === "BAKING";
  const isCoolingStation = station.stepType === "COOLING";
  const isPackagingStation = station.stepType === "PACKAGING";
  const isPrepStation =
    station.stepType === "MIXING" ||
    station.stepType === "MODELING" ||
    station.stepType === "TRAYING";
  const useStationMonitor =
    isProofingStation ||
    isBakingStation ||
    isCoolingStation ||
    isPackagingStation ||
    isPrepStation;

  const selectedLossReason = useMemo(
    () => lossReasons.find((r) => r.id === lossReasonId),
    [lossReasons, lossReasonId],
  );

  const loadQueue = useCallback(async (_opts?: { silent?: boolean }) => {
    try {
      if (!isFirebaseConfigured()) return;
      const db = getFirestoreDb();
      const [lots, openSteps] = await Promise.all([
        listLotsForStationStep(db, station.stepType),
        listOpenStepRuns(db),
      ]);
      const stepByLot = new Map<string, LotStepRun>();
      for (const s of openSteps) {
        if (s.stepType !== station.stepType) continue;
        const prev = stepByLot.get(s.lotId);
        if (!prev || s.status === "IN_PROGRESS") {
          stepByLot.set(s.lotId, s);
        }
      }
      const items: StationQueueItem[] = lots.map((lot) => ({
        lot,
        step: stepByLot.get(lot.id),
      }));
      setQueue(items);
    } catch {
      setQueue([]);
    }
  }, [station.stepType]);

  const loadEquipment = useCallback(async () => {
    try {
      if (!isFirebaseConfigured()) {
        setEquipmentOptions([]);
        return;
      }
      const db = getFirestoreDb();
      const list = await listEquipmentForStep(
        db,
        station.stepType,
        station.id,
      );
      setEquipmentOptions(list);
      let saved = "";
      try {
        saved =
          window.localStorage.getItem(
            `${EQUIPMENT_STORAGE_PREFIX}${station.id}`,
          ) ?? "";
      } catch {
        /* ignore */
      }
      const preferred =
        list.find((e) => e.id === saved)?.id ??
        list.find((e) => e.stationId === station.id)?.id ??
        list[0]?.id ??
        "";
      setEquipmentId(preferred);
    } catch {
      setEquipmentOptions([]);
      setEquipmentId("");
    }
  }, [station.id, station.stepType]);

  const loadLossReasons = useCallback(async () => {
    try {
      if (!isFirebaseConfigured()) {
        setLossReasons([]);
        return;
      }
      const db = getFirestoreDb();
      const list = await listLossReasonsForStep(db, station.stepType);
      setLossReasons(list);
      setLossReasonId((prev) =>
        list.some((r) => r.id === prev) ? prev : list[0]?.id ?? "",
      );
    } catch {
      setLossReasons([]);
      setLossReasonId("");
    }
  }, [station.stepType]);

  useEffect(() => {
    setLot(null);
    setStep(null);
    setProduct(null);
    setOrder(null);
    setInfoOpen(false);
    setOccurrenceOpen(false);
    setMessage(null);
    setError(null);
    setCompleteDraft(null);
    void loadQueue();
    void loadEquipment();
    void loadLossReasons();
  }, [loadQueue, loadEquipment, loadLossReasons]);

  useEffect(() => {
    setCompleteDraft(null);
    setStaleConflict(false);
  }, [outputQty, lossQty, lossReasonId, lossNotes]);

  useFactoryLiveReload((opts) => {
    void loadQueue(opts);
    void loadEquipment();
    void loadLossReasons();
  });
  useEffect(() => {
    const needsTick =
      (step?.startedAt && step.status === "IN_PROGRESS") ||
      queue.some((q) => q.lot.currentStepStatus === "IN_PROGRESS");
    if (!needsTick) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [step?.startedAt, step?.status, queue]);

  const liveQueue = useMemo(() => {
    void tick;
    return sortStationQueue(
      queue.map((item) => ({
        ...item,
        timing: timingForQueueStep(item.step),
      })),
    );
  }, [queue, tick]);

  const queueAlerts = useMemo(
    () =>
      liveQueue
        .filter((q) => q.timing === "LATE" || q.timing === "ATTENTION")
        .slice(0, 3),
    [liveQueue],
  );

  const liveTiming = useMemo((): TimingStatus => {
    void tick;
    if (!step?.startedAt || !step.expectedFinishAt) {
      return step?.timingStatus ?? "NOT_STARTED";
    }
    if (step.status !== "IN_PROGRESS") {
      return step.timingStatus;
    }
    return computeTimingStatus(
      step.startedAt,
      step.expectedFinishAt,
      step.toleranceMinutes ?? 0,
    );
  }, [step, tick]);

  const coolingRemainingMs = useMemo(() => {
    void tick;
    if (!step || step.stepType !== "COOLING") return null;
    return coolingMinimumRemainingMs(step);
  }, [step, tick]);

  const coolingReady = useMemo(() => {
    void tick;
    if (!step || step.stepType !== "COOLING") return true;
    return isCoolingMinimumReached(step);
  }, [step, tick]);

  const refreshLot = useCallback(async (lotId: string) => {
    const db = getFirestoreDb();
    const nextLot = await getLotById(db, lotId);
    if (!nextLot) {
      setLot(null);
      setStep(null);
      setOrder(null);
      return;
    }
    setLot(nextLot);
    setStep(await getActiveStepRun(db, lotId));
    setProduct(await getProductById(db, nextLot.productId));
    setOrder(await getProductionOrder(db, nextLot.productionOrderId));
  }, []);

  async function identifyLot(raw: string) {
    setError(null);
    setMessage(null);
    setCompletedLotId(null);
    setCompleteDraft(null);
    setStaleConflict(false);
    setInfoOpen(false);
    setOccurrenceOpen(false);
    setBusy(true);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const trimmed = raw.trim();
      if (!trimmed) throw new Error("QR NÃO RECONHECIDO. Tente novamente.");
      setCode(trimmed);
      const found =
        (await getLotByCode(db, trimmed)) ??
        (await getLotById(db, trimmed));
      if (!found) {
        throw new Error(
          "Verifique o código ou tente escanear novamente.",
        );
      }

      if (found.status === "BLOCKED") {
        throw new Error("LOTE BLOQUEADO — qualidade. Não executar nesta estação.");
      }

      if (
        found.currentStep &&
        found.currentStep !== station.stepType &&
        found.status !== "COMPLETED"
      ) {
        const dest = getStationForStep(found.currentStep);
        throw new Error(
          `Lote está em ${stepTypeLabel(found.currentStep)}${
            dest ? ` → troque para ${dest.label}` : ""
          }.`,
        );
      }

      setCode(found.lotCode);
      setLot(found);
      const active = await getActiveStepRun(db, found.id);
      setStep(active);
      setProduct(await getProductById(db, found.productId));
      setOrder(await getProductionOrder(db, found.productionOrderId));
      const planned = String(
        active?.inputQuantity ?? found.plannedQuantity ?? "",
      );
      setOutputQty(planned);
      setLossQty("");
      setLossNotes("");
      setLossReasonId((prev) =>
        lossReasons.some((r) => r.id === prev) ? prev : lossReasons[0]?.id ?? "",
      );
    } catch (err) {
      setLot(null);
      setStep(null);
      setProduct(null);
      setOrder(null);
      setError(err instanceof Error ? err.message : "Falha ao identificar lote");
    } finally {
      setBusy(false);
    }
  }

  function applyWorkflowError(err: unknown, fallback: string) {
    const msg = err instanceof Error ? err.message : fallback;
    setStaleConflict(msg.startsWith("ESTE LOTE JÁ FOI ATUALIZADO"));
    setError(msg);
  }

  async function handleRefreshAfterConflict() {
    if (!lot) return;
    setBusy(true);
    setError(null);
    setStaleConflict(false);
    setCompleteDraft(null);
    try {
      await refreshLot(lot.id);
      setMessage("Estado do lote atualizado.");
    } catch (err) {
      applyWorkflowError(err, "Falha ao atualizar lote");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!lot) return;
    if (!canExecute) {
      setError("Seu perfil não pode executar etapas no chão.");
      return;
    }
    if (!online) {
      setError(OFFLINE_ACTION_MSG);
      return;
    }
    if (!operatorId) {
      setError("Informe o nome do operador no rodapé.");
      return;
    }
    if (equipmentOptions.length > 0 && !equipmentId) {
      setError("Selecione o equipamento desta etapa.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    setCompletedLotId(null);
    setStaleConflict(false);
    try {
      if (equipmentId) {
        try {
          window.localStorage.setItem(
            `${EQUIPMENT_STORAGE_PREFIX}${station.id}`,
            equipmentId,
          );
        } catch {
          /* ignore */
        }
      }
      const db = getFirestoreDb();
      const result = await startStep(db, {
        lotId: lot.id,
        operationId: newOperationId(),
        stationId: station.id,
        operatorId,
        equipmentId: equipmentId || undefined,
      });
      setLot(result.lot);
      setStep(result.step);
      setMessage(
        result.alreadyApplied
          ? "✓ ETAPA REGISTRADA (já aplicada neste dispositivo)"
          : "✓ ETAPA REGISTRADA",
      );
      await loadQueue();
    } catch (err) {
      applyWorkflowError(err, "Falha ao iniciar");
      await refreshLot(lot.id);
    } finally {
      setBusy(false);
    }
  }

  function buildCompleteDraft(): CompleteDraft {
    if (!lot) throw new Error("Lote não carregado.");
    const output =
      outputQty.trim() === "" ? undefined : Number(outputQty.replace(",", "."));
    const loss =
      lossQty.trim() === "" ? undefined : Number(lossQty.replace(",", "."));
    if (output != null && Number.isNaN(output)) {
      throw new Error("Quantidade de saída inválida.");
    }
    if (loss != null && Number.isNaN(loss)) {
      throw new Error("Perda inválida.");
    }
    const plannedIn =
      step?.inputQuantity ?? lot.plannedQuantity ?? undefined;
    const effectiveLoss =
      loss ??
      (plannedIn != null && output != null
        ? Math.max(0, plannedIn - output)
        : undefined);
    if (effectiveLoss != null && effectiveLoss > 0) {
      if (!selectedLossReason) {
        throw new Error(
          "Cadastre motivos de perda em Configurações ou selecione um motivo.",
        );
      }
      if (selectedLossReason.requiresNotes && !lossNotes.trim()) {
        throw new Error("Descreva o motivo da perda.");
      }
    }
    const lossReasonSnapshot =
      effectiveLoss != null && effectiveLoss > 0 && selectedLossReason
        ? formatLossReasonSnapshot({
            label: selectedLossReason.label,
            notes: lossNotes,
            requiresNotes: selectedLossReason.requiresNotes,
          })
        : undefined;
    const lossPercent =
      plannedIn != null &&
      plannedIn > 0 &&
      effectiveLoss != null
        ? (effectiveLoss / plannedIn) * 100
        : undefined;

    const title =
      step?.stepType === "COOLING"
        ? "LIBERAR PARA EMBALAGEM"
        : stepActionLabel.finish;

    return {
      title,
      outputQuantity: output,
      lossQuantity: loss,
      effectiveLoss,
      lossPercent,
      plannedIn,
      lossReasonId:
        effectiveLoss != null && effectiveLoss > 0
          ? selectedLossReason?.id
          : undefined,
      lossReasonSnapshot,
      lossReasonLabel: selectedLossReason?.label,
    };
  }

  function requestCompleteConfirm() {
    if (!lot) return;
    if (!online) {
      setError(OFFLINE_ACTION_MSG);
      return;
    }
    if (!operatorId) {
      setError("Informe o nome do operador no rodapé.");
      return;
    }
    setError(null);
    setMessage(null);
    try {
      setCompleteDraft(buildCompleteDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dados inválidos");
    }
  }

  async function handleComplete() {
    if (!lot || !completeDraft) return;
    if (!canExecute) {
      setError("Seu perfil não pode executar etapas no chão.");
      return;
    }
    if (!online) {
      setError(OFFLINE_ACTION_MSG);
      return;
    }
    if (!operatorId) {
      setError("Informe o nome do operador no rodapé.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    setCompletedLotId(null);
    setStaleConflict(false);
    try {
      const db = getFirestoreDb();
      const result = await completeStep(db, {
        lotId: lot.id,
        operationId: newOperationId(),
        outputQuantity: completeDraft.outputQuantity,
        lossQuantity: completeDraft.lossQuantity,
        lossReason: completeDraft.lossReasonSnapshot,
        lossReasonId: completeDraft.lossReasonId,
        operatorId,
      });
      setCompleteDraft(null);
      setLot(result.lot);
      setStep(
        result.nextStepReady
          ? await getActiveStepRun(db, lot.id)
          : result.step,
      );

      if (result.alreadyApplied) {
        setMessage("✓ ETAPA REGISTRADA (já aplicada neste dispositivo)");
      } else if (result.nextStepReady && result.lot.currentStep) {
        const nextStation = getStationForStep(result.lot.currentStep);
        if (station.stepType === "PROOFING") {
          setMessage(
            `✓ PRONTO PARA FORNO · PRONTO ≠ transferido${
              nextStation ? ` · escaneie em ${nextStation.label}` : ""
            }`,
          );
        } else if (station.stepType === "BAKING") {
          setMessage(
            `✓ FORNO FINALIZADO · resfriamento iniciado${
              nextStation ? ` · ${nextStation.label}` : ""
            }`,
          );
        } else if (station.stepType === "COOLING") {
          setMessage(
            `✓ PRONTO PARA EMBALAGEM${
              nextStation ? ` · escaneie em ${nextStation.label}` : ""
            }`,
          );
        } else {
          setMessage(
            `✓ ETAPA REGISTRADA · Enviado para ${stepTypeLabel(result.lot.currentStep)}${
              nextStation ? ` · ${nextStation.label}` : ""
            }`,
          );
        }
      } else if (station.stepType === "PACKAGING") {
        setMessage("✓ LOTE CONCLUÍDO · embalagem finalizada");
        setCompletedLotId(result.lot.id);
      } else {
        setMessage("✓ ETAPA REGISTRADA · Lote concluído");
        if (result.lot.status === "COMPLETED") {
          setCompletedLotId(result.lot.id);
        }
      }
      await loadQueue();
    } catch (err) {
      applyWorkflowError(err, "Falha ao finalizar");
      await refreshLot(lot.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col ${
        useStationMonitor ? "max-w-2xl" : "max-w-lg"
      }`}
    >
      {!lot ? (
        <div className="flex flex-1 flex-col text-center">
          {useStationMonitor ? (
            <div className="flex flex-1 flex-col">
              {isProofingStation ? (
                <FloorProofingBoard
                  items={liveQueue}
                  chamberLabel={station.label}
                  onSelectLot={(lotCode) => void identifyLot(lotCode)}
                  onRefresh={() => void loadQueue()}
                />
              ) : null}
              {isBakingStation ? (
                <FloorBakingBoard
                  items={liveQueue}
                  ovenLabel={station.label}
                  onSelectLot={(lotCode) => void identifyLot(lotCode)}
                  onRefresh={() => void loadQueue()}
                />
              ) : null}
              {isCoolingStation ? (
                <FloorCoolingBoard
                  items={liveQueue}
                  stationLabel={station.label}
                  onSelectLot={(lotCode) => void identifyLot(lotCode)}
                  onRefresh={() => void loadQueue()}
                />
              ) : null}
              {isPackagingStation ? (
                <FloorPackagingBoard
                  items={liveQueue}
                  stationLabel={station.label}
                  onSelectLot={(lotCode) => void identifyLot(lotCode)}
                  onRefresh={() => void loadQueue()}
                />
              ) : null}
              {isPrepStation ? (
                <FloorPrepBoard
                  items={liveQueue}
                  stepType={station.stepType}
                  stationLabel={station.label}
                  onSelectLot={(lotCode) => void identifyLot(lotCode)}
                  onRefresh={() => void loadQueue()}
                />
              ) : null}

              <FloorStationScanBlock
                caption={
                  isBakingStation
                    ? "Carregar · escanear QR"
                    : isCoolingStation
                      ? "Identificar · escanear QR"
                      : "Entrada · escanear QR"
                }
                active={!lot}
                code={code}
                busy={busy}
                manualEntry={manualEntry}
                error={error}
                onScan={(raw) => void identifyLot(raw)}
                onCodeChange={setCode}
                onIdentify={() => void identifyLot(code)}
                onToggleManual={setManualEntry}
                onClearError={() => {
                  setError(null);
                  setCode("");
                }}
              />
            </div>
          ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-4">
            <p className="floor-eyebrow">{station.label}</p>
            <h1 className="floor-title mt-3 text-center">PRONTO PARA PRODUZIR</h1>
            <p className="mt-2 text-base font-medium text-dc-text-secondary">
              {liveQueue.length === 0
                ? "Nenhum lote aguardando"
                : liveQueue.length === 1
                  ? "1 lote aguardando"
                  : `${liveQueue.length} lotes aguardando`}
            </p>

            <div className="mt-8 w-full">
              <FloorQrScanner
                active={!lot}
                onScan={(raw) => {
                  void identifyLot(raw);
                }}
              />
            </div>

            {manualEntry ? (
              <form
                className="mt-6 w-full space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void identifyLot(code);
                }}
              >
                <label className="block text-left text-sm font-medium text-dc-text-muted">
                  Digitar lote
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex.: PH26082801"
                    autoFocus
                    className="mt-1.5 h-14 w-full rounded-[14px] border border-dc-border bg-dc-surface px-4 text-lg tabular-nums outline-none focus:border-dc-orange"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !code.trim()}
                  className="floor-btn-finish"
                >
                  {busy ? "BUSCANDO…" : "IDENTIFICAR LOTE"}
                </button>
                <button
                  type="button"
                  onClick={() => setManualEntry(false)}
                  className="w-full text-center text-sm font-medium text-dc-text-muted"
                >
                  Voltar ao scanner
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setManualEntry(true)}
                className="mt-6 text-sm font-semibold text-dc-text-secondary underline-offset-2 hover:underline"
              >
                Não consegue escanear? DIGITAR LOTE
              </button>
            )}

            {error ? (
              <div className="mt-5 w-full rounded-[18px] border border-danger/25 bg-danger-soft px-4 py-4 text-left">
                <p className="text-base font-bold text-danger">
                  {(() => {
                    const u = error.toUpperCase();
                    if (u.includes("QR NÃO RECONHECIDO")) return "QR NÃO RECONHECIDO";
                    if (u.includes("BLOQUEADO")) return "LOTE BLOQUEADO";
                    if (
                      u.includes("VERIFIQUE O CÓDIGO") ||
                      u.includes("NÃO ENCONTRADO")
                    ) {
                      return "LOTE NÃO ENCONTRADO";
                    }
                    return "ATENÇÃO";
                  })()}
                </p>
                <p className="mt-1.5 text-sm text-dc-text-secondary">{error}</p>
                {code.trim() ? (
                  <p className="mt-1 text-sm tabular-nums text-dc-text-muted">
                    {code.trim()}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCode("");
                  }}
                  className="mt-4 text-sm font-bold text-dc-orange"
                >
                  ESCANEAR NOVAMENTE
                </button>
              </div>
            ) : null}
          </div>
          )}

                    {!useStationMonitor && queueAlerts.length > 0 ? (
            <div className="mt-6 space-y-2 text-left" role="status">
              {queueAlerts.map((item) => (
                <button
                  key={item.lot.id}
                  type="button"
                  onClick={() => void identifyLot(item.lot.lotCode)}
                  className={`flex w-full items-start gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold ${
                    item.timing === "LATE"
                      ? "bg-danger-soft text-danger"
                      : "bg-warning-soft text-warning"
                  }`}
                >
                  <span className="shrink-0">
                    {item.timing === "LATE" ? "ATRASADO" : "ATENÇÃO"}
                  </span>
                  <span className="min-w-0">
                    <span className="tabular-nums">{item.lot.lotCode}</span>
                    <span className="font-medium opacity-80">
                      {" "}
                      · {stepTypeLabel(station.stepType)}
                      {item.timing
                        ? ` · ${timingStatusLabel(item.timing)}`
                        : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {!useStationMonitor ? (
          <div className="floor-panel mt-8 p-4 text-left">
            <div className="flex items-center justify-between">
              <p className="floor-eyebrow">
                Próximos · {stepTypeLabel(station.stepType)}
              </p>
              <button
                type="button"
                onClick={() => void loadQueue()}
                className="text-xs font-bold text-dc-orange"
              >
                Atualizar
              </button>
            </div>
            {liveQueue.length === 0 ? (
              <div className="mt-4">
                <p className="text-lg font-semibold text-dc-text">
                  TUDO CERTO POR AQUI
                </p>
                <p className="mt-1 text-sm text-dc-text-secondary">
                  Nenhum lote aguardando nesta estação.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {liveQueue.map((item) => (
                  <li key={item.lot.id}>
                    <button
                      type="button"
                      onClick={() => void identifyLot(item.lot.lotCode)}
                      className="flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-3 text-left transition hover:bg-dc-surface-secondary"
                    >
                      <span className="text-base font-semibold tabular-nums">
                        {item.lot.lotCode}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {item.timing === "LATE" ||
                        item.timing === "ATTENTION" ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${timingClasses(item.timing)}`}
                          >
                            {timingStatusLabel(item.timing)}
                          </span>
                        ) : null}
                        <span className="text-sm text-dc-text-secondary">
                          {executionStatusLabel(
                            item.lot.currentStepStatus,
                            item.lot.status,
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <button
            type="button"
            className="self-start rounded-[10px] px-2 py-1 text-sm font-semibold text-dc-text-secondary transition hover:bg-dc-surface-secondary hover:text-dc-text"
            onClick={() => {
              setLot(null);
              setStep(null);
              setProduct(null);
              setOrder(null);
              setInfoOpen(false);
              setOccurrenceOpen(false);
              setMessage(null);
              setError(null);
              setCompleteDraft(null);
              setStaleConflict(false);
              setOutputQty("");
              setLossQty("");
              setLossNotes("");
              void loadQueue();
            }}
          >
            ← Outro lote
          </button>

          <p className="floor-eyebrow mt-5">{station.label}</p>
          <h1 className="floor-lot-code mt-2 text-dc-text">{lot.lotCode}</h1>
          <p className="mt-2 text-base text-dc-text-secondary">
            {product?.name ?? lot.productId}
            {operatorName.trim()
              ? ` · Op. ${operatorName.trim()}`
              : " · informe o operador"}
          </p>

          <div className="floor-panel mt-6 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-dc-text-muted">Etapa atual</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {lot.currentStep ? stepTypeLabel(lot.currentStep) : "—"}
                </p>
                <p className="mt-1.5 text-sm text-dc-text-secondary">
                  {executionStatusLabel(lot.currentStepStatus, lot.status)}
                </p>
              </div>
              {step?.status === "IN_PROGRESS" ? (
                <span
                  className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold ${timingClasses(liveTiming)}`}
                >
                  {timingStatusLabel(liveTiming)}
                </span>
              ) : null}
            </div>
            {step?.status === "IN_PROGRESS" ? (
              <p className="floor-timer mt-5 text-dc-text">
                {elapsedLabel(step.startedAt)}
              </p>
            ) : null}
            {step?.stepType === "COOLING" &&
            step.status === "IN_PROGRESS" &&
            step.expectedFinishAt ? (
              <div className="mt-4 rounded-[14px] border border-dc-border bg-dc-bg px-4 py-3">
                <p className="text-sm font-medium text-dc-text-muted">
                  Tempo mínimo de resfriamento
                </p>
                {coolingReady ? (
                  <p className="mt-1.5 text-base font-semibold text-success">
                    Mínimo concluído · liberado para embalagem
                  </p>
                ) : (
                  <p className="floor-timer-sm mt-2 text-dc-text">
                    Faltam {remainingClock(coolingRemainingMs ?? 0)}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-dc-text-muted">
                  Liberação{" "}
                  {new Date(step.expectedFinishAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ) : step?.expectedFinishAt && step.status === "IN_PROGRESS" ? (
              <p className="mt-2 text-sm text-dc-text-muted">
                Meta:{" "}
                {new Date(step.expectedFinishAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
            {step?.equipmentId ? (
              <p className="mt-3 text-sm text-dc-text-secondary">
                Equipamento:{" "}
                <span className="font-semibold tabular-nums text-dc-text">
                  {equipmentOptions.find((e) => e.id === step.equipmentId)
                    ?.code ?? step.equipmentId}
                </span>
              </p>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            {!online ? (
              <p className="rounded-xl bg-warning-soft px-3 py-3 text-left text-sm text-dc-text">
                SEM CONEXÃO COM O SISTEMA
                <span className="mt-1 block text-xs text-dc-text-secondary">
                  O lote permanece visível. Iniciar e finalizar etapa ficam
                  indisponíveis até reconectar.
                </span>
              </p>
            ) : null}
            {lot.currentStep === station.stepType &&
            lot.currentStepStatus === "READY" ? (
              <>
                {isPackagingStation && step?.inputQuantity != null ? (
                  <p className="rounded-xl border border-dc-border bg-dc-surface px-3 py-2 text-left text-xs text-dc-text-secondary">
                    Quantidade recebida (etapa anterior):{" "}
                    <strong className="tabular-nums text-dc-text">
                      {step.inputQuantity.toLocaleString("pt-BR")} un.
                    </strong>
                    {" "}
                    — validade / peso médio só com regra oficial do produto.
                  </p>
                ) : null}
                {isBakingStation && step?.standardDurationMinutes != null ? (
                  <p className="rounded-xl border border-dc-border bg-dc-surface px-3 py-2 text-left text-xs text-dc-text-secondary">
                    Tempo programado (snapshot):{" "}
                    <strong className="text-dc-text">
                      {formatStandardMinutes(step.standardDurationMinutes)}
                    </strong>
                    . Temperatura oficial quando existir no produto — não
                    inventada aqui.
                  </p>
                ) : null}
                {equipmentOptions.length > 0 ? (
                  <label className="block text-left text-xs text-dc-text-muted">
                    Equipamento
                    <select
                      value={equipmentId}
                      onChange={(e) => setEquipmentId(e.target.value)}
                      className="mt-1 h-12 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-base outline-none focus:border-dc-orange"
                    >
                      {equipmentOptions.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.code} · {eq.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-left text-xs text-dc-text-muted">
                    Sem equipamento cadastrado para esta etapa.{" "}
                    <Link
                      href="/app/settings/equipment"
                      className="font-medium text-dc-orange"
                    >
                      Cadastrar →
                    </Link>
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy || !online || !canExecute}
                  onClick={() => void handleStart()}
                  className="floor-btn-primary"
                >
                  {busy
                    ? "INICIANDO…"
                    : online
                      ? stepActionLabel.start
                      : "AGUARDANDO CONEXÃO"}
                </button>
              </>
            ) : null}
            {lot.currentStep === station.stepType &&
            lot.currentStepStatus === "IN_PROGRESS" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-left">
                  <label className="block text-xs text-dc-text-muted">
                    Saída (un.)
                    <input
                      inputMode="decimal"
                      value={outputQty}
                      onChange={(e) => setOutputQty(e.target.value)}
                      className="mt-1 h-12 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-base tabular-nums outline-none focus:border-dc-orange"
                    />
                  </label>
                  <label className="block text-xs text-dc-text-muted">
                    Perda (un.)
                    <input
                      inputMode="decimal"
                      value={lossQty}
                      onChange={(e) => setLossQty(e.target.value)}
                      placeholder="auto"
                      className="mt-1 h-12 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-base tabular-nums outline-none focus:border-dc-orange"
                    />
                  </label>
                </div>
                <div className="text-left">
                  <p className="text-xs text-dc-text-muted">Motivo da perda</p>
                  {lossReasons.length === 0 ? (
                    <p className="mt-1 text-xs text-dc-text-secondary">
                      Nenhum motivo cadastrado.{" "}
                      <Link
                        href="/app/settings/loss-reasons"
                        className="font-medium text-dc-orange"
                      >
                        Cadastrar →
                      </Link>
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lossReasons.map((reason) => (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() => setLossReasonId(reason.id)}
                          className={
                            lossReasonId === reason.id
                              ? "rounded-xl bg-dc-orange px-3 py-2 text-sm font-semibold text-white"
                              : "rounded-xl border border-dc-border bg-dc-surface px-3 py-2 text-sm font-medium text-dc-text-secondary"
                          }
                        >
                          {reason.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedLossReason ? (
                    <label className="mt-3 block text-xs text-dc-text-muted">
                      {selectedLossReason.requiresNotes
                        ? "Descreva o motivo"
                        : "Observação (opcional)"}
                      <input
                        value={lossNotes}
                        onChange={(e) => setLossNotes(e.target.value)}
                        placeholder={
                          selectedLossReason.requiresNotes
                            ? "Obrigatório se houver perda"
                            : "Detalhe opcional"
                        }
                        className="mt-1 h-12 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-base outline-none focus:border-dc-orange"
                      />
                    </label>
                  ) : null}
                </div>
                <p className="text-left text-[11px] text-dc-text-muted">
                  Se perda ficar vazia, calcula saída − entrada quando possível.
                </p>
                {!coolingReady && step?.stepType === "COOLING" ? (
                  <p className="text-left text-sm text-warning">
                    Tempo mínimo ainda não atingido. Embalagem permanece
                    bloqueada.
                  </p>
                ) : null}
                {completeDraft ? (
                  <div className="space-y-3 rounded-2xl border border-dc-border bg-dc-surface-secondary px-4 py-4 text-left">
                    <p className="text-xs font-medium tracking-wide text-dc-text-muted">
                      O QUE SERÁ REGISTRADO
                    </p>
                    <p className="text-base font-semibold text-dc-text">
                      {completeDraft.title}
                      {completeDraft.outputQuantity != null
                        ? ` · Produzido ${formatQty(completeDraft.outputQuantity)}`
                        : ""}
                      {completeDraft.effectiveLoss != null &&
                      completeDraft.effectiveLoss > 0
                        ? ` · Perda ${formatQty(completeDraft.effectiveLoss)}`
                        : ""}
                      {completeDraft.lossPercent != null &&
                      completeDraft.effectiveLoss != null &&
                      completeDraft.effectiveLoss > 0
                        ? ` · ${completeDraft.lossPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
                        : ""}
                    </p>
                    {completeDraft.plannedIn != null ? (
                      <p className="text-xs text-dc-text-secondary">
                        Esperado / entrada: {formatQty(completeDraft.plannedIn)}
                      </p>
                    ) : null}
                    {completeDraft.effectiveLoss != null &&
                    completeDraft.effectiveLoss > 0 &&
                    completeDraft.lossReasonLabel ? (
                      <p className="text-xs text-dc-text-secondary">
                        Motivo: {completeDraft.lossReasonLabel}
                        {lossNotes.trim() ? ` · ${lossNotes.trim()}` : ""}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busy || !online}
                        onClick={() => void handleComplete()}
                        className="flex h-[72px] w-full items-center justify-center rounded-2xl bg-dc-orange text-lg font-semibold text-white disabled:opacity-50"
                      >
                        {busy
                          ? "FINALIZANDO…"
                          : !online
                            ? "AGUARDANDO CONEXÃO"
                            : "CONFIRMAR"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setCompleteDraft(null)}
                        className="flex h-12 w-full items-center justify-center rounded-2xl border border-dc-border text-sm font-semibold text-dc-text-secondary"
                      >
                        Voltar e ajustar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !online ||
                      !canExecute ||
                      (step?.stepType === "COOLING" && !coolingReady)
                    }
                    onClick={() => requestCompleteConfirm()}
                    className="floor-btn-finish"
                  >
                    {busy
                      ? "…"
                      : !online
                        ? "AGUARDANDO CONEXÃO"
                        : step?.stepType === "COOLING"
                          ? coolingReady
                            ? "LIBERAR PARA EMBALAGEM"
                            : "AGUARDANDO TEMPO MÍNIMO"
                          : stepActionLabel.finish}
                  </button>
                )}
              </div>
            ) : null}
            {lot.currentStepStatus === "READY" &&
            lot.currentStep &&
            lot.currentStep !== station.stepType ? (
              <p className="text-center text-sm text-dc-text-secondary">
                Próxima estação:{" "}
                {getStationForStep(lot.currentStep)?.label ??
                  stepTypeLabel(lot.currentStep)}
              </p>
            ) : null}
            {lot.status === "COMPLETED" ? (
              <div className="space-y-3 rounded-2xl border border-success/30 bg-success/5 px-4 py-4 text-center">
                <p className="text-sm font-semibold text-success">
                  Lote concluído
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href={lotTraceabilityHref(lot.id)}
                    className="inline-flex h-11 items-center rounded-[12px] bg-dc-orange px-4 text-sm font-semibold text-white"
                  >
                    Rastreabilidade →
                  </Link>
                  <Link
                    href="/display/production"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center rounded-[12px] border border-dc-border bg-dc-surface px-4 text-sm font-semibold text-dc-text"
                  >
                    Display TV
                  </Link>
                  <Link
                    href="/app/settings/qa"
                    className="inline-flex h-11 items-center rounded-[12px] border border-dc-border bg-dc-surface px-4 text-sm font-semibold text-dc-text"
                  >
                    Marcar no QA
                  </Link>
                </div>
              </div>
            ) : null}
            {lot.status === "BLOCKED" ? (
              <div className="rounded-2xl bg-danger-soft px-4 py-3 text-left">
                <p className="text-sm font-semibold text-danger">
                  PROCESSO BLOQUEADO
                </p>
                <p className="mt-1 text-xs text-dc-text-secondary">
                  Aguardando liberação em Qualidade.
                </p>
              </div>
            ) : null}
          </div>

          {lot.status !== "COMPLETED" && lot.status !== "BLOCKED" ? (
            <button
              type="button"
              disabled={busy || !online}
              onClick={() => setOccurrenceOpen(true)}
              className="mt-4 h-12 w-full rounded-2xl border border-dc-border text-sm font-semibold text-dc-text-secondary disabled:opacity-50"
            >
              Registrar ocorrência
            </button>
          ) : null}

          {message ? (
            <div className="mt-4 text-center">
              <p className="text-sm text-success">{message}</p>
              {completedLotId ? (
                <Link
                  href={lotTraceabilityHref(completedLotId)}
                  className="mt-2 inline-block text-sm font-semibold text-dc-orange"
                >
                  Ver rastreabilidade do lote →
                </Link>
              ) : null}
            </div>
          ) : null}
          {staleConflict ? (
            <div className="mt-4 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-4 text-center">
              <p className="text-sm font-semibold text-danger">
                ESTE LOTE JÁ FOI ATUALIZADO
              </p>
              <p className="mt-1 text-xs text-dc-text-secondary">
                Etapa atual{" "}
                {lot.currentStep
                  ? stepTypeLabel(lot.currentStep).toUpperCase()
                  : "—"}
                . Não é possível sobrescrever.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRefreshAfterConflict()}
                className="mt-3 h-12 w-full rounded-2xl bg-dc-text text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "ATUALIZANDO…" : "ATUALIZAR"}
              </button>
            </div>
          ) : error ? (
            <p className="mt-4 text-center text-sm text-danger">{error}</p>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="text-center text-sm font-medium text-dc-text-secondary underline-offset-2 hover:underline"
            >
              Ver informações do lote
            </button>
            <Link
              href={`/app/cockpit/production/lots/${lot.id}`}
              className="text-center text-sm font-medium text-dc-orange"
            >
              Linha do tempo (Cockpit)
            </Link>
          </div>

          <FloorLotQuickInfo
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            lot={lot}
            product={product}
            order={order}
            startedAt={step?.startedAt}
          />
          <FloorOccurrenceSheet
            open={occurrenceOpen}
            onClose={() => setOccurrenceOpen(false)}
            lotCode={lot.lotCode}
            lotId={lot.id}
            stepType={lot.currentStep}
            stationId={station.id}
            online={online}
            onRegistered={({ message: msg }) => {
              setMessage(msg);
              setError(null);
              void refreshLot(lot.id);
              void loadQueue();
            }}
          />
        </div>
      )}
    </div>
  );
}
