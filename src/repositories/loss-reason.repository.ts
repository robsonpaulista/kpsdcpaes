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
import type { LossReason } from "@/types/loss-reason";
import type { StepType } from "@/types/production";

function lossReasonsCol(db: Firestore) {
  return collection(db, COLLECTIONS.lossReasons);
}

export async function upsertLossReason(
  db: Firestore,
  reason: LossReason,
): Promise<LossReason> {
  const payload = omitUndefined({ ...reason }) as LossReason;
  await setDoc(doc(lossReasonsCol(db), reason.id), payload, { merge: true });
  return payload;
}

export async function getLossReasonById(
  db: Firestore,
  id: string,
): Promise<LossReason | null> {
  const snap = await getDoc(doc(lossReasonsCol(db), id));
  return snap.exists() ? (snap.data() as LossReason) : null;
}

export async function listLossReasons(db: Firestore): Promise<LossReason[]> {
  const snap = await getDocs(lossReasonsCol(db));
  return snap.docs
    .map((d) => d.data() as LossReason)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export async function listLossReasonsForStep(
  db: Firestore,
  stepType: StepType,
): Promise<LossReason[]> {
  const all = await listLossReasons(db);
  return all.filter((r) => {
    if (!r.active) return false;
    if (r.stepTypes.length === 0) return true;
    return r.stepTypes.includes(stepType);
  });
}
