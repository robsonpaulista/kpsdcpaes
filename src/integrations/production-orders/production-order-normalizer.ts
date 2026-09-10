import type {
  ExternalProductionOrder,
  NormalizedProductionOrder,
} from "@/integrations/production-orders/types/external-production-order";
import { toNormalized } from "@/integrations/production-orders/fixtures/mock-orders";

/**
 * Converte payload externo → modelo normalizado do Factory OS.
 * Quando o ERP real chegar, mapear campos reais AQUI — não nas telas.
 */
export function normalizeProductionOrder(
  external: ExternalProductionOrder,
  sourceSystem: string,
): NormalizedProductionOrder {
  return toNormalized(external, sourceSystem);
}
