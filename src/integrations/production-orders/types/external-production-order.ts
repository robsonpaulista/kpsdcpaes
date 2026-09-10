/** Tipos de integração — espelho do Doc 05A. Campos opcionais até API real. */

export interface FetchOrdersParams {
  productionDate?: string;
  updatedSince?: string;
  includeCancelled?: boolean;
}

/**
 * Payload bruto externo.
 * No mock: estrutura controlada.
 * No ERP: será tipado com o contrato real — NÃO inventar campos de API.
 */
export interface ExternalProductionOrder {
  externalId: string;
  externalOrderNumber: string;
  externalProductCode: string;
  externalProductName: string;
  plannedQuantity: number;
  productionDate: string;
  externalStatus: string;
  sourceUpdatedAt: string;
  numberOfBatches?: number;
  massWeightKg?: number;
  [key: string]: unknown;
}

export interface NormalizedProductionOrder {
  sourceSystem: string;
  externalId: string;
  externalOrderNumber: string;
  externalProductId?: string;
  externalProductCode?: string;
  externalProductName?: string;
  plannedQuantity?: number;
  productionDate?: string;
  externalStatus?: string;
  sourceUpdatedAt?: string;
  numberOfBatches?: number;
  massWeightKg?: number;
  rawSnapshot?: unknown;
}

export interface ProductionOrderSource {
  fetchOrders(params?: FetchOrdersParams): Promise<ExternalProductionOrder[]>;
  fetchOrder(externalId: string): Promise<ExternalProductionOrder>;
}
