import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { ProcessRouteStep } from "@/types/production";

const STEP_TIMES_DOC_ID = "step_times";

export interface StepTimesSettings {
  steps: ProcessRouteStep[];
  updatedAt: string;
  updatedBy?: string;
}

function stepTimesRef(db: Firestore) {
  return doc(db, COLLECTIONS.processSettings, STEP_TIMES_DOC_ID);
}

export async function getStepTimesSettings(
  db: Firestore,
): Promise<StepTimesSettings | null> {
  const snap = await getDoc(stepTimesRef(db));
  return snap.exists() ? (snap.data() as StepTimesSettings) : null;
}

export async function saveStepTimesSettings(
  db: Firestore,
  settings: StepTimesSettings,
): Promise<void> {
  await setDoc(stepTimesRef(db), omitUndefined({ ...settings }));
}
