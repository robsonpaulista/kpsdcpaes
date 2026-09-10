import type { StepType } from "@/types/production";

/** Tipos do material (Doc 04) — não inferir pelo nome. */
export type EquipmentType =
  | "MIXER"
  | "MODELER"
  | "PROOFING_CHAMBER"
  | "OVEN"
  | "PACKAGING_LINE";

/**
 * Estados propostos no Doc 04 — validar com operação.
 * Parada V1: STOPPED via Settings; manutenção/indisponível manual depois.
 */
export type EquipmentStatus =
  | "AVAILABLE"
  | "OPERATING"
  | "WAITING"
  | "STOPPED"
  | "MAINTENANCE"
  | "UNAVAILABLE";

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: EquipmentType;
  /** Estação Floor associada (opcional). */
  stationId?: string;
  /** Etapas em que o equipamento pode ser apontado. */
  applicableStepTypes: StepType[];
  status: EquipmentStatus;
  active: boolean;
  /** Início da parada atual (Doc 09 — tempo parado). */
  stoppedAt?: string;
  /** Motivo livre V1 — catálogo oficial de parada depois. */
  stopReason?: string;
  createdAt: string;
  updatedAt: string;
}
