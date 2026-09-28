import type { Firestore } from "firebase/firestore";
import {
  getEquipmentById,
  listEquipment,
  replaceEquipment,
  upsertEquipment,
  upsertEquipmentClearingStop,
} from "@/repositories/equipment.repository";
import type { Equipment } from "@/types/equipment";

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

/**
 * Registra parada operacional (Doc 08 §27).
 * Não inventa categorias oficiais — motivo livre opcional.
 */
export async function stopEquipment(
  db: Firestore,
  equipmentId: string,
  reason?: string,
): Promise<Equipment> {
  const existing = await getEquipmentById(db, equipmentId);
  if (!existing) throw new Error("Equipamento não encontrado.");
  if (!existing.active) throw new Error("Equipamento inativo.");
  if (existing.status === "OPERATING") {
    throw new Error(
      "Equipamento em uso num lote. Finalize a etapa no Floor antes de parar.",
    );
  }

  const now = new Date().toISOString();
  const note = reason?.trim();
  const updated: Equipment = {
    ...existing,
    status: "STOPPED",
    stoppedAt: now,
    stopReason: note || undefined,
    updatedAt: now,
  };
  await upsertEquipment(db, updated);
  return updated;
}

/** Libera equipamento parado / manutenção → AVAILABLE. */
export async function releaseEquipment(
  db: Firestore,
  equipmentId: string,
): Promise<Equipment> {
  const existing = await getEquipmentById(db, equipmentId);
  if (!existing) throw new Error("Equipamento não encontrado.");

  const now = new Date().toISOString();
  return upsertEquipmentClearingStop(db, {
    ...existing,
    status: "AVAILABLE",
    updatedAt: now,
  });
}
