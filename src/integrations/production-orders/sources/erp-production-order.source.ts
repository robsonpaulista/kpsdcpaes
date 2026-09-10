import type {
  ExternalProductionOrder,
  FetchOrdersParams,
  ProductionOrderSource,
} from "@/integrations/production-orders/types/external-production-order";

/**
 * PLACEHOLDER — contrato futuro do ERP.
 * NÃO implementar endpoints, auth ou payload até documentação real do gestor.
 */
export class ErpProductionOrderSource implements ProductionOrderSource {
  async fetchOrders(_params?: FetchOrdersParams): Promise<ExternalProductionOrder[]> {
    throw new Error(
      "ErpProductionOrderSource não implementado. ERP ainda não disponibilizado. Use MockProductionOrderSource.",
    );
  }

  async fetchOrder(_externalId: string): Promise<ExternalProductionOrder> {
    throw new Error(
      "ErpProductionOrderSource não implementado. ERP ainda não disponibilizado. Use MockProductionOrderSource.",
    );
  }
}
