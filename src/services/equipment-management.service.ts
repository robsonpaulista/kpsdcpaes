import type { Firestore } from "firebase/firestore";
import {
  DOWNTIME_CATEGORIES,
  MAINTENANCE_TYPES,
  downtimeCategoryLabel,
  formatDurationMinutes,
  isMaintenanceOverdue,
  localDayKey,
  maintenanceTypeLabel,
} from "@/lib/labels/maintenance";
import { listDowntimes } from "@/repositories/equipment-downtime.repository";
import { listMaintenance } from "@/repositories/equipment-maintenance.repository";
import { listEquipment } from "@/repositories/equipment.repository";
import type {
  ChartBar,
  ChartPoint,
} from "@/services/production-overview.service";
import type {
  Equipment,
  EquipmentDowntime,
  EquipmentMaintenance,
} from "@/types/equipment";

export type EquipmentPeriod = { dateFrom: string; dateTo: string };

export type EquipmentManagementData = {
  equipment: Equipment[];
  downtimes: EquipmentDowntime[];
  maintenance: EquipmentMaintenance[];
};

export type EquipmentManagementMetrics = {
  equipmentCount: number;
  downtimeCount: number;
  downtimeMinutes: number;
  openDowntimes: number;
  mttrMinutes: number | null;
  availabilityPercent: number | null;
  maintenanceCompleted: number;
  maintenanceCost: number;
  overdueCount: number;
  upcoming7d: number;
  inProgressCount: number;
  preventiveDue: number;
  preventiveOnTime: number;
  preventiveCompliancePercent: number | null;
  downtimeByCategory: ChartBar[];
  downtimeByEquipment: ChartBar[];
  downtimeByDay: ChartPoint[];
  maintenanceByType: ChartBar[];
  /** Paradas que tocam o período (mais recentes primeiro). */
  periodDowntimes: EquipmentDowntime[];
};

export async function loadEquipmentManagementData(
  db: Firestore,
): Promise<EquipmentManagementData> {
  const [equipment, downtimes, maintenance] = await Promise.all([
    listEquipment(db),
    listDowntimes(db),
    listMaintenance(db),
  ]);
  return { equipment, downtimes, maintenance };
}

export function equipmentPeriodPreset(days: number): EquipmentPeriod {
  const today = localDayKey();
  if (days <= 1) return { dateFrom: today, dateTo: today };
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { dateFrom: localDayKey(start), dateTo: today };
}

function dayStartMs(dayKey: string): number {
  return new Date(`${dayKey}T00:00:00`).getTime();
}

