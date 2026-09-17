export type IntegrationStatus =
  | "SYNCED"
  | "PENDING_VALIDATION"
  | "ERROR"
  | "OUTDATED"
  | "IGNORED";

export type ProductionStatus =
  | "WAITING"
  | "RELEASED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type LotStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export type StepStatus =
  | "WAITING"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED";

export type TimingStatus =
  | "NOT_STARTED"
  | "ON_TIME"
  | "ATTENTION"
  | "LATE"
  | "COMPLETED";

export type StepType =
  | "WEIGHING"
  | "MIXING"
  | "MODELING"
  | "TRAYING"
  | "PROOFING"
  | "BAKING"
  | "COOLING"
  | "PACKAGING";

/** Etapa da rota (cadastro no produto + snapshot no lote). */
export type ProcessRouteStep = {
  stepType: StepType;
  sequence: number;
  standardDurationMinutes: number;
  lateToleranceMinutes: number;
};

export interface ProductionOrder {
  id: string;
  sourceSystem: string;
  externalId: string;
  externalOrderNumber: string;
  productId?: string;
  plannedQuantity?: number;
  productionDate?: string;
  numberOfBatches?: number;
  massWeightKg?: number;
  integrationStatus: IntegrationStatus;
  productionStatus: ProductionStatus;
  externalSnapshot?: unknown;
  pendingSourceChanges?: unknown;
  importedAt: string;
  lastSyncedAt: string;
  sourceUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  externalProductId?: string;
  externalProductCode?: string;
  active: boolean;
  unit?: string;
  nominalWeight?: number;
  /** Foto do produto (path público, ex.: /products/...). */
  imageUrl?: string;
  /** Tempos/rota por SKU — override do default da fábrica. */
  processRoute?: ProcessRouteStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductMapping {
  id: string;
  sourceSystem: string;
  externalProductCode: string;
  externalProductId?: string;
  productId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relação batida ↔ lote NÃO é 1:1 fixa.
 * Batch e Lot são entidades separadas até validação operacional.
 */
export interface ProductionBatch {
  id: string;
  productionOrderId: string;
  sequence: number;
  plannedQuantity?: number;
  plannedMassWeight?: number;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
}

export interface ProductionLot {
  id: string;
  lotCode: string;
  productionOrderId: string;
  productId: string;
  batchId?: string;
  status: LotStatus;
  currentStep?: StepType;
  currentStepStatus?: StepStatus;
  plannedQuantity?: number;
  /** Snapshot da rota no momento da liberação (Doc 11 §27). */
  processRoute?: ProcessRouteStep[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LotStepRun {
  id: string;
  lotId: string;
  stepType: StepType;
  sequence: number;
  status: StepStatus;
  timingStatus: TimingStatus;
  stationId?: string;
  equipmentId?: string;
  operatorId?: string;
  standardDurationMinutes?: number;
  toleranceMinutes?: number;
  readyAt?: string;
  startedAt?: string;
  expectedFinishAt?: string;
  finishedAt?: string;
  inputQuantity?: number;
  outputQuantity?: number;
  lossQuantity?: number;
  /** Motivo livre / snapshot do catálogo (Doc 10). */
  lossReason?: string;
  /** Referência ao catálogo factory_loss_reasons. */
  lossReasonId?: string;
  /** Minutos entre READY e START (espera na fila da etapa). */
  waitingDurationMinutes?: number;
  /** Minutos entre START e FINISH (tempo de processo). */
  processDurationMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionEvent {
  id: string;
  lotId: string;
  productionOrderId: string;
  type: string;
  stepType?: StepType;
  operatorId?: string;
  stationId?: string;
  equipmentId?: string;
  occurredAt: string;
  operationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
