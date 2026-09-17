import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS, productionOrderDocId } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import {
  cloneDefaultProcessRoute,
  resolveProcessRoute,
  type ProcessRouteStep,
} from "@/domain/production/process-route";
import { MOCK_SOURCE_SYSTEM } from "@/integrations/production-orders/fixtures/mock-orders";
import { seedFactoryEquipment } from "@/services/seed-equipment.service";
import { syncProductionOrders } from "@/services/production-order-sync.service";
import { buildDemoLotCode } from "@/services/release-order.service";
import {
  createProductionEvent,
  upsertStepRun,
} from "@/repositories/execution.repository";
import { setEquipmentStatus } from "@/repositories/equipment.repository";
import { upsertLot } from "@/repositories/lots.repository";
import { getProductionOrder } from "@/repositories/orders.repository";
import { getProductById } from "@/repositories/products.repository";
import type {
  LotStepRun,
  ProductionLot,
  ProductionOrder,
  StepType,
} from "@/types/production";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function deleteAllInCollection(
  db: Firestore,
  collectionName: string,
): Promise<number> {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) return 0;

  let deleted = 0;
  let batch = writeBatch(db);
  let ops = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return deleted;
}

export type ClearProductionResult = {
  events: number;
  steps: number;
  lots: number;
  orders: number;
  incidents: number;
  integrationRuns: number;
};

/** Apaga OPs, lotes, etapas, eventos e ocorrências — mantém catálogo. */
export async function clearProductionData(
  db: Firestore,
): Promise<ClearProductionResult> {
  const events = await deleteAllInCollection(
    db,
    COLLECTIONS.productionEvents,
  );
  const steps = await deleteAllInCollection(db, COLLECTIONS.lotStepRuns);
  const lots = await deleteAllInCollection(db, COLLECTIONS.productionLots);
  const incidents = await deleteAllInCollection(
    db,
    COLLECTIONS.qualityIncidents,
  );
  const orders = await deleteAllInCollection(
    db,
    COLLECTIONS.productionOrders,
  );
  const integrationRuns = await deleteAllInCollection(
    db,
    COLLECTIONS.integrationRuns,
  );

  const equipSnap = await getDocs(collection(db, COLLECTIONS.equipment));
  for (const d of equipSnap.docs) {
    const data = d.data() as { status?: string };
    if (data.status === "OPERATING") {
      await setEquipmentStatus(db, d.id, "AVAILABLE");
    }
  }

  try {
    await deleteDoc(doc(db, COLLECTIONS.integrationState, MOCK_SOURCE_SYSTEM));
  } catch {
    /* estado pode não existir */
  }

  return { events, steps, lots, orders, incidents, integrationRuns };
}

type DemoLotPlan = {
  externalId: string;
  productId: string;
  sequence: number;
  currentStepIndex: number;
  mode: "ready" | "running" | "completed";
  elapsedMinutes: number;
  plannedQuantity: number;
  equipmentId?: string;
  outputQuantity?: number;
};

