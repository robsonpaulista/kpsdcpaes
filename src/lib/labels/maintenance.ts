import type {
  DowntimeCategory,
  EquipmentMaintenance,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceType,
} from "@/types/equipment";

export const DOWNTIME_CATEGORIES: DowntimeCategory[] = [
  "MECHANICAL_FAILURE",
  "ELECTRICAL_FAILURE",
  "CORRECTIVE_MAINTENANCE",
  "PREVENTIVE_MAINTENANCE",
  "CLEANING",
  "SETUP",
  "NO_MATERIAL",
  "NO_OPERATOR",
  "UTILITIES",
  "OTHER",
];

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  "PREVENTIVE",
  "CORRECTIVE",
  "INSPECTION",
  "CLEANING",
];

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const MAINTENANCE_PRIORITIES: MaintenancePriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export function downtimeCategoryLabel(category: DowntimeCategory): string {
  const labels: Record<DowntimeCategory, string> = {
    MECHANICAL_FAILURE: "Falha mecânica",
    ELECTRICAL_FAILURE: "Falha elétrica",
    PREVENTIVE_MAINTENANCE: "Manutenção preventiva",
    CORRECTIVE_MAINTENANCE: "Manutenção corretiva",
    CLEANING: "Limpeza / higienização",
    SETUP: "Setup / troca de produto",
    NO_MATERIAL: "Falta de insumo",
    NO_OPERATOR: "Falta de operador",
    UTILITIES: "Energia / gás / água",
    OTHER: "Outro",
  };
  return labels[category];
}

export function maintenanceTypeLabel(type: MaintenanceType): string {
  const labels: Record<MaintenanceType, string> = {
    PREVENTIVE: "Preventiva",
    CORRECTIVE: "Corretiva",
    INSPECTION: "Inspeção",
    CLEANING: "Limpeza técnica",
  };
  return labels[type];
}

export function maintenanceStatusLabel(status: MaintenanceStatus): string {
  const labels: Record<MaintenanceStatus, string> = {
    SCHEDULED: "Agendada",
    IN_PROGRESS: "Em execução",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

export function maintenancePriorityLabel(priority: MaintenancePriority): string {
  const labels: Record<MaintenancePriority, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    CRITICAL: "Crítica",
  };
  return labels[priority];
}

/** Categoria de parada aberta ao iniciar uma manutenção deste tipo. */
export function downtimeCategoryForMaintenance(
  type: MaintenanceType,
): DowntimeCategory {
  if (type === "CORRECTIVE") return "CORRECTIVE_MAINTENANCE";
  if (type === "CLEANING") return "CLEANING";
  return "PREVENTIVE_MAINTENANCE";
}

export function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isMaintenanceOverdue(
  maintenance: Pick<EquipmentMaintenance, "status" | "scheduledDate">,
  todayKey = localDayKey(),
): boolean {
  return (
    maintenance.status === "SCHEDULED" && maintenance.scheduledDate < todayKey
  );
}

export type MaintenanceDisplayTone = "critical" | "warning" | "good" | "neutral";

/** Tom visual: atrasada > em execução > agendada > concluída/cancelada. */
export function maintenanceTone(
  maintenance: Pick<EquipmentMaintenance, "status" | "scheduledDate">,
  todayKey = localDayKey(),
): MaintenanceDisplayTone {
  if (isMaintenanceOverdue(maintenance, todayKey)) return "critical";
  if (maintenance.status === "IN_PROGRESS") return "warning";
  if (maintenance.status === "COMPLETED") return "good";
  return "neutral";
}

export function formatDurationMinutes(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins)) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
