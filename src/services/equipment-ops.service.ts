import type { Firestore } from "firebase/firestore";
import {
  findOpenDowntime,
  getDowntimeById,
  listDowntimes,
  saveDowntime,
} from "@/repositories/equipment-downtime.repository";
import {
  getEquipmentById,
  listEquipment,
  replaceEquipment,
  upsertEquipment,
  upsertEquipmentClearingStop,
} from "@/repositories/equipment.repository";
import type {
  DowntimeCategory,
  Equipment,
  EquipmentDowntime,
} from "@/types/equipment";

/** Campos editáveis no cadastro — status operacional fica fora. */
export type EquipmentProfileInput = Pick<
  Equipment,
  | "code"
  | "name"
  | "type"
  | "stationId"
  | "applicableStepTypes"
  | "active"
  | "capacity"
  | "capacityUnit"
  | "manufacturer"
  | "model"
  | "serialNumber"
  | "installedAt"
  | "powerKw"
  | "location"
  | "notes"
>;

function cleanText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNumber(value?: number): number | undefined {
  return value != null && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function equipmentIdFromCode(code: string): string {
  const slug = code
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `eq_${slug}`;
}

/**
 * Cria (sem equipmentId) ou atualiza o cadastro de um equipamento.
 * Status/parada são preservados — mudam só pelas ações operacionais.
 */
export async function saveEquipmentProfile(
  db: Firestore,
  input: EquipmentProfileInput,
  equipmentId?: string,
): Promise<Equipment> {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code) throw new Error("Informe o código do equipamento.");
  if (!name) throw new Error("Informe o nome do equipamento.");
  if (input.applicableStepTypes.length === 0) {
    throw new Error("Selecione ao menos uma etapa aplicável.");
  }
  const capacity = cleanNumber(input.capacity);
  if (capacity != null && !input.capacityUnit) {
    throw new Error("Selecione a unidade da capacidade.");
  }

  const all = await listEquipment(db);
  const duplicate = all.find(
    (eq) => eq.code.toUpperCase() === code && eq.id !== equipmentId,
  );
  if (duplicate) {
    throw new Error(`Já existe um equipamento com o código ${code}.`);
  }

  const existing = equipmentId
    ? all.find((eq) => eq.id === equipmentId) ?? null
    : null;
  if (equipmentId && !existing) {
    throw new Error("Equipamento não encontrado.");
  }

  const now = new Date().toISOString();
  const profile = {
    code,
    name,
    type: input.type,
    stationId: cleanText(input.stationId),
    applicableStepTypes: input.applicableStepTypes,
    active: input.active,
    capacity,
    capacityUnit: capacity != null ? input.capacityUnit : undefined,
    manufacturer: cleanText(input.manufacturer),
    model: cleanText(input.model),
    serialNumber: cleanText(input.serialNumber),
    installedAt: cleanText(input.installedAt),
    powerKw: cleanNumber(input.powerKw),
    location: cleanText(input.location),
    notes: cleanText(input.notes),
  };

  if (existing) {
    return replaceEquipment(db, {
      id: existing.id,
      status: existing.status,
      stoppedAt: existing.stoppedAt,
      stopReason: existing.stopReason,
      stopCategory: existing.stopCategory,
      currentDowntimeId: existing.currentDowntimeId,
      currentMaintenanceId: existing.currentMaintenanceId,
      createdAt: existing.createdAt,
      ...profile,
      updatedAt: now,
    });
  }

  const id = equipmentIdFromCode(code);
  if (all.some((eq) => eq.id === id)) {
    throw new Error(`Já existe um equipamento com o identificador ${id}.`);
  }
  return replaceEquipment(db, {
    id,
    status: "AVAILABLE",
    createdAt: now,
    ...profile,
    updatedAt: now,
  });
}

export function newEquipmentRecordId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(
    0,
    Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000),
  );
}

export async function openDowntime(
  db: Firestore,
  equipment: Equipment,
  input: {
    category: DowntimeCategory;
    reason?: string;
    startedAt: string;
    maintenanceId?: string;
    actor?: string;
  },
): Promise<EquipmentDowntime> {
  return saveDowntime(db, {
    id: newEquipmentRecordId("dt"),
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    category: input.category,
    reason: cleanText(input.reason),
    startedAt: input.startedAt,
    maintenanceId: input.maintenanceId,
    startedBy: input.actor,
    createdAt: input.startedAt,
    updatedAt: input.startedAt,
  });
}

export async function closeDowntime(
  db: Firestore,
  downtime: EquipmentDowntime,
  input: { endedAt: string; resolutionNote?: string; actor?: string },
): Promise<EquipmentDowntime> {
  return saveDowntime(db, {
    ...downtime,
    endedAt: input.endedAt,
    durationMinutes: minutesBetween(downtime.startedAt, input.endedAt),
    resolutionNote: cleanText(input.resolutionNote) ?? downtime.resolutionNote,
    endedBy: input.actor,
    updatedAt: input.endedAt,
  });
}

/** Parada aberta do equipamento (pelo vínculo atual ou buscando no histórico). */
export async function getOpenDowntimeFor(
  db: Firestore,
  equipment: Equipment,
): Promise<EquipmentDowntime | null> {
  if (equipment.currentDowntimeId) {
    const linked = await getDowntimeById(db, equipment.currentDowntimeId);
    if (linked && !linked.endedAt) return linked;
  }
  return findOpenDowntime(db, equipment.id);
}