function buildDemoPlans(): DemoLotPlan[] {
  return [
    {
      externalId: "mock-op-001",
      productId: "PAO-HB-ESPINAFRE-10CM",
      sequence: 1,
      currentStepIndex: 0,
      mode: "running",
      elapsedMinutes: 6,
      plannedQuantity: 1200,
      equipmentId: "eq_am01",
    },
    {
      externalId: "mock-op-002",
      productId: "PAO-HB-AUSTRALIANO-10CM",
      sequence: 2,
      currentStepIndex: 3,
      mode: "running",
      elapsedMinutes: 180,
      plannedQuantity: 1200,
      equipmentId: "eq_cf01",
    },
    {
      externalId: "mock-op-003",
      productId: "PAO-HB-BRIOCHE-10CM",
      sequence: 3,
      currentStepIndex: 4,
      mode: "running",
      elapsedMinutes: 10,
      plannedQuantity: 1200,
      equipmentId: "eq_fo01",
    },
    {
      externalId: "mock-op-004",
      productId: "PAO-HB-TRAD-GERGELIM-10CM",
      sequence: 4,
      currentStepIndex: 0,
      mode: "ready",
      elapsedMinutes: 8,
      plannedQuantity: 1000,
    },
    {
      externalId: "mock-op-005",
      productId: "PAO-HB-RUSTICO-10CM",
      sequence: 5,
      currentStepIndex: 5,
      mode: "running",
      elapsedMinutes: 45,
      plannedQuantity: 1000,
    },
    {
      externalId: "mock-op-006",
      productId: "PAO-MINI-HB-AUSTRALIANO",
      sequence: 6,
      currentStepIndex: 6,
      mode: "running",
      elapsedMinutes: 15,
      plannedQuantity: 1200,
      equipmentId: "eq_em01",
    },
    {
      externalId: "mock-op-007",
      productId: "PAO-HB-CENOURA-10CM",
      sequence: 7,
      currentStepIndex: 6,
      mode: "completed",
      elapsedMinutes: 40,
      plannedQuantity: 2800,
      equipmentId: "eq_em01",
      outputQuantity: 2750,
    },
  ];
}

async function createDemoLot(
  db: Firestore,
  order: ProductionOrder,
  plan: DemoLotPlan,
  route: ProcessRouteStep[],
  now: Date,
): Promise<ProductionLot> {
  const nowIso = now.toISOString();
  const productionDate = order.productionDate ?? localDateString(now);
  const lotId = newId("lot");
  const lotCode = buildDemoLotCode(
    plan.productId,
    productionDate,
    plan.sequence,
  );
  const current = route[plan.currentStepIndex] ?? route[0];
  if (!current) throw new Error("Rota de processo vazia.");

  const startedAt =
    plan.mode === "ready"
      ? null
      : new Date(now.getTime() - plan.elapsedMinutes * 60_000).toISOString();

  const expectedFinishAt =
    startedAt != null
      ? new Date(
          new Date(startedAt).getTime() +
            current.standardDurationMinutes * 60_000,
        ).toISOString()
      : null;

  const readyAt = new Date(
    now.getTime() - (plan.elapsedMinutes + 5) * 60_000,
  ).toISOString();

  const isCompleted = plan.mode === "completed";
  const isRunning = plan.mode === "running";

  const lot: ProductionLot = {
    id: lotId,
    lotCode,
    productionOrderId: order.id,
    productId: plan.productId,
    status: isCompleted
      ? "COMPLETED"
      : isRunning
        ? "IN_PROGRESS"
        : "WAITING",
    currentStep: isCompleted ? undefined : current.stepType,
    currentStepStatus: isCompleted
      ? undefined
      : isRunning
        ? "IN_PROGRESS"
        : "READY",
    plannedQuantity: plan.plannedQuantity,
    processRoute: route,
    startedAt: startedAt ?? undefined,
    completedAt: isCompleted ? nowIso : undefined,
    createdAt: readyAt,
    updatedAt: nowIso,
  };

  await upsertLot(db, lot);

  for (let i = 0; i < plan.currentStepIndex; i += 1) {
    const step = route[i];
    if (!step) continue;
    const stepStarted = new Date(
      now.getTime() -
        (plan.elapsedMinutes +
          (plan.currentStepIndex - i) * step.standardDurationMinutes) *
          60_000,
    );
    const stepFinished = new Date(
      stepStarted.getTime() + step.standardDurationMinutes * 60_000,
    );
    await upsertStepRun(db, {
      id: newId("step"),
      lotId,
      stepType: step.stepType,
      sequence: step.sequence,
      status: "COMPLETED",
      timingStatus: "COMPLETED",
      standardDurationMinutes: step.standardDurationMinutes,
      toleranceMinutes: step.lateToleranceMinutes,
      readyAt: stepStarted.toISOString(),
      startedAt: stepStarted.toISOString(),
      expectedFinishAt: stepFinished.toISOString(),
      finishedAt: stepFinished.toISOString(),
      inputQuantity: plan.plannedQuantity,
      outputQuantity: plan.plannedQuantity,
      createdAt: stepStarted.toISOString(),
      updatedAt: stepFinished.toISOString(),
    });
  }

  const currentStepPayload: LotStepRun = {
    id: newId("step"),
    lotId,
    stepType: current.stepType,
    sequence: current.sequence,
    status: isCompleted ? "COMPLETED" : isRunning ? "IN_PROGRESS" : "READY",
    timingStatus: isCompleted
      ? "COMPLETED"
      : isRunning
        ? "ON_TIME"
        : "NOT_STARTED",
    standardDurationMinutes: current.standardDurationMinutes,
    toleranceMinutes: current.lateToleranceMinutes,
    readyAt,
    startedAt: startedAt ?? undefined,
    expectedFinishAt: expectedFinishAt ?? undefined,
    finishedAt: isCompleted ? nowIso : undefined,
    inputQuantity: plan.plannedQuantity,
    outputQuantity: isCompleted
      ? (plan.outputQuantity ?? plan.plannedQuantity)
      : undefined,
    equipmentId: isRunning || isCompleted ? plan.equipmentId : undefined,
    createdAt: readyAt,
    updatedAt: nowIso,
  };
  await upsertStepRun(db, currentStepPayload);

  if (plan.equipmentId && isRunning) {
    await setEquipmentStatus(db, plan.equipmentId, "OPERATING");
  }

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId,
    productionOrderId: order.id,
    type: "LOT_RELEASED",
    stepType: route[0]?.stepType,
    occurredAt: readyAt,
    createdAt: readyAt,
    metadata: { lotCode },
  });

  if (isRunning || isCompleted) {
    await createProductionEvent(db, {
      id: newId("evt"),
      lotId,
      productionOrderId: order.id,
      type: "STEP_STARTED",
      stepType: current.stepType,
      equipmentId: plan.equipmentId,
      occurredAt: startedAt ?? nowIso,
      createdAt: startedAt ?? nowIso,
    });
  }

  if (isCompleted) {
    await createProductionEvent(db, {
      id: newId("evt"),
      lotId,
      productionOrderId: order.id,
      type: "LOT_COMPLETED",
      stepType: current.stepType as StepType,
      occurredAt: nowIso,
      createdAt: nowIso,
    });
  }

  const orderStatus = isCompleted
    ? "COMPLETED"
    : isRunning
      ? "IN_PROGRESS"
      : "RELEASED";

  await setDoc(
    doc(db, COLLECTIONS.productionOrders, order.id),
    omitUndefined({
      ...order,
      productionStatus: orderStatus,
      updatedAt: nowIso,
    }),
    { merge: true },
  );

  return lot;
}

