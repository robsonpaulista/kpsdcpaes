import { doc, getDoc, type Firestore } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { IntegrationState } from "@/types/integration";

export async function getIntegrationState(
  db: Firestore,
  sourceSystem: string,
): Promise<IntegrationState | null> {
  const snap = await getDoc(
    doc(db, COLLECTIONS.integrationState, sourceSystem),
  );
  return snap.exists() ? (snap.data() as IntegrationState) : null;
}
