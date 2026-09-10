import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  COLLECTIONS,
  productionOrderDocId,
} from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type {
  IntegrationStatus,
  ProductionOrder,
  ProductionStatus,
} from "@/types/production";
import type { NormalizedProductionOrder } from "@/integrations/production-orders/types/external-production-order";

function ordersCol(db: Firestore) {
  return collection(db, COLLECTIONS.productionOrders);
}

function mapExternalStatusToProduction(
  externalStatus?: string,
): ProductionStatus {
  switch (externalStatus) {
    case "CANCELLED":
      return "CANCELLED";
    case "COMPLETED":
      return "COMPLETED";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "RELEASED":
    default:
      return "WAITING";
  }
}

export async function upsertProductionOrderFromNormalized(
  db: Firestore,
  normalized: NormalizedProductionOrder,
  options: {
    productId?: string;
    integrationStatus: IntegrationStatus;
  },
): Promise<{ order: ProductionOrder; created: boolean; updated: boolean }> {
  const id = productionOrderDocId(
    normalized.sourceSystem,
    normalized.externalId,
  );
  const ref = doc(ordersCol(db), id);
  const existingSnap = await getDoc(ref);
  const now = new Date().toISOString();
  const created = !existingSnap.exists();

  const previous = existingSnap.exists()
    ? (existingSnap.data() as ProductionOrder)
    : null;

  const sourceChanged =
    previous?.sourceUpdatedAt !== normalized.sourceUpdatedAt ||
    previous?.plannedQuantity !== normalized.plannedQuantity;

  /** Não sobrescrever status local do Factory se já liberada / em produção / concluída. */
  const factoryOwned =
    previous?.productionStatus === "RELEASED" ||
    previous?.productionStatus === "IN_PROGRESS" ||
    previous?.productionStatus === "COMPLETED";

  let integrationStatus = options.integrationStatus;
  let plannedQuantity = normalized.plannedQuantity;
  let pendingSourceChanges: unknown = undefined;

  if (factoryOwned && sourceChanged && previous) {
    integrationStatus = "OUTDATED";
    plannedQuantity = previous.plannedQuantity;
    pendingSourceChanges = {
      plannedQuantity: normalized.plannedQuantity,
      sourceUpdatedAt: normalized.sourceUpdatedAt,
      detectedAt: now,
    };
  }

  let productionStatus = mapExternalStatusToProduction(
    normalized.externalStatus,
  );

  if (factoryOwned && previous) {
    productionStatus = previous.productionStatus;
  }

  if (
    normalized.externalStatus === "CANCELLED" &&
    previous &&
    (previous.productionStatus === "IN_PROGRESS" ||
      previous.productionStatus === "COMPLETED" ||
      previous.productionStatus === "RELEASED")
  ) {
    integrationStatus = "OUTDATED";
    productionStatus = previous.productionStatus;
    pendingSourceChanges = {
      ...(typeof pendingSourceChanges === "object" && pendingSourceChanges
        ? pendingSourceChanges
        : {}),
      externalStatus: "CANCELLED",
      detectedAt: now,
    };
  }

  const order = omitUndefined({
    id,
    sourceSystem: normalized.sourceSystem,
    externalId: normalized.externalId,
    externalOrderNumber: normalized.externalOrderNumber,
    productId: options.productId ?? previous?.productId,
    plannedQuantity,
    productionDate: normalized.productionDate,
    numberOfBatches: normalized.numberOfBatches,
    massWeightKg: normalized.massWeightKg,
    integrationStatus,
    productionStatus,
    externalSnapshot: normalized.rawSnapshot,
    importedAt: previous?.importedAt ?? now,
    lastSyncedAt: now,
    sourceUpdatedAt: normalized.sourceUpdatedAt,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    pendingSourceChanges,
  }) as ProductionOrder;

  await setDoc(ref, order, { merge: true });

  return {
    order,
    created,
    updated: !created,
  };
}

export async function listProductionOrders(
  db: Firestore,
): Promise<ProductionOrder[]> {
  const q = query(ordersCol(db), orderBy("productionDate", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ProductionOrder);
}

export async function getProductionOrder(
  db: Firestore,
  id: string,
): Promise<ProductionOrder | null> {
  const snap = await getDoc(doc(ordersCol(db), id));
  return snap.exists() ? (snap.data() as ProductionOrder) : null;
}