export type SeedDemoProductionResult = {
  cleared: ClearProductionResult;
  syncReceived: number;
  lotsCreated: number;
  lotCodes: string[];
};

/**
 * Apaga produção mock antiga, sincroniza OPs do catálogo DC Pães
 * e cria lotes demo já posicionados no fluxo.
 */
export async function resetAndSeedDemoProduction(
  db: Firestore,
): Promise<SeedDemoProductionResult> {
  const cleared = await clearProductionData(db);
  await seedFactoryEquipment(db);

  const sync = await syncProductionOrders(db);
  const now = new Date();
  const plans = buildDemoPlans();
  const lotCodes: string[] = [];

  for (const plan of plans) {
    const orderId = productionOrderDocId(MOCK_SOURCE_SYSTEM, plan.externalId);
    const order = await getProductionOrder(db, orderId);
    if (!order?.productId) continue;

    const product = await getProductById(db, plan.productId);
    const route = resolveProcessRoute(
      product?.processRoute ?? cloneDefaultProcessRoute(),
    );

    const lot = await createDemoLot(db, order, plan, route, now);
    lotCodes.push(lot.lotCode);
  }

  return {
    cleared,
    syncReceived: sync.receivedCount,
    lotsCreated: lotCodes.length,
    lotCodes,
  };
}
