import type { Firestore } from "firebase/firestore";
import {
  downtimeCategoryForMaintenance,
  localDayKey,
} from "@/lib/labels/maintenance";
import { saveDowntime } from "@/repositories/equipment-downtime.repository";
import {
  getMaintenanceById,
  saveMaintenance,
} from "@/repositories/equipment-maintenance.repository";
import {
  getEquipmentById,
  upsertEquipment,
  upsertEquipmentClearingStop,
} from "@/repositories/equipment.repository";
import {
  closeDowntime,
  getOpenDowntimeFor,
  newEquipmentRecordId,
  openDowntime,
} from "@/services/equipment-ops.service";
import type {
  EquipmentMaintenance,
  MaintenancePriority,
  MaintenanceType,
} from "@/types/equipment";

export type MaintenanceInput = {
  equipmentId: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  title: string;
  description?: string;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedMinutes?: number;
  responsible?: string;
  provider?: string;
  recurrenceDays?: number;
};

export type CompleteMaintenanceInput = {
  servicePerformed: string;
  partsReplaced?: string;
  cost?: number;
  /** Usado quando a manutenção foi concluída sem ter sido iniciada no sistema. */
  durationMinutes?: number;
  actor?: string;
};

function cleanText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function positiveInt(value?: number): number | undefined {
  return value != null && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

function addDays(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDayKey(date);
}

function validateInput(input: MaintenanceInput): void {
  if (!input.equipmentId) throw new Error("Selecione o equipamento.");
  if (!input.title.trim()) throw new Error("Informe o título da manutenção.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate)) {
    throw new Error("Informe a data planejada.");
  }
  if (input.scheduledTime && !/^\d{2}:\d{2}$/.test(input.scheduledTime)) {
    throw new Error("Hora planejada inválida.");
  }
}

function fieldsFromInput(input: MaintenanceInput) {
  return {
    type: input.type,
    priority: input.priority,
    title: input.title.trim(),
    description: cleanText(input.description),
    scheduledDate: input.scheduledDate,
    scheduledTime: cleanText(input.scheduledTime),
    estimatedMinutes: positiveInt(input.estimatedMinutes),
    responsible: cleanText(input.responsible),
    provider: cleanText(input.provider),
    recurrenceDays: positiveInt(input.recurrenceDays),
  };
}

export async function scheduleMaintenance(
  db: Firestore,
  input: MaintenanceInput,
  actor?: string,
): Promise<EquipmentMaintenance> {
  validateInput(input);
  const equipment = await getEquipmentById(db, input.equipmentId);
  if (!equipment) throw new Error("Equipamento não encontrado.");
  const now = new Date().toISOString();
  return saveMaintenance(db, {
    id: newEquipmentRecordId("mt"),
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    status: "SCHEDULED",
    ...fieldsFromInput(input),
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
  });
}

/** Edita uma manutenção ainda agendada. */
export async function updateMaintenance(
  db: Firestore,
  maintenanceId: string,
  input: MaintenanceInput,
): Promise<EquipmentMaintenance> {
  validateInput(input);
  const existing = await getMaintenanceById(db, maintenanceId);
  if (!existing) throw new Error("Manutenção não encontrada.");
  if (existing.status !== "SCHEDULED") {
    throw new Error("Só é possível editar manutenções agendadas.");
  }
  const equipment = await getEquipmentById(db, input.equipmentId);
  if (!equipment) throw new Error("Equipamento não encontrado.");
  return saveMaintenance(db, {
    ...existing,
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    ...fieldsFromInput(input),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Inicia a manutenção: equipamento vai para MANUTENÇÃO (sai da fila do Floor)
 * e o tempo parado passa a contar no histórico.
 */
export async function startMaintenance(
  db: Firestore,
  maintenanceId: string,
  actor?: string,
): Promise<EquipmentMaintenance> {
  const maintenance = await getMaintenanceById(db, maintenanceId);
  if (!maintenance) throw new Error("Manutenção não encontrada.");
  if (maintenance.status !== "SCHEDULED") {
    throw new Error("Só é possível iniciar manutenções agendadas.");
  }
  const equipment = await getEquipmentById(db, maintenance.equipmentId);
  if (!equipment) throw new Error("Equipamento não encontrado.");
  if (equipment.status === "OPERATING") {
    throw new Error(
      "Equipamento em uso num lote. Finalize a etapa no Floor antes de iniciar a manutenção.",
    );
  }
  if (
    equipment.currentMaintenanceId &&
    equipment.currentMaintenanceId !== maintenance.id
  ) {
    throw new Error("Equipamento já está em outra manutenção.");
  }

  const now = new Date().toISOString();
  const open = await getOpenDowntimeFor(db, equipment);
  const downtime = open
    ? await saveDowntime(db, {
        ...open,
        maintenanceId: maintenance.id,
        updatedAt: now,
      })
    : await openDowntime(db, equipment, {
        category: downtimeCategoryForMaintenance(maintenance.type),
        reason: maintenance.title,
        startedAt: now,
        maintenanceId: maintenance.id,
        actor,
      });

  await upsertEquipment(db, {
    ...equipment,
    status: "MAINTENANCE",
    stoppedAt: equipment.stoppedAt ?? now,
    stopReason: `Manutenção: ${maintenance.title}`,
    stopCategory: downtime.category,
    currentDowntimeId: downtime.id,
    currentMaintenanceId: maintenance.id,
    updatedAt: now,
  });

  return saveMaintenance(db, {
    ...maintenance,
    status: "IN_PROGRESS",
    startedAt: now,
    downtimeId: downtime.id,
    updatedAt: now,
  });
}

/**
 * Conclui a manutenção: encerra a parada, libera o equipamento e,
 * se houver recorrência, agenda a próxima.
 */
export async function completeMaintenance(
  db: Firestore,
  maintenanceId: string,
  input: CompleteMaintenanceInput,
): Promise<EquipmentMaintenance> {
  const maintenance = await getMaintenanceById(db, maintenanceId);
  if (!maintenance) throw new Error("Manutenção não encontrada.");
  if (maintenance.status !== "IN_PROGRESS" && maintenance.status !== "SCHEDULED") {
    throw new Error("Manutenção já encerrada.");
  }
  const servicePerformed = cleanText(input.servicePerformed);
  if (!servicePerformed) {
    throw new Error("Descreva o serviço realizado.");
  }

  const now = new Date().toISOString();
  let durationMinutes = positiveInt(input.durationMinutes);

  if (maintenance.status === "IN_PROGRESS") {
    const equipment = await getEquipmentById(db, maintenance.equipmentId);
    if (equipment) {
      const open = await getOpenDowntimeFor(db, equipment);
      if (open) {
        await closeDowntime(db, open, {
          endedAt: now,
          resolutionNote: servicePerformed,
          actor: input.actor,
        });
      }
      if (equipment.currentMaintenanceId === maintenance.id) {
        await upsertEquipmentClearingStop(db, {
          ...equipment,
          status: "AVAILABLE",
          updatedAt: now,
        });
      }
    }
    if (maintenance.startedAt) {
      durationMinutes = Math.max(
        1,
        Math.round(
          (new Date(now).getTime() - new Date(maintenance.startedAt).getTime()) /
            60_000,
        ),
      );
    }
  }

  let nextMaintenanceId: string | undefined;
  if (maintenance.recurrenceDays) {
    const next = await saveMaintenance(db, {
      id: newEquipmentRecordId("mt"),
      equipmentId: maintenance.equipmentId,
      equipmentCode: maintenance.equipmentCode,
      type: maintenance.type,
      status: "SCHEDULED",
      priority: maintenance.priority,
      title: maintenance.title,
      description: maintenance.description,
      scheduledDate: addDays(localDayKey(new Date(now)), maintenance.recurrenceDays),
      scheduledTime: maintenance.scheduledTime,
      estimatedMinutes: maintenance.estimatedMinutes,
      responsible: maintenance.responsible,
      provider: maintenance.provider,
      recurrenceDays: maintenance.recurrenceDays,
      createdBy: input.actor,
      createdAt: now,
      updatedAt: now,
    });
    nextMaintenanceId = next.id;
  }

  return saveMaintenance(db, {
    ...maintenance,
    status: "COMPLETED",
    completedAt: now,
    durationMinutes,
    servicePerformed,
    partsReplaced: cleanText(input.partsReplaced),
    cost:
      input.cost != null && Number.isFinite(input.cost) && input.cost >= 0
        ? input.cost
        : undefined,
    completedBy: input.actor,
    nextMaintenanceId,
    updatedAt: now,
  });
}

export async function cancelMaintenance(
  db: Firestore,
  maintenanceId: string,
  reason: string,
): Promise<EquipmentMaintenance> {
  const maintenance = await getMaintenanceById(db, maintenanceId);
  if (!maintenance) throw new Error("Manutenção não encontrada.");
  if (maintenance.status !== "SCHEDULED") {
    throw new Error("Só é possível cancelar manutenções agendadas.");
  }
  const note = cleanText(reason);
  if (!note) throw new Error("Informe o motivo do cancelamento.");
  return saveMaintenance(db, {
    ...maintenance,
    status: "CANCELLED",
    cancelReason: note,
    updatedAt: new Date().toISOString(),
  });
}

/** Abre corretiva para hoje e já inicia (ex.: equipamento quebrou). */
export async function openCorrectiveMaintenance(
  db: Firestore,
  input: Pick<
    MaintenanceInput,
    "equipmentId" | "title" | "description" | "priority" | "responsible" | "provider"
  >,
  actor?: string,
): Promise<EquipmentMaintenance> {
  const scheduled = await scheduleMaintenance(
    db,
    {
      ...input,
      type: "CORRECTIVE",
      scheduledDate: localDayKey(),
    },
    actor,
  );
  return startMaintenance(db, scheduled.id, actor);
}
