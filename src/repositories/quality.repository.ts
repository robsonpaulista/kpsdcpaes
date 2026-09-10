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
import type { QualityIncident } from "@/types/quality";

function incidentsCol(db: Firestore) {
  return collection(db, COLLECTIONS.qualityIncidents);
}

export async function upsertQualityIncident(
  db: Firestore,
  incident: QualityIncident,
): Promise<QualityIncident> {
  const payload = omitUndefined({ ...incident }) as QualityIncident;
  await setDoc(doc(incidentsCol(db), incident.id), payload, { merge: true });
  return payload;
}

export async function getQualityIncident(
  db: Firestore,
  id: string,
): Promise<QualityIncident | null> {
  const snap = await getDoc(doc(incidentsCol(db), id));
  return snap.exists() ? (snap.data() as QualityIncident) : null;
}

export async function listQualityIncidents(
  db: Firestore,
): Promise<QualityIncident[]> {
  const snap = await getDocs(incidentsCol(db));
  return snap.docs
    .map((d) => d.data() as QualityIncident)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listIncidentsByLot(
  db: Firestore,
  lotId: string,
): Promise<QualityIncident[]> {
  const all = await listQualityIncidents(db);
  return all.filter((i) => i.lotId === lotId);
}
