import type {
  ExternalProductionOrder,
  NormalizedProductionOrder,
} from "@/integrations/production-orders/types/external-production-order";
import { FACTORY_PRODUCT_CATALOG } from "@/domain/production/product-catalog-seed";

export const MOCK_SOURCE_SYSTEM = "MOCK_DC_PAES";

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoAt(date: string, hour: number, minute = 0): string {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).toISOString();
}

/**
 * OPs de exemplo alinhadas ao catálogo real DC Pães (data = hoje).
 */
export function getMockExternalOrders(
  now = new Date(),
): ExternalProductionOrder[] {
  const today = localDateString(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateString(yesterdayDate);

  return [
    {
      externalId: "mock-op-001",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-001`,
      externalProductCode: "DC0001",
      externalProductName: "PAO HB ESPINAFRE 10 CM (4 UND)",
      plannedQuantity: 4800,
      productionDate: today,
      externalStatus: "RELEASED",
      sourceUpdatedAt: isoAt(today, 6, 30),
      numberOfBatches: 4,
      massWeightKg: 72,
    },
    {
      externalId: "mock-op-002",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-002`,
      externalProductCode: "DC0005",
      externalProductName: "PAO HB AUSTRALIANO 10 CM (4 UND)",
      plannedQuantity: 3600,
      productionDate: today,
      externalStatus: "IN_PROGRESS",
      sourceUpdatedAt: isoAt(today, 7, 0),
      numberOfBatches: 3,
      massWeightKg: 65,
    },
    {
      externalId: "mock-op-003",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-003`,
      externalProductCode: "DC0003",
      externalProductName: "PAO HB BRIOCHE 10 CM (4 UND)",
      plannedQuantity: 2400,
      productionDate: today,
      externalStatus: "IN_PROGRESS",
      sourceUpdatedAt: isoAt(today, 7, 15),
      numberOfBatches: 2,
      massWeightKg: 58,
    },
    {
      externalId: "mock-op-004",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-004`,
      externalProductCode: "DC0004",
      externalProductName: "PAO HB TRAD GERGELIM 10 CM (4 UND)",
      plannedQuantity: 3200,
      productionDate: today,
      externalStatus: "RELEASED",
      sourceUpdatedAt: isoAt(today, 7, 45),
      numberOfBatches: 3,
      massWeightKg: 60,
    },
    {
      externalId: "mock-op-005",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-005`,
      externalProductCode: "DC0011",
      externalProductName: "PAO HB RUSTICO 10 CM (4 UND)",
      plannedQuantity: 2000,
      productionDate: today,
      externalStatus: "IN_PROGRESS",
      sourceUpdatedAt: isoAt(today, 8, 0),
      numberOfBatches: 2,
      massWeightKg: 55,
    },
    {
      externalId: "mock-op-006",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-006`,
      externalProductCode: "DC0025",
      externalProductName: "PAO MINI HB AUSTRALIANO (12 UND)",
      plannedQuantity: 6000,
      productionDate: today,
      externalStatus: "IN_PROGRESS",
      sourceUpdatedAt: isoAt(today, 8, 20),
      numberOfBatches: 5,
      massWeightKg: 48,
    },
    {
      externalId: "mock-op-007",
      externalOrderNumber: `${yesterday.slice(2).replaceAll("-", "")}-010`,
      externalProductCode: "DC0008",
      externalProductName: "PAO HB CENOURA 10 CM (4 UND)",
      plannedQuantity: 2800,
      productionDate: yesterday,
      externalStatus: "COMPLETED",
      sourceUpdatedAt: isoAt(yesterday, 18, 0),
      numberOfBatches: 3,
      massWeightKg: 62,
    },
    {
      externalId: "mock-op-008",
      externalOrderNumber: `${today.slice(2).replaceAll("-", "")}-008`,
      externalProductCode: "DC0099",
      externalProductName: "PAO HB NAO MAPEADO",
      plannedQuantity: 1000,
      productionDate: today,
      externalStatus: "RELEASED",
      sourceUpdatedAt: isoAt(today, 9, 0),
      numberOfBatches: 1,
      massWeightKg: 40,
    },
  ];
}

/** Snapshot estático para UI — preferir getMockExternalOrders() em runtime. */
export const MOCK_EXTERNAL_ORDERS = getMockExternalOrders();

/** Catálogo Factory (imagens reais) — seed + mappings mock. */
export const MOCK_FACTORY_PRODUCTS = FACTORY_PRODUCT_CATALOG;

export function toNormalized(
  order: ExternalProductionOrder,
  sourceSystem: string = MOCK_SOURCE_SYSTEM,
): NormalizedProductionOrder {
  return {
    sourceSystem,
    externalId: order.externalId,
    externalOrderNumber: order.externalOrderNumber,
    externalProductCode: order.externalProductCode,
    externalProductName: order.externalProductName,
    plannedQuantity: order.plannedQuantity,
    productionDate: order.productionDate,
    externalStatus: order.externalStatus,
    sourceUpdatedAt: order.sourceUpdatedAt,
    numberOfBatches: order.numberOfBatches,
    massWeightKg: order.massWeightKg,
    rawSnapshot: { ...order },
  };
}
