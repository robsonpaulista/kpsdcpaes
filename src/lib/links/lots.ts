/** Deep links de lote — Produção vs Rastreabilidade (Doc 02). */

export function lotProductionHref(lotId: string): string {
  return `/app/cockpit/production/lots/${encodeURIComponent(lotId)}`;
}

export function lotTraceabilityHref(lotId: string): string {
  return `/app/traceability/${encodeURIComponent(lotId)}`;
}
