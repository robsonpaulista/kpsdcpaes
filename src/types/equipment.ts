import type { StepType } from "@/types/production";

/** Tipos do material (Doc 04) — não inferir pelo nome. */
export type EquipmentType =
  | "MIXER"
  | "MODELER"
  | "TRAYING_STATION"
  | "PROOFING_CHAMBER"
  | "OVEN"
  | "COOLING_RACK"
  | "PACKAGING_LINE"
  | "OTHER";

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

export type EquipmentCapacityUnit =
  | "KG"
  | "KG_PER_HOUR"
  | "UNITS"
  | "UNITS_PER_HOUR"
  | "TRAYS"
  | "RACKS";

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
  /** Capacidade nominal por ciclo/hora, conforme a unidade. */
  capacity?: number;
  capacityUnit?: EquipmentCapacityUnit;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  /** Data de instalação (YYYY-MM-DD). */
  installedAt?: string;
  powerKw?: number;
  location?: string;
  notes?: string;
  /** Início da parada atual (Doc 09 — tempo parado). */
  stoppedAt?: string;
  /** Motivo livre V1 — catálogo oficial de parada depois. */
  stopReason?: string;
  createdAt: string;
  updatedAt: string;
}
