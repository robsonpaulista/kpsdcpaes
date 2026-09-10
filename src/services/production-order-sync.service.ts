import { addDoc, collection, doc, setDoc, type Firestore } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createProductionOrderSource } from "@/integrations/production-orders/production-order-source";
import { normalizeProductionOrder } from "@/integrations/production-orders/production-order-normalizer";
import { MOCK_SOURCE_SYSTEM } from "@/integrations/production-orders/fixtures/mock-orders";
import { getProductionOrderSourceKind } from "@/integrations/production-orders/production-order-source";
import { seedMockFactoryProducts } from "@/repositories/products.repository";
import {
  findActiveMapping,
  seedMockProductMappings,
} from "@/repositories/product-mappings.repository";
import { upsertProductionOrderFromNormalized } from "@/repositories/orders.repository";

export interface SyncOrdersResult {
  sourceKind: "mock" | "erp";
  sourceSystem: string;
  receivedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  pendingValidationCount: number;
  errors: Array<{ externalId: string; message: string }>;
  finishedAt: string;
}

function resolveSourceSystem(kind: "mock" | "erp"): string {
  return kind === "mock" ? MOCK_SOURCE_SYSTEM : "ERP_DC_PAES";
}

/**
 * IMPORT ≠ CREATE — upsert por sourceSystem + externalId.
 * Telas não sabem se a origem é mock ou ERP.
 */
export async function syncProductionOrders(
  db: Firestore,
): Promise<SyncOrdersResult> {
  const sourceKind = getProductionOrderSourceKind();
  const sourceSystem = resolveSourceSystem(sourceKind);
  const source = createProductionOrderSource();

  if (sourceKind === "mock") {
    await seedMockFactoryProducts(db);
    await seedMockProductMappings(db);
  }

  const startedAt = new Date().toISOString();
  const externalOrders = await source.fetchOrders({ includeCancelled: true });

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let pendingValidationCount = 0;
  const errors: Array<{ externalId: string; message: string }> = [];

  for (const external of externalOrders) {
    try {
      const normalized = normalizeProductionOrder(external, sourceSystem);
      const code = normalized.externalProductCode;

      let productId: string | undefined;
      let integrationStatus: "SYNCED" | "PENDING_VALIDATION" = "PENDING_VALIDATION";

      if (code) {
        const mapping = await findActiveMapping(db, sourceSystem, code);
        if (mapping) {
          productId = mapping.productId;
          integrationStatus = "SYNCED";
        } else {
          pendingValidationCount += 1;
        }
      } else {
        pendingValidationCount += 1;
      }

      const { created } = await upsertProductionOrderFromNormalized(
        db,
        normalized,
        { productId, integrationStatus },
      );

      if (created) createdCount += 1;
      else updatedCount += 1;
    } catch (err) {
      errorCount += 1;
      errors.push({
        externalId: external.externalId,
        message: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  const finishedAt = new Date().toISOString();

  await setDoc(
    doc(db, COLLECTIONS.integrationState, sourceSystem),
    {
      sourceSystem,
      lastSuccessfulSyncAt: errorCount === externalOrders.length ? null : finishedAt,
      lastAttemptAt: finishedAt,
      status:
        errorCount === 0
          ? "OK"
          : errorCount < externalOrders.length
            ? "PARTIAL"
            : "ERROR",
      lastReceivedCount: externalOrders.length,
      lastCreatedCount: createdCount,
      lastUpdatedCount: updatedCount,
      lastErrorCount: errorCount,
    },
    { merge: true },
  );

  await addDoc(collection(db, COLLECTIONS.integrationRuns), {
    sourceSystem,
    sourceKind,
    startedAt,
    finishedAt,
    status:
      errorCount === 0
        ? "OK"
        : errorCount < externalOrders.length
          ? "PARTIAL"
          : "ERROR",
    receivedCount: externalOrders.length,
    createdCount,
    updatedCount,
    errorCount,
    pendingValidationCount,
    errors,
  });

  return {
    sourceKind,
    sourceSystem,
    receivedCount: externalOrders.length,
    createdCount,
    updatedCount,
    errorCount,
    pendingValidationCount,
    errors,
    finishedAt,
  };
}
