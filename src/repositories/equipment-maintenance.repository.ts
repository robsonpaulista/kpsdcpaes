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
import type { EquipmentMaintenance } from "@/types/equipment";

function maintenanceCol(db: Firestore) {
  return collection(db, COLLECTIONS.equipmentMaintenance);
}

export async function saveMaintenance(
  db: Firestore,
  maintenance: EquipmentMaintenance,
): Promise<EquipmentMaintenance> {
  const payload = omitUndefined({ ...maintenance });
  await setDoc(doc(maintenanceCol(db), maintenance.id), payload);
  return payload;
}

export async function getMaintenanceById(
  db: Firestore,
  id: string,
): Promise<EquipmentMaintenance | null> {
  const snap = await getDoc(doc(maintenanceCol(db), id));
  return snap.exists() ? (snap.data() as EquipmentMaintenance) : null;
}

/** Ordenadas por data planejada (mais antigas primeiro). */
export async function listMaintenance(
  db: Firestore,
): Promise<EquipmentMaintenance[]> {
  const snap = await getDocs(maintenanceCol(db));
  return snap.docs
    .map((d) => d.data() as EquipmentMaintenance)
    .sort(
      (a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate) ||
        (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""),
    );
}
