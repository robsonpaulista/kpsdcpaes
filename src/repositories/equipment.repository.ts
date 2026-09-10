import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { Equipment } from "@/types/equipment";
import type { StepType } from "@/types/production";

function equipmentCol(db: Firestore) {
  return collection(db, COLLECTIONS.equipment);
}

export async function upsertEquipment(
  db: Firestore,
  equipment: Equipment,
): Promise<Equipment> {
  const payload = omitUndefined({ ...equipment }) as Equipment;
  await setDoc(doc(equipmentCol(db), equipment.id), payload, { merge: true });
  return payload;
}

/** Grava e limpa campos de parada (merge sozinho não remove undefined). */
export async function upsertEquipmentClearingStop(
  db: Firestore,
  equipment: Equipment,
): Promise<Equipment> {
  const { stoppedAt: _a, stopReason: _b, ...rest } = equipment;
  const payload = omitUndefined({
    ...rest,
    status: equipment.status,
    updatedAt: equipment.updatedAt,
  }) as Record<string, unknown>;
  await setDoc(
    doc(equipmentCol(db), equipment.id),
    {
      ...payload,
      stoppedAt: deleteField(),
      stopReason: deleteField(),
    },
    { merge: true },
  );
  return {
    ...rest,
    status: equipment.status,
    updatedAt: equipment.updatedAt,
  };
}
export async function getEquipmentById(
  db: Firestore,
  id: string,
): Promise<Equipment | null> {
  const snap = await getDoc(doc(equipmentCol(db), id));
  return snap.exists() ? (snap.data() as Equipment) : null;
}

export async function listEquipment(db: Firestore): Promise<Equipment[]> {
  const snap = await getDocs(equipmentCol(db));
  return snap.docs
    .map((d) => d.data() as Equipment)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Equipamentos ativos apontáveis na etapa (e opcionalmente na estação). */
export async function listEquipmentForStep(
  db: Firestore,
  stepType: StepType,
  stationId?: string,
): Promise<Equipment[]> {
  const all = await listEquipment(db);
  return all.filter((eq) => {
    if (!eq.active) return false;
    if (
      eq.status === "UNAVAILABLE" ||
      eq.status === "MAINTENANCE" ||
      eq.status === "STOPPED"
    ) {
      return false;
    }
    if (!eq.applicableStepTypes.includes(stepType)) return false;
    if (stationId && eq.stationId && eq.stationId !== stationId) {
      return false;
    }
    return true;
  });
}

export async function setEquipmentStatus(
  db: Firestore,
  equipmentId: string,
  status: Equipment["status"],
): Promise<void> {
  const existing = await getEquipmentById(db, equipmentId);
  if (!existing) return;
  if (existing.status === status) return;
  // Não sobrescrever parada/manutenção automática pelo fluxo de etapa.
  if (
    (existing.status === "MAINTENANCE" ||
      existing.status === "UNAVAILABLE" ||
      existing.status === "STOPPED") &&
    status === "OPERATING"
  ) {
    return;
  }
  const now = new Date().toISOString();
  const next: Equipment = {
    ...existing,
    status,
    updatedAt: now,
  };
  if (status === "AVAILABLE" || status === "OPERATING") {
    await upsertEquipmentClearingStop(db, next);
    return;
  }
  await upsertEquipment(db, next);
}
