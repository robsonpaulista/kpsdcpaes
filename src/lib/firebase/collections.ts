/**
 * Namespace Factory OS — Doc 04 / audit.
 * Prefixo factory_ para isolamento no Firebase compartilhado.
 * NÃO criar collections fora deste mapa sem cruzar com o projeto existente.
 */
export const COLLECTIONS = {
  products: "factory_products",
  productMappings: "factory_product_mappings",
  productionOrders: "factory_production_orders",
  productionLots: "factory_production_lots",
  lotStepRuns: "factory_lot_step_runs",
  productionEvents: "factory_production_events",
  qualityIncidents: "factory_quality_incidents",
  equipment: "factory_equipment",
  lossReasons: "factory_loss_reasons",
  integrationRuns: "factory_integration_runs",
  integrationState: "factory_integration_state",
  users: "factory_users",
} as const;

export function productionOrderDocId(
  sourceSystem: string,
  externalId: string,
): string {
  return `${sourceSystem}__${externalId}`;
}

export function productMappingDocId(
  sourceSystem: string,
  externalProductCode: string,
): string {
  return `${sourceSystem}__${externalProductCode}`;
}
