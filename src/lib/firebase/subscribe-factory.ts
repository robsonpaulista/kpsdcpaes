import {
  collection,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Observa collections que alimentam Cockpit, Display, Floor e Produção.
 * Debounce no caller — vários snapshots disparam o mesmo reload.
 */
export function subscribeFactoryData(
  db: Firestore,
  onChange: () => void,
): Unsubscribe {
  const unsubscribers = [
    onSnapshot(collection(db, COLLECTIONS.productionLots), onChange),
    onSnapshot(collection(db, COLLECTIONS.lotStepRuns), onChange),
    onSnapshot(collection(db, COLLECTIONS.qualityIncidents), onChange),
    onSnapshot(collection(db, COLLECTIONS.productionOrders), onChange),
    onSnapshot(collection(db, COLLECTIONS.equipment), onChange),
    onSnapshot(collection(db, COLLECTIONS.integrationState), onChange),
  ];
  return () => {
    for (const unsub of unsubscribers) unsub();
  };
}

/** @deprecated Use subscribeFactoryData */
export const subscribeCockpitData = subscribeFactoryData;
