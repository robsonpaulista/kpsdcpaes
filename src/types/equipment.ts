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
  stopCategory?: DowntimeCategory;
  /** Registro de parada aberto (factory_equipment_downtimes). */
  currentDowntimeId?: string;
  /** Manutenção em execução (factory_equipment_maintenance). */
  currentMaintenanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DowntimeCategory =
  | "MECHANICAL_FAILURE"
  | "ELECTRICAL_FAILURE"
  | "PREVENTIVE_MAINTENANCE"
  | "CORRECTIVE_MAINTENANCE"
  | "CLEANING"
  | "SETUP"
  | "NO_MATERIAL"
  | "NO_OPERATOR"
  | "UTILITIES"
  | "OTHER";

/** Histórico de paradas — um registro por intervalo parado. */
export interface EquipmentDowntime {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  category: DowntimeCategory;
  reason?: string;
  startedAt: string;
  /** Ausente = parada em aberto. */
  endedAt?: string;
  durationMinutes?: number;
  maintenanceId?: string;
  resolutionNote?: string;
  startedBy?: string;
  endedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceType =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "INSPECTION"
  | "CLEANING";

export type MaintenanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface EquipmentMaintenance {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  description?: string;
  /** Data planejada (YYYY-MM-DD). */
  scheduledDate: string;
  /** Hora planejada (HH:MM). */
  scheduledTime?: string;
  estimatedMinutes?: number;
  responsible?: string;
  /** Empresa / prestador externo. */
  provider?: string;
  /** Repetir a cada N dias após concluir (gera a próxima automaticamente). */
  recurrenceDays?: number;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  downtimeId?: string;
  servicePerformed?: string;
  partsReplaced?: string;
  cost?: number;
  cancelReason?: string;
  /** Manutenção gerada pela recorrência desta. */
  nextMaintenanceId?: string;
  createdBy?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}
