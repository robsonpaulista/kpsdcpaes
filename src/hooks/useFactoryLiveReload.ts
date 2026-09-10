"use client";

import { useEffect, useRef, useState } from "react";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { subscribeFactoryData } from "@/lib/firebase/subscribe-factory";

/**
 * Recarrega dados quando Firestore muda (debounce 400ms).
 * Retorna `live` após o primeiro snapshot pós-subscribe.
 */
export function useFactoryLiveReload(
  onReload: (opts?: { silent?: boolean }) => void,
  enabled = true,
): boolean {
  const [live, setLive] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReloadRef = useRef(onReload);
  onReloadRef.current = onReload;

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) return;
    try {
      const db = getFirestoreDb();
      const unsub = subscribeFactoryData(db, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          setLive(true);
          onReloadRef.current({ silent: true });
        }, 400);
      });
      return () => {
        unsub();
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    } catch {
      return undefined;
    }
  }, [enabled]);

  return live;
}