function eachDay(from: string, to: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cursor.getTime() <= end.getTime() && keys.length < 400) {
    keys.push(localDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function overlapMinutes(
  downtime: EquipmentDowntime,
  fromMs: number,
  toMs: number,
  nowMs: number,
): number {
  const start = new Date(downtime.startedAt).getTime();
  const end = downtime.endedAt ? new Date(downtime.endedAt).getTime() : nowMs;
  const overlap = Math.min(end, toMs) - Math.max(start, fromMs);
  return overlap > 0 ? overlap / 60_000 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toBars(
  rows: Array<{ key: string; label: string; value: number }>,
  format: (value: number) => string,
): ChartBar[] {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r) => ({
      key: r.key,
      label: r.label,
      value: r.value,
      valueLabel: format(r.value),
      sharePercent: max > 0 ? round1((r.value / max) * 100) : 0,
    }));
}

export function computeEquipmentMetrics(
  data: EquipmentManagementData,
  period: EquipmentPeriod,
  equipmentId?: string,
): EquipmentManagementMetrics {
  const nowMs = Date.now();
  const todayKey = localDayKey();
  const fromMs = dayStartMs(period.dateFrom);
  const toMs = Math.min(
    dayStartMs(period.dateTo) + 24 * 60 * 60_000,
    nowMs,
  );

  const equipment = data.equipment.filter(
    (eq) => eq.active && (!equipmentId || eq.id === equipmentId),
  );
  const equipmentIds = new Set(equipment.map((eq) => eq.id));
  const downtimes = data.downtimes.filter((d) =>
    equipmentId ? d.equipmentId === equipmentId : equipmentIds.has(d.equipmentId),
  );
  const maintenance = data.maintenance.filter(
    (m) => !equipmentId || m.equipmentId === equipmentId,
  );

  const periodDowntimes = downtimes.filter(
    (d) => overlapMinutes(d, fromMs, toMs, nowMs) > 0,
  );
  const downtimeMinutes = periodDowntimes.reduce(
    (sum, d) => sum + overlapMinutes(d, fromMs, toMs, nowMs),
    0,
  );

  const closedInPeriod = downtimes.filter((d) => {
    if (!d.endedAt || d.durationMinutes == null) return false;
    const end = new Date(d.endedAt).getTime();
    return end >= fromMs && end <= toMs;
  });
  const mttrMinutes =
    closedInPeriod.length > 0
      ? closedInPeriod.reduce((s, d) => s + (d.durationMinutes ?? 0), 0) /
        closedInPeriod.length
      : null;

  const periodMinutes = Math.max(0, (toMs - fromMs) / 60_000);
  const capacityMinutes = periodMinutes * equipment.length;
  const availabilityPercent =
    capacityMinutes > 0
      ? round1(Math.max(0, 100 - (downtimeMinutes / capacityMinutes) * 100))
      : null;

  const completedInPeriod = maintenance.filter((m) => {
    if (m.status !== "COMPLETED" || !m.completedAt) return false;
    const end = new Date(m.completedAt).getTime();
    return end >= fromMs && end <= toMs;
  });

  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadKey = localDayKey(weekAhead);

  const preventiveDueList = maintenance.filter(
    (m) =>
      m.type === "PREVENTIVE" &&
      m.status !== "CANCELLED" &&
      m.scheduledDate >= period.dateFrom &&
      m.scheduledDate <= period.dateTo &&
      m.scheduledDate <= todayKey,
  );
  const preventiveOnTime = preventiveDueList.filter(
    (m) =>
      m.status === "COMPLETED" &&
      m.completedAt &&
      localDayKey(new Date(m.completedAt)) <= m.scheduledDate,
  ).length;

  const downtimeByCategory = toBars(
    DOWNTIME_CATEGORIES.map((category) => ({
      key: category,
      label: downtimeCategoryLabel(category),
      value: periodDowntimes
        .filter((d) => d.category === category)
        .reduce((s, d) => s + overlapMinutes(d, fromMs, toMs, nowMs), 0),
    })),
    formatDurationMinutes,
  );

  const downtimeByEquipment = toBars(
    equipment.map((eq) => ({
      key: eq.id,
      label: `${eq.code} · ${eq.name}`,
      value: periodDowntimes
        .filter((d) => d.equipmentId === eq.id)
        .reduce((s, d) => s + overlapMinutes(d, fromMs, toMs, nowMs), 0),
    })),
    formatDurationMinutes,
  );

  const downtimeByDay: ChartPoint[] = eachDay(period.dateFrom, period.dateTo).map(
    (key) => {
      const start = dayStartMs(key);
      const end = Math.min(start + 24 * 60 * 60_000, nowMs);
      const value = periodDowntimes.reduce(
        (s, d) => s + overlapMinutes(d, start, end, nowMs),
        0,
      );
      return {
        key,
        label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
        value: Math.round(value),
      };
    },
  );

  const maintenanceByType = toBars(
    MAINTENANCE_TYPES.map((type) => ({
      key: type,
      label: maintenanceTypeLabel(type),
      value: completedInPeriod.filter((m) => m.type === type).length,
    })),
    (v) => `${v} concluída${v === 1 ? "" : "s"}`,
  );

  return {
    equipmentCount: equipment.length,
    downtimeCount: periodDowntimes.length,
    downtimeMinutes,
    openDowntimes: downtimes.filter((d) => !d.endedAt).length,
    mttrMinutes,
    availabilityPercent,
    maintenanceCompleted: completedInPeriod.length,
    maintenanceCost: completedInPeriod.reduce((s, m) => s + (m.cost ?? 0), 0),
    overdueCount: maintenance.filter((m) => isMaintenanceOverdue(m, todayKey)).length,
    upcoming7d: maintenance.filter(
      (m) =>
        m.status === "SCHEDULED" &&
        m.scheduledDate >= todayKey &&
        m.scheduledDate <= weekAheadKey,
    ).length,
    inProgressCount: maintenance.filter((m) => m.status === "IN_PROGRESS").length,
    preventiveDue: preventiveDueList.length,
    preventiveOnTime,
    preventiveCompliancePercent:
      preventiveDueList.length > 0
        ? round1((preventiveOnTime / preventiveDueList.length) * 100)
        : null,
    downtimeByCategory,
    downtimeByEquipment,
    downtimeByDay,
    maintenanceByType,
    periodDowntimes,
  };
}

/** Próxima manutenção agendada de cada equipamento. */
export function nextMaintenanceByEquipment(
  maintenance: EquipmentMaintenance[],
): Map<string, EquipmentMaintenance> {
  const map = new Map<string, EquipmentMaintenance>();
  for (const m of maintenance) {
    if (m.status !== "SCHEDULED") continue;
    const current = map.get(m.equipmentId);
    if (!current || m.scheduledDate < current.scheduledDate) {
      map.set(m.equipmentId, m);
    }
  }
  return map;
}
