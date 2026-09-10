import type { Firestore } from "firebase/firestore";
import {
  getEquipmentById,
  upsertEquipment,
  upsertEquipmentClearingStop,
} from "@/repositories/equipment.repository";
import type { Equipment } from "@/types/equipment";

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
