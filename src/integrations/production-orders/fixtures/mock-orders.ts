import type {
  ExternalProductionOrder,
  NormalizedProductionOrder,
} from "@/integrations/production-orders/types/external-production-order";

export const MOCK_SOURCE_SYSTEM = "MOCK_DC_PAES";

/**
 * Fixtures determinísticas — Doc 11 / Fase 0.
 * Valores de exemplo do material; NÃO são regra de produto.
 */
export const MOCK_EXTERNAL_ORDERS: ExternalProductionOrder[] = [
  {
    externalId: "mock-op-001",
    externalOrderNumber: "260826-001",
    externalProductCode: "001234",
    externalProductName: "PAO HAMB 90G",
    plannedQuantity: 5000,
    productionDate: "2026-08-26",
    externalStatus: "RELEASED",
    sourceUpdatedAt: "2026-08-26T07:00:00.000Z",
    numberOfBatches: 5,
    massWeightKg: 80,
  },
  {
    externalId: "mock-op-002",
    externalOrderNumber: "260826-002",
    externalProductCode: "001235",
    externalProductName: "PAO HOT DOG",
    plannedQuantity: 4000,
    productionDate: "2026-08-26",
    externalStatus: "IN_PROGRESS",
    sourceUpdatedAt: "2026-08-26T08:30:00.000Z",
    numberOfBatches: 4,
    massWeightKg: 70,
  },
  {
    externalId: "mock-op-003",
    externalOrderNumber: "260825-010",
    externalProductCode: "001234",
    externalProductName: "PAO HAMB 90G",
    plannedQuantity: 3000,
    productionDate: "2026-08-25",
    externalStatus: "COMPLETED",
    sourceUpdatedAt: "2026-08-25T18:00:00.000Z",
    numberOfBatches: 3,
    massWeightKg: 80,
  },
  {
    externalId: "mock-op-004",
    externalOrderNumber: "260826-014",
    externalProductCode: "001897",
    externalProductName: "PAO AUSTRALIANO 70G",
    plannedQuantity: 2000,
    productionDate: "2026-08-26",
    externalStatus: "RELEASED",
    sourceUpdatedAt: "2026-08-26T07:15:00.000Z",
    numberOfBatches: 2,
    massWeightKg: 60,
  },
  {
    externalId: "mock-op-005",
    externalOrderNumber: "260826-005",
    externalProductCode: "001234",
    externalProductName: "PAO HAMB 90G",
    plannedQuantity: 6000,
    productionDate: "2026-08-26",
    externalStatus: "RELEASED",
    sourceUpdatedAt: "2026-08-26T09:15:00.000Z",
    numberOfBatches: 6,
    massWeightKg: 80,
    _scenario: "UPDATED_AFTER_IMPORT",
  },
  {
    externalId: "mock-op-006",
    externalOrderNumber: "260826-006",
    externalProductCode: "001236",
    externalProductName: "PAO DE FORMA",
    plannedQuantity: 3500,
    productionDate: "2026-08-26",
    externalStatus: "CANCELLED",
    sourceUpdatedAt: "2026-08-26T10:00:00.000Z",
    numberOfBatches: 3,
    massWeightKg: 75,
  },
  {
    externalId: "mock-op-007",
    externalOrderNumber: "260827-001",
    externalProductCode: "001235",
    externalProductName: "PAO HOT DOG",
    plannedQuantity: 8000,
    productionDate: "2026-08-27",
    externalStatus: "RELEASED",
    sourceUpdatedAt: "2026-08-27T06:00:00.000Z",
    numberOfBatches: 8,
    massWeightKg: 70,
  },
  {
    externalId: "mock-op-008",
    externalOrderNumber: "260827-002",
    externalProductCode: "001236",
    externalProductName: "PAO DE FORMA",
    plannedQuantity: 1500,
    productionDate: "2026-08-27",
    externalStatus: "RELEASED",
    sourceUpdatedAt: "2026-08-27T06:30:00.000Z",
    numberOfBatches: 2,
    massWeightKg: 75,
  },
];

/** Produtos Factory conhecidos para mapping (exceto 001897 — não mapeado). */
export const MOCK_FACTORY_PRODUCTS = [
  {
    code: "PAO-HAMB-90",
    name: "Pão Hambúrguer 90 g",
    externalProductCode: "001234",
    nominalWeight: 90,
    unit: "un",
  },
  {
    code: "PAO-HOTDOG",
    name: "Pão Hot Dog",
    externalProductCode: "001235",
    nominalWeight: 50,
    unit: "un",
  },
  {
    code: "PAO-FORMA",
    name: "Pão de Forma",
    externalProductCode: "001236",
    nominalWeight: 500,
    unit: "un",
  },
] as const;

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