export type StopEquipmentInput = {
  category: DowntimeCategory;
  reason?: string;
  actor?: string;
};

/**
 * Registra parada operacional (Doc 08 §27) e abre o registro no histórico.
 */
export async function stopEquipment(
  db: Firestore,
  equipmentId: string,
  input: StopEquipmentInput,
): Promise<Equipment> {
  const existing = await getEquipmentById(db, equipmentId);
  if (!existing) throw new Error("Equipamento não encontrado.");
  if (!existing.active) throw new Error("Equipamento inativo.");
  if (existing.status === "OPERATING") {
    throw new Error(
      "Equipamento em uso num lote. Finalize a etapa no Floor antes de parar.",
    );
  }
  if (existing.status === "STOPPED" || existing.status === "MAINTENANCE") {
    throw new Error("Equipamento já está parado.");
  }

  const now = new Date().toISOString();
  const downtime = await openDowntime(db, existing, {
    category: input.category,
    reason: input.reason,
    startedAt: now,
    actor: input.actor,
  });
  const updated: Equipment = {
    ...existing,
    status: "STOPPED",
    stoppedAt: now,
    stopReason: cleanText(input.reason),
    stopCategory: input.category,
    currentDowntimeId: downtime.id,
    updatedAt: now,
  };
  await upsertEquipment(db, updated);
  return updated;
}

/** Libera equipamento parado → AVAILABLE e encerra a parada no histórico. */
export async function releaseEquipment(
  db: Firestore,
  equipmentId: string,
  opts: { resolutionNote?: string; actor?: string } = {},
): Promise<Equipment> {
  const existing = await getEquipmentById(db, equipmentId);
  if (!existing) throw new Error("Equipamento não encontrado.");
  if (existing.currentMaintenanceId) {
    throw new Error(
      "Equipamento em manutenção — conclua a manutenção para liberar.",
    );
  }

  const now = new Date().toISOString();
  const open = await getOpenDowntimeFor(db, existing);
  if (open) {
    await closeDowntime(db, open, {
      endedAt: now,
      resolutionNote: opts.resolutionNote,
      actor: opts.actor,
    });
  } else if (existing.stoppedAt) {
    // Parada anterior ao histórico: grava o intervalo para não perder o tempo parado.
    const legacy = await openDowntime(db, existing, {
      category: existing.stopCategory ?? "OTHER",
      reason: existing.stopReason,
      startedAt: existing.stoppedAt,
      actor: opts.actor,
    });
    await closeDowntime(db, legacy, {
      endedAt: now,
      resolutionNote: opts.resolutionNote,
      actor: opts.actor,
    });
  }

  return upsertEquipmentClearingStop(db, {
    ...existing,
    status: "AVAILABLE",
    updatedAt: now,
  });
}

export type PastDowntimeInput = {
  equipmentId: string;
  category: DowntimeCategory;
  reason?: string;
  resolutionNote?: string;
  startedAt: string;
  endedAt: string;
  actor?: string;
};

/** Registra parada já encerrada (ex.: ocorreu fora do sistema). Não muda o status atual. */
export async function registerPastDowntime(
  db: Firestore,
  input: PastDowntimeInput,
): Promise<EquipmentDowntime> {
  const equipment = await getEquipmentById(db, input.equipmentId);
  if (!equipment) throw new Error("Equipamento não encontrado.");
  const start = new Date(input.startedAt).getTime();
  const end = new Date(input.endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Informe início e fim da parada.");
  }
  if (end <= start) throw new Error("O fim deve ser depois do início.");
  if (end > Date.now()) throw new Error("O fim não pode estar no futuro.");

  const nowMs = Date.now();
  const overlapping = (await listDowntimes(db)).find((d) => {
    if (d.equipmentId !== equipment.id) return false;
    const dStart = new Date(d.startedAt).getTime();
    const dEnd = d.endedAt ? new Date(d.endedAt).getTime() : nowMs;
    return start < dEnd && end > dStart;
  });
  if (overlapping) {
    throw new Error("Já existe uma parada registrada nesse intervalo para este equipamento.");
  }

  const startedAt = new Date(start).toISOString();
  const endedAt = new Date(end).toISOString();
  const opened = await openDowntime(db, equipment, {
    category: input.category,
    reason: input.reason,
    startedAt,
    actor: input.actor,
  });
  return closeDowntime(db, opened, {
    endedAt,
    resolutionNote: input.resolutionNote,
    actor: input.actor,
  });
}

/** Reclassifica uma parada (categoria, motivo, solução). */
export async function updateDowntimeDetails(
  db: Firestore,
  downtimeId: string,
  input: { category: DowntimeCategory; reason?: string; resolutionNote?: string },
): Promise<EquipmentDowntime> {
  const existing = await getDowntimeById(db, downtimeId);
  if (!existing) throw new Error("Parada não encontrada.");
  const updated = await saveDowntime(db, {
    ...existing,
    category: input.category,
    reason: cleanText(input.reason),
    resolutionNote: cleanText(input.resolutionNote),
    updatedAt: new Date().toISOString(),
  });
  if (!existing.endedAt) {
    const equipment = await getEquipmentById(db, existing.equipmentId);
    if (equipment && equipment.currentDowntimeId === existing.id) {
      await upsertEquipment(db, {
        ...equipment,
        stopCategory: input.category,
        stopReason: cleanText(input.reason),
        updatedAt: updated.updatedAt,
      });
    }
  }
  return updated;
}
