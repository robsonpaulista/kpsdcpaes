import type { ProductionOrderSource } from "@/integrations/production-orders/types/external-production-order";
import { ErpProductionOrderSource } from "@/integrations/production-orders/sources/erp-production-order.source";
import { MockProductionOrderSource } from "@/integrations/production-orders/sources/mock-production-order.source";

export type ProductionOrderSourceKind = "mock" | "erp";

export function getProductionOrderSourceKind(): ProductionOrderSourceKind {
  const raw = process.env.NEXT_PUBLIC_PRODUCTION_ORDER_SOURCE ?? "mock";
  return raw === "erp" ? "erp" : "mock";
}

export function createProductionOrderSource(): ProductionOrderSource {
  if (getProductionOrderSourceKind() === "erp") {
    return new ErpProductionOrderSource();
  }
  return new MockProductionOrderSource();
}
