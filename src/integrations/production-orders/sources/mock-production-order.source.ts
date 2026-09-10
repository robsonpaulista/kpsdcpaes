import type {
  ExternalProductionOrder,
  FetchOrdersParams,
  ProductionOrderSource,
} from "@/integrations/production-orders/types/external-production-order";
import { MOCK_EXTERNAL_ORDERS } from "@/integrations/production-orders/fixtures/mock-orders";

/**
 * Fonte temporária de OPs enquanto o ERP não está disponível.
 * Substituível por ErpProductionOrderSource sem mudar o domínio.
 */
export class MockProductionOrderSource implements ProductionOrderSource {
  async fetchOrders(params?: FetchOrdersParams): Promise<ExternalProductionOrder[]> {
    let orders = [...MOCK_EXTERNAL_ORDERS];

    if (params?.productionDate) {
      orders = orders.filter((o) => o.productionDate === params.productionDate);
    }

    if (!params?.includeCancelled) {
      orders = orders.filter((o) => o.externalStatus !== "CANCELLED");
    }

    if (params?.updatedSince) {
      const since = Date.parse(params.updatedSince);
      orders = orders.filter((o) => Date.parse(o.sourceUpdatedAt) >= since);
    }

    return orders;
  }

  async fetchOrder(externalId: string): Promise<ExternalProductionOrder> {
    const order = MOCK_EXTERNAL_ORDERS.find((o) => o.externalId === externalId);
    if (!order) {
      throw new Error(`OP mock não encontrada: ${externalId}`);
    }
    return { ...order };
  }
}
