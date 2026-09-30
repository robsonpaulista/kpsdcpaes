"use client";

import { useCallback, useEffect, useState } from "react";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  loadEquipmentManagementData,
  type EquipmentManagementData,
} from "@/services/equipment-management.service";

const EMPTY: EquipmentManagementData = {
  equipment: [],
  downtimes: [],
  maintenance: [],
};

/** Equipamentos + paradas + manutenções, com recarga ao vivo. */
export function useEquipmentManagementData() {
  const [data, setData] = useState<EquipmentManagementData>(EMPTY);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      setData(await loadEquipmentManagementData(getFirestoreDb()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useFactoryLiveReload(reload);

  return { data, loading, error, reload };
}
