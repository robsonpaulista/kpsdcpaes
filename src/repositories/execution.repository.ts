import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import type { LotStepRun, ProductionEvent } from "@/types/production";

function stepsCol(db: Firestore) {
  return collection(db, COLLECTIONS.lotStepRuns);
}

function eventsCol(db: Firestore) {
  return collection(db, COLLECTIONS.productionEvents);
}

export async function upsertStepRun(
  db: Firestore,
  step: LotStepRun,
): Promise<LotStepRun> {
  const payload = omitUndefined({ ...step }) as LotStepRun;
  await setDoc(doc(stepsCol(db), step.id), payload, { merge: true });
  return payload;
}

export async function getStepRun(
  db: Firestore,
  id: string,
): Promise<LotStepRun | null> {
  const snap = await getDoc(doc(stepsCol(db), id));
  return snap.exists() ? (snap.data() as LotStepRun) : null;
}

export async function listStepRunsByLot(
  db: Firestore,
  lotId: string,
): Promise<LotStepRun[]> {
  const q = query(stepsCol(db), where("lotId", "==", lotId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as LotStepRun)
    .sort((a, b) => a.sequence - b.sequence);
}

export async function getActiveStepRun(
  db: Firestore,
  lotId: string,
): Promise<LotStepRun | null> {
  const steps = await listStepRunsByLot(db, lotId);
  return (
    steps.find((s) => s.status === "IN_PROGRESS") ??
    steps.find((s) => s.status === "READY") ??
    null
  );
}

/** Etapas ativas (READY / IN_PROGRESS) — para kanban/timers. */
export async function listOpenStepRuns(
  db: Firestore,
): Promise<LotStepRun[]> {
  const snap = await getDocs(stepsCol(db));
  return snap.docs
    .map((d) => d.data() as LotStepRun)
    .filter((s) => s.status === "READY" || s.status === "IN_PROGRESS");
}

/** Etapas concluídas — tempos de espera/processo para gargalos. */
export async function listCompletedStepRuns(
  db: Firestore,
): Promise<LotStepRun[]> {
  const snap = await getDocs(stepsCol(db));
  return snap.docs
    .map((d) => d.data() as LotStepRun)
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) =>
      (b.finishedAt ?? b.updatedAt).localeCompare(
        a.finishedAt ?? a.updatedAt,
      ),
    );
}

/** Etapas concluídas com perda > 0 — alimenta fila de Qualidade. */
export async function listStepRunsWithLoss(
  db: Firestore,
): Promise<LotStepRun[]> {
  const completed = await listCompletedStepRuns(db);
  return completed.filter(
    (s) => s.lossQuantity != null && s.lossQuantity > 0,
  );
}

export async function createProductionEvent(
  db: Firestore,
  event: ProductionEvent,
): Promise<ProductionEvent> {
  const payload = omitUndefined({ ...event }) as ProductionEvent;
  await setDoc(doc(eventsCol(db), event.id), payload, { merge: true });
  return payload;
}

export async function listEventsByLot(
  db: Firestore,
  lotId: string,
): Promise<ProductionEvent[]> {
  const q = query(eventsCol(db), where("lotId", "==", lotId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as ProductionEvent)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export async function findEventByOperationId(
  db: Firestore,
  operationId: string,
): Promise<ProductionEvent | null> {
  const q = query(eventsCol(db), where("operationId", "==", operationId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as ProductionEvent;
}
