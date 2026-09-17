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
import type { ProductionLot } from "@/types/production";

function lotsCol(db: Firestore) {
  return collection(db, COLLECTIONS.productionLots);
}

export async function upsertLot(
  db: Firestore,
  lot: ProductionLot,
): Promise<ProductionLot> {
  const payload = omitUndefined({ ...lot }) as ProductionLot;
  await setDoc(doc(lotsCol(db), lot.id), payload, { merge: true });
  return payload;
}

export async function getLotById(
  db: Firestore,
  id: string,
): Promise<ProductionLot | null> {
  const snap = await getDoc(doc(lotsCol(db), id));
  return snap.exists() ? (snap.data() as ProductionLot) : null;
}

export async function getLotByCode(
  db: Firestore,
  lotCode: string,
): Promise<ProductionLot | null> {
  const q = query(lotsCol(db), where("lotCode", "==", lotCode.trim().toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as ProductionLot;
}

export async function listLotsByOrder(
  db: Firestore,
  productionOrderId: string,
): Promise<ProductionLot[]> {
  const q = query(
    lotsCol(db),
    where("productionOrderId", "==", productionOrderId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ProductionLot);
}

export async function listLots(
  db: Firestore,
): Promise<ProductionLot[]> {
  const snap = await getDocs(lotsCol(db));
  return snap.docs
    .map((d) => d.data() as ProductionLot)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Lotes ativos para fila "Atenção Agora" (sem orderBy — evita índice composto). */
export async function listActiveLots(
  db: Firestore,
): Promise<ProductionLot[]> {
  const snap = await getDocs(lotsCol(db));
  return snap.docs
    .map((d) => d.data() as ProductionLot)
    .filter((lot) => lot.status === "WAITING" || lot.status === "IN_PROGRESS")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Lotes bloqueados por qualidade (fora do fluxo ativo, mas ainda na fábrica). */
export async function listBlockedLots(
  db: Firestore,
): Promise<ProductionLot[]> {
  const snap = await getDocs(lotsCol(db));
  return snap.docs
    .map((d) => d.data() as ProductionLot)
    .filter((lot) => lot.status === "BLOCKED")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Lotes concluídos (mais recentes primeiro). */
export async function listCompletedLots(
  db: Firestore,
  limitCount = 20,
): Promise<ProductionLot[]> {
  const snap = await getDocs(lotsCol(db));
  return snap.docs
    .map((d) => d.data() as ProductionLot)
    .filter((lot) => lot.status === "COMPLETED")
    .sort((a, b) => {
      const aAt = a.completedAt ?? a.updatedAt;
      const bAt = b.completedAt ?? b.updatedAt;
      return bAt.localeCompare(aAt);
    })
    .slice(0, limitCount);
}

/** Produções recentes para rastreabilidade (ativos + concluídos). */
export async function listRecentLots(
  db: Firestore,
  limitCount = 20,
): Promise<ProductionLot[]> {
  const snap = await getDocs(lotsCol(db));
  return snap.docs
    .map((d) => d.data() as ProductionLot)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limitCount);
}

/** Fila da estação: lotes READY (e IN_PROGRESS) na etapa informada. */
export async function listLotsForStationStep(
  db: Firestore,
  stepType: ProductionLot["currentStep"],
): Promise<ProductionLot[]> {
  if (!stepType) return [];
  const snap = await getDocs(lotsCol(db));
  return snap.docs
    .map((d) => d.data() as ProductionLot)
    .filter(
      (lot) =>
        lot.currentStep === stepType &&
        (lot.currentStepStatus === "READY" ||
          lot.currentStepStatus === "IN_PROGRESS") &&
        lot.status !== "COMPLETED" &&
        lot.status !== "CANCELLED" &&
        lot.status !== "BLOCKED",
    )
    .sort((a, b) => {
      if (a.currentStepStatus === "IN_PROGRESS" && b.currentStepStatus !== "IN_PROGRESS") {
        return -1;
      }
      if (b.currentStepStatus === "IN_PROGRESS" && a.currentStepStatus !== "IN_PROGRESS") {
        return 1;
      }
      return a.updatedAt.localeCompare(b.updatedAt);
    });
}
