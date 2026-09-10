export type QualityIncidentStatus = "OPEN" | "RESOLVED";

/**
 * Ocorrência de qualidade V1 — Doc 10.
 * Não inventar severidades/motivos oficiais; descrição livre + vínculo ao lote.
 * Ocorrência ≠ bloqueio automático.
 */
export interface QualityIncident {
  id: string;
  lotId: string;
  lotCode: string;
  productionOrderId: string;
  productId: string;
  stepType?: string;
  stationId?: string;
  description: string;
  status: QualityIncidentStatus;
  blocksLot: boolean;
  /** Vínculo com a perda apontada na estação (fila de qualidade). */
  relatedStepRunId?: string;
  lossQuantity?: number;
  lossReason?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

/** Sinalização automática: perda apontada no chão, ainda sem ocorrência. */
export interface QualityLossSignal {
  stepRunId: string;
  lotId: string;
  lotCode: string;
  productionOrderId: string;
  productId: string;
  stepType: string;
  lossQuantity: number;
  lossReason?: string;
  outputQuantity?: number;
  inputQuantity?: number;
  finishedAt: string;
  hasIncident: boolean;
  incidentId?: string;
}
