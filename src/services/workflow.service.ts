import { doc, setDoc, type Firestore } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import {
  getNextStepType,
  getStepDefinition,
  stepTypeLabel,
} from "@/domain/production/process-route";
import {
  createProductionEvent,
  findEventByOperationId,
  getActiveStepRun,
  listOpenStepRuns,
  listStepRunsByLot,
  upsertStepRun,
} from "@/repositories/execution.repository";
import { setEquipmentStatus } from "@/repositories/equipment.repository";
import {
  getLotById,
  listLotsByOrder,
  upsertLot,
} from "@/repositories/lots.repository";
import { getProductionOrder } from "@/repositories/orders.repository";
import type {
  LotStepRun,
  ProductionEvent,
  ProductionLot,
  TimingStatus,
} from "@/types/production";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function computeTimingStatus(
  startedAt: string,
  expectedFinishAt: string,
  toleranceMinutes: number,
  now = new Date(),
): TimingStatus {
  const expected = new Date(expectedFinishAt).getTime();
  const started = new Date(startedAt).getTime();
  const elapsed = now.getTime() - started;
  const standard = expected - started;
  const lateLimit = expected + toleranceMinutes * 60_000;
  const attentionThreshold = expected - Math.min(standard * 0.15, 15 * 60_000);

  if (now.getTime() > lateLimit) return "LATE";
  if (now.getTime() >= attentionThreshold) return "ATTENTION";
  if (elapsed >= 0) return "ON_TIME";
  return "NOT_STARTED";
}

/**
 * Fecha a OP quando todos os lotes estão COMPLETED ou CANCELLED
 * e pelo menos um foi COMPLETED (não fecha OP só com cancelados).
 */
async function maybeCompleteProductionOrder(
  db: Firestore,
  productionOrderId: string,
  completingLotId: string,
  nowIso: string,
): Promise<void> {
  const lots = await listLotsByOrder(db, productionOrderId);
  if (lots.length === 0) return;

  const allTerminal = lots.every(
    (l) => l.status === "COMPLETED" || l.status === "CANCELLED",
  );
  const anyCompleted = lots.some((l) => l.status === "COMPLETED");
  if (!allTerminal || !anyCompleted) return;

  const order = await getProductionOrder(db, productionOrderId);
  if (!order || order.productionStatus === "COMPLETED") return;
  if (order.productionStatus === "CANCELLED") return;

  await setDoc(
    doc(db, COLLECTIONS.productionOrders, order.id),
    omitUndefined({
      ...order,
      productionStatus: "COMPLETED" as const,
      updatedAt: nowIso,
    }),
    { merge: true },
  );

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId: completingLotId,
    productionOrderId,
    type: "ORDER_COMPLETED",
    occurredAt: nowIso,
    createdAt: nowIso,
    metadata: { lotCount: lots.length },
  });
}

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000,
    ),
  );
}

/** Liberação do resfriamento = startedAt + tempo mínimo (expectedFinishAt). */
export function getCoolingReleaseAt(step: LotStepRun): string | null {
  if (step.stepType !== "COOLING") return null;
  if (step.expectedFinishAt) return step.expectedFinishAt;
  const mins =
    step.standardDurationMinutes ??
    getStepDefinition("COOLING")?.standardDurationMinutes;
  if (!step.startedAt || mins == null) return null;
  return new Date(
    new Date(step.startedAt).getTime() + mins * 60_000,
  ).toISOString();
}

export function coolingMinimumRemainingMs(
  step: LotStepRun,
  now = Date.now(),
): number | null {
  const releaseAt = getCoolingReleaseAt(step);
  if (!releaseAt) return null;
  return new Date(releaseAt).getTime() - now;
}

export function isCoolingMinimumReached(
  step: LotStepRun,
  now = new Date(),
): boolean {
  if (step.stepType !== "COOLING") return true;
  const rem = coolingMinimumRemainingMs(step, now.getTime());
  if (rem == null) return true;
  return rem <= 0;
}

