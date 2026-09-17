"use client";

import { useCallback, useEffect, useState } from "react";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import { listQualityIncidents } from "@/repositories/quality.repository";
import {
  createQualityIncident,
  listQualityLossSignals,
  releaseBlockedLot,
  resolveQualityIncident,
} from "@/services/quality.service";
import type { Product, StepType } from "@/types/production";
import type { QualityIncident, QualityLossSignal } from "@/types/quality";

export type CreateIncidentInput = {
  lotCodeOrId: string;
  description: string;
  blockLot: boolean;
  relatedStepRunId?: string;
  lossQuantity?: number;
  lossReason?: string;
  stepType?: StepType;
};

export function useQualityBoard() {
  const [incidents, setIncidents] = useState<QualityIncident[]>([]);
  const [signals, setSignals] = useState<QualityLossSignal[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [list, products, lossSignals, orders] = await Promise.all([
        listQualityIncidents(db),
        listProducts(db),
        listQualityLossSignals(db),
        listProductionOrders(db),
      ]);
      setIncidents(list);
      setSignals(lossSignals);
      setCatalog(
        products
          .filter((p) => p.active)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
      const names: Record<string, string> = {};
      for (const p of products) names[p.id] = p.name;
      setProductNames(names);
      const nums: Record<string, string> = {};
      for (const o of orders) nums[o.id] = o.externalOrderNumber;
      setOrderNumbers(nums);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) {
        setIncidents([]);
        setSignals([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  const pendingSignals = signals.filter((s) => !s.hasIncident);
  const openCount = incidents.filter((i) => i.status === "OPEN").length;
  const blockedOpen = incidents.filter(
    (i) => i.status === "OPEN" && i.blocksLot,
  ).length;

  async function createIncident(input: CreateIncidentInput) {
    setBusy(true);
    setError(null);
    try {
      const db = getFirestoreDb();
      const result = await createQualityIncident(db, input);
      await load({ silent: true });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao registrar";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setBusy(false);
    }
  }

  async function resolveIncident(id: string, resolutionNote: string) {
    setBusy(true);
    setError(null);
    try {
      const db = getFirestoreDb();
      await resolveQualityIncident(db, id, resolutionNote);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resolver");
    } finally {
      setBusy(false);
    }
  }

  async function releaseLot(lotId: string, note: string) {
    setBusy(true);
    setError(null);
    try {
      const db = getFirestoreDb();
      await releaseBlockedLot(db, lotId, note);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar lote");
    } finally {
      setBusy(false);
    }
  }

  return {
    incidents,
    signals,
    pendingSignals,
    openCount,
    blockedOpen,
    catalog,
    productNames,
    orderNumbers,
    loading,
    error,
    setError,
    busy,
    load,
    createIncident,
    resolveIncident,
    releaseLot,
  };
}
