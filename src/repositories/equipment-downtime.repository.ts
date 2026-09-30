import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { EquipmentDowntime } from "@/types/equipment";

function downtimeCol(db: Firestore) {
  return collection(db, COLLECTIONS.equipmentDowntimes);
}

export async function saveDowntime(
  db: Firestore,
  downtime: EquipmentDowntime,
): Promise<EquipmentDowntime> {
  const payload = omitUndefined({ ...downtime });
  await setDoc(doc(downtimeCol(db), downtime.id), payload);
  return payload;
}

export async function getDowntimeById(
  db: Firestore,
  id: string,
): Promise<EquipmentDowntime | null> {
  const snap = await getDoc(doc(downtimeCol(db), id));
  return snap.exists() ? (snap.data() as EquipmentDowntime) : null;
}

/** Mais recentes primeiro. */
export async function listDowntimes(
  db: Firestore,
): Promise<EquipmentDowntime[]> {
  const snap = await getDocs(downtimeCol(db));
  return snap.docs
    .map((d) => d.data() as EquipmentDowntime)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function findOpenDowntime(
  db: Firestore,
  equipmentId: string,
): Promise<EquipmentDowntime | null> {
  const all = await listDowntimes(db);
  return all.find((d) => d.equipmentId === equipmentId && !d.endedAt) ?? null;
}