function assertCoolingMinimumReached(step: LotStepRun, now = new Date()): void {
  if (step.stepType !== "COOLING") return;
  const rem = coolingMinimumRemainingMs(step, now.getTime());
  if (rem == null || rem <= 0) return;
  const mins = Math.max(1, Math.ceil(rem / 60_000));
  throw new Error(
    `ESTE LOTE AINDA NÃO PODE SER EMBALADO. Faltam ${mins} minuto(s) de resfriamento.`,
  );
}

export interface WorkflowCommandResult {
  lot: ProductionLot;
  step: LotStepRun;
  event: ProductionEvent;
  alreadyApplied: boolean;
}

export async function startStep(
  db: Firestore,
  input: {
    lotId: string;
    operationId: string;
    operatorId?: string;
    stationId?: string;
    equipmentId?: string;
  },
): Promise<WorkflowCommandResult> {
  const existingOp = await findEventByOperationId(db, input.operationId);
  if (existingOp) {
    const lot = await getLotById(db, input.lotId);
    const step = await getActiveStepRun(db, input.lotId);
    if (!lot || !step) {
      throw new Error("Operação já registrada, mas lote/etapa não encontrados.");
    }
    return { lot, step, event: existingOp, alreadyApplied: true };
  }

  const lot = await getLotById(db, input.lotId);
  if (!lot) throw new Error("Lote não encontrado.");
  if (lot.status === "BLOCKED") throw new Error("Lote bloqueado.");
  if (lot.status === "COMPLETED") throw new Error("Lote já concluído.");

  const step = await getActiveStepRun(db, input.lotId);
  if (!step || step.status !== "READY") {
    const currentLabel = lot.currentStep
      ? stepTypeLabel(lot.currentStep).toUpperCase()
      : "—";
    if (lot.currentStepStatus === "IN_PROGRESS") {
      throw new Error(
        `ESTE LOTE JÁ FOI ATUALIZADO. Etapa atual ${currentLabel}`,
      );
    }
    throw new Error("Lote não está pronto para iniciar nesta etapa.");
  }

  const def = getStepDefinition(step.stepType, lot.processRoute);
  const now = new Date();
  const nowIso = now.toISOString();
  const durationMs =
    (step.standardDurationMinutes ??
      def?.standardDurationMinutes ??
      12) * 60_000;
  const expectedFinishAt = new Date(now.getTime() + durationMs).toISOString();
  const waitingDurationMinutes = step.readyAt
    ? minutesBetween(step.readyAt, nowIso)
    : undefined;

  const updatedStep: LotStepRun = {
    ...step,
    status: "IN_PROGRESS",
    timingStatus: "ON_TIME",
    startedAt: nowIso,
    expectedFinishAt,
    waitingDurationMinutes,
    standardDurationMinutes:
      step.standardDurationMinutes ?? def?.standardDurationMinutes,
    toleranceMinutes: step.toleranceMinutes ?? def?.lateToleranceMinutes,
    operatorId: input.operatorId,
    stationId: input.stationId,
    equipmentId: input.equipmentId,
    updatedAt: nowIso,
  };
  await upsertStepRun(db, updatedStep);

  if (input.equipmentId) {
    await setEquipmentStatus(db, input.equipmentId, "OPERATING");
  }

  const updatedLot: ProductionLot = {
    ...lot,
    status: "IN_PROGRESS",
    currentStep: step.stepType,
    currentStepStatus: "IN_PROGRESS",
    startedAt: lot.startedAt ?? nowIso,
    updatedAt: nowIso,
  };
  await upsertLot(db, updatedLot);

  const order = await getProductionOrder(db, lot.productionOrderId);
  if (order && order.productionStatus === "RELEASED") {
    await setDoc(
      doc(db, COLLECTIONS.productionOrders, order.id),
      omitUndefined({
        ...order,
        productionStatus: "IN_PROGRESS",
        updatedAt: nowIso,
      }),
      { merge: true },
    );
  }

  const event = await createProductionEvent(db, {
    id: newId("evt"),
    lotId: lot.id,
    productionOrderId: lot.productionOrderId,
    type: "STEP_STARTED",
    stepType: step.stepType,
    operatorId: input.operatorId,
    stationId: input.stationId,
    equipmentId: input.equipmentId,
    occurredAt: nowIso,
    operationId: input.operationId,
    createdAt: nowIso,
    metadata: {
      waitingDurationMinutes,
    },
  });

  return { lot: updatedLot, step: updatedStep, event, alreadyApplied: false };
}

