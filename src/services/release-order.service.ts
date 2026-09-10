import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import {
  cloneDefaultProcessRoute,
  resolveProcessRoute,
} from "@/domain/production/process-route";
import {
  getProductionOrder,
} from "@/repositories/orders.repository";
import {
  listLotsByOrder,
  upsertLot,
} from "@/repositories/lots.repository";
import { getProductById } from "@/repositories/products.repository";
import { createProductionEvent, upsertStepRun } from "@/repositories/execution.repository";
import type { ProductionLot, ProductionOrder } from "@/types/production";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/**
 * Gera código de lote humano para demo.
 * Não assume regra oficial definitiva da DC Pães.
 */
export function buildDemoLotCode(
  productCode: string,
  productionDate: string,
  sequence: number,
): string {
  const prefix = productCode.includes("HAMB")
    ? "PH"
    : productCode.includes("HOT")
      ? "HD"
      : productCode.includes("FORMA")
        ? "PF"
        : "LT";
  const compact = productionDate.replaceAll("-", "").slice(2); // YYMMDD
  return `${prefix}${compact}${String(sequence).padStart(2, "0")}`;
}

export interface ReleaseOrderResult {
  order: ProductionOrder;
  lot: ProductionLot;
  createdLot: boolean;
}

/**
 * Libera OP mapeada e cria a primeira unidade de execução (lote).
 * NÃO cria automaticamente 1 lote por batida — relação ainda a validar.
 */
export async function releaseProductionOrder(
  db: Firestore,
  orderId: string,
): Promise<ReleaseOrderResult> {
  const order = await getProductionOrder(db, orderId);
  if (!order) {
    throw new Error("OP não encontrada.");
  }
  if (order.integrationStatus === "PENDING_VALIDATION" || !order.productId) {
    throw new Error("OP com produto não mapeado. Configure o produto antes de liberar.");
  }
  if (order.productionStatus === "CANCELLED") {
    throw new Error("OP cancelada não pode ser liberada.");
  }

  const existingLots = await listLotsByOrder(db, order.id);
  if (existingLots.length > 0) {
    const updatedOrder: ProductionOrder = {
      ...order,
      productionStatus:
        order.productionStatus === "WAITING" ? "RELEASED" : order.productionStatus,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(
      doc(db, COLLECTIONS.productionOrders, order.id),
      omitUndefined({ ...updatedOrder }),
      { merge: true },
    );
    return { order: updatedOrder, lot: existingLots[0], createdLot: false };
  }

  const now = new Date().toISOString();
  const product = await getProductById(db, order.productId);
  const processRoute = resolveProcessRoute(
    product?.processRoute ?? cloneDefaultProcessRoute(),
  );
  const firstStep = processRoute[0];
  if (!firstStep) {
    throw new Error("Rota de processo vazia — configure o produto.");
  }
  const lotId = newId("lot");
  const lotCode = buildDemoLotCode(
    order.productId,
    order.productionDate ?? now.slice(0, 10),
    1,
  );

  const lot: ProductionLot = {
    id: lotId,
    lotCode,
    productionOrderId: order.id,
    productId: order.productId,
    status: "WAITING",
    currentStep: firstStep.stepType,
    currentStepStatus: "READY",
    plannedQuantity: order.plannedQuantity,
    processRoute,
    createdAt: now,
    updatedAt: now,
  };

  await upsertLot(db, lot);

  const stepRunId = newId("step");
  await upsertStepRun(db, {
    id: stepRunId,
    lotId,
    stepType: firstStep.stepType,
    sequence: firstStep.sequence,
    status: "READY",
    timingStatus: "NOT_STARTED",
    standardDurationMinutes: firstStep.standardDurationMinutes,
    toleranceMinutes: firstStep.lateToleranceMinutes,
    readyAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId,
    productionOrderId: order.id,
    type: "LOT_RELEASED",
    stepType: firstStep.stepType,
    occurredAt: now,
    createdAt: now,
    metadata: { lotCode },
  });

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId,
    productionOrderId: order.id,
    type: "STEP_READY",
    stepType: firstStep.stepType,
    occurredAt: now,
    createdAt: now,
  });

  const updatedOrder: ProductionOrder = {
    ...order,
    productionStatus: "RELEASED",
    updatedAt: now,
  };
  await setDoc(
    doc(db, COLLECTIONS.productionOrders, order.id),
    omitUndefined({ ...updatedOrder }),
    { merge: true },
  );

  return { order: updatedOrder, lot, createdLot: true };
}

export async function getOrderDocExists(db: Firestore, orderId: string) {
  const snap = await getDoc(doc(db, COLLECTIONS.productionOrders, orderId));
  return snap.exists();
}