export async function completeStep(
  db: Firestore,
  input: {
    lotId: string;
    operationId: string;
    outputQuantity?: number;
    lossQuantity?: number;
    lossReason?: string;
    lossReasonId?: string;
    operatorId?: string;
  },
): Promise<WorkflowCommandResult & { nextStepReady: boolean }> {
  const existingOp = await findEventByOperationId(db, input.operationId);
  if (existingOp) {
    const lot = await getLotById(db, input.lotId);
    const steps = await listStepRunsByLot(db, input.lotId);
    const step =
      steps.find((s) => s.status === "IN_PROGRESS") ??
      steps.find((s) => s.stepType === existingOp.stepType) ??
      steps[steps.length - 1];
    if (!lot || !step) {
      throw new Error("Operação já registrada, mas lote/etapa não encontrados.");
    }
    return {
      lot,
      step,
      event: existingOp,
      alreadyApplied: true,
      nextStepReady: Boolean(getNextStepType(step.stepType, lot.processRoute)),
    };
  }

  const lot = await getLotById(db, input.lotId);
  if (!lot) throw new Error("Lote não encontrado.");
  if (lot.status === "BLOCKED") throw new Error("Lote bloqueado.");
  if (lot.status === "COMPLETED") throw new Error("Lote já concluído.");

  const step = await getActiveStepRun(db, input.lotId);
  if (!step || step.status !== "IN_PROGRESS") {
    const currentLabel = lot.currentStep
      ? stepTypeLabel(lot.currentStep).toUpperCase()
      : "—";
    throw new Error(
      `ESTE LOTE JÁ FOI ATUALIZADO. Etapa atual ${currentLabel}`,
    );
  }

  assertCoolingMinimumReached(step);

  const nowIso = new Date().toISOString();
  const def = getStepDefinition(step.stepType, lot.processRoute);
  const timingStatus: TimingStatus = step.startedAt && step.expectedFinishAt
    ? computeTimingStatus(
        step.startedAt,
        step.expectedFinishAt,
        def?.lateToleranceMinutes ?? 0,
      )
    : "COMPLETED";

  const inputQty = step.inputQuantity ?? lot.plannedQuantity;
  const outputQty = input.outputQuantity ?? inputQty;
  const lossQty =
    input.lossQuantity ??
    (inputQty != null && outputQty != null
      ? Math.max(0, inputQty - outputQty)
      : undefined);
  const lossReason =
    lossQty != null && lossQty > 0
      ? input.lossReason?.trim() || undefined
      : undefined;
  const lossReasonId =
    lossQty != null && lossQty > 0 ? input.lossReasonId : undefined;

  if (lossQty != null && lossQty > 0 && !lossReason) {
    throw new Error("Informe o motivo da perda.");
  }

  const processDurationMinutes = step.startedAt
    ? minutesBetween(step.startedAt, nowIso)
    : undefined;

  const completedStep: LotStepRun = {
    ...step,
    status: "COMPLETED",
    timingStatus: timingStatus === "LATE" ? "LATE" : "COMPLETED",
    finishedAt: nowIso,
    inputQuantity: inputQty,
    outputQuantity: outputQty,
    lossQuantity: lossQty,
    lossReason,
    lossReasonId,
    processDurationMinutes,
    operatorId: input.operatorId ?? step.operatorId,
    updatedAt: nowIso,
  };
  await upsertStepRun(db, completedStep);

  if (step.equipmentId) {
    const openSteps = await listOpenStepRuns(db);
    const stillInUse = openSteps.some(
      (s) =>
        s.id !== step.id &&
        s.status === "IN_PROGRESS" &&
        s.equipmentId === step.equipmentId,
    );
    if (!stillInUse) {
      await setEquipmentStatus(db, step.equipmentId, "AVAILABLE");
    }
  }

  const event = await createProductionEvent(db, {
    id: newId("evt"),
    lotId: lot.id,
    productionOrderId: lot.productionOrderId,
    type: "STEP_COMPLETED",
    stepType: step.stepType,
    operatorId: completedStep.operatorId,
    occurredAt: nowIso,
    operationId: input.operationId,
    createdAt: nowIso,
    metadata: {
      outputQuantity: outputQty,
      lossQuantity: lossQty,
      lossReason,
      lossReasonId,
      processDurationMinutes,
      waitingDurationMinutes: step.waitingDurationMinutes,
    },
  });

  if (lossQty != null && lossQty > 0) {
    await createProductionEvent(db, {
      id: newId("evt"),
      lotId: lot.id,
      productionOrderId: lot.productionOrderId,
      type: "LOSS_RECORDED",
      stepType: step.stepType,
      stationId: step.stationId,
      occurredAt: nowIso,
      createdAt: nowIso,
      metadata: {
        stepRunId: step.id,
        lossQuantity: lossQty,
        lossReason,
        lossReasonId,
        outputQuantity: outputQty,
        inputQuantity: inputQty,
      },
    });
  }

  const nextType = getNextStepType(step.stepType, lot.processRoute);
  if (!nextType) {
    const completedLot: ProductionLot = {
      ...lot,
      status: "COMPLETED",
      currentStep: step.stepType,
      currentStepStatus: "COMPLETED",
      completedAt: nowIso,
      updatedAt: nowIso,
    };
    await upsertLot(db, completedLot);
    await createProductionEvent(db, {
      id: newId("evt"),
      lotId: lot.id,
      productionOrderId: lot.productionOrderId,
      type: "LOT_COMPLETED",
      occurredAt: nowIso,
      createdAt: nowIso,
    });
    await maybeCompleteProductionOrder(
      db,
      lot.productionOrderId,
      lot.id,
      nowIso,
    );
    return {
      lot: completedLot,
      step: completedStep,
      event,
      alreadyApplied: false,
      nextStepReady: false,
    };
  }

  const nextDef = getStepDefinition(nextType, lot.processRoute);
  const autoStartCooling = nextType === "COOLING";
  const coolingDurationMs =
    (nextDef?.standardDurationMinutes ?? 60) * 60_000;
  const coolingReleaseAt = autoStartCooling
    ? new Date(new Date(nowIso).getTime() + coolingDurationMs).toISOString()
    : undefined;

  const nextStep: LotStepRun = autoStartCooling
    ? {
        id: newId("step"),
        lotId: lot.id,
        stepType: nextType,
        sequence: nextDef?.sequence ?? step.sequence + 1,
        status: "IN_PROGRESS",
        timingStatus: "ON_TIME",
        standardDurationMinutes: nextDef?.standardDurationMinutes,
        toleranceMinutes: nextDef?.lateToleranceMinutes,
        readyAt: nowIso,
        startedAt: nowIso,
        expectedFinishAt: coolingReleaseAt,
        inputQuantity: outputQty,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : {
        id: newId("step"),
        lotId: lot.id,
        stepType: nextType,
        sequence: nextDef?.sequence ?? step.sequence + 1,
        status: "READY",
        timingStatus: "NOT_STARTED",
        standardDurationMinutes: nextDef?.standardDurationMinutes,
        toleranceMinutes: nextDef?.lateToleranceMinutes,
        readyAt: nowIso,
        inputQuantity: outputQty,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
  await upsertStepRun(db, nextStep);

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId: lot.id,
    productionOrderId: lot.productionOrderId,
    type: autoStartCooling ? "STEP_STARTED" : "STEP_READY",
    stepType: nextType,
    occurredAt: nowIso,
    createdAt: nowIso,
    metadata: autoStartCooling
      ? {
          autoStarted: true,
          reason: "Saída do forno inicia resfriamento",
          expectedFinishAt: coolingReleaseAt,
        }
      : undefined,
  });

  const updatedLot: ProductionLot = {
    ...lot,
    status: "IN_PROGRESS",
    currentStep: nextType,
    currentStepStatus: autoStartCooling ? "IN_PROGRESS" : "READY",
    updatedAt: nowIso,
  };
  await upsertLot(db, updatedLot);

  return {
    lot: updatedLot,
    step: completedStep,
    event,
    alreadyApplied: false,
    nextStepReady: true,
  };
}

export { computeTimingStatus };
