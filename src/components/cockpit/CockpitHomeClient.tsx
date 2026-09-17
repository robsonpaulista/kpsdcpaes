"use client";

import { useCallback, useEffect, useState } from "react";
import { CriticalBanner } from "@/components/cockpit/home/CriticalBanner";
import { DashboardFooter } from "@/components/cockpit/home/DashboardFooter";
import { EquipmentStatusList } from "@/components/cockpit/home/EquipmentStatusList";
import { FloorCard } from "@/components/cockpit/home/FloorCard";
import { OperationalPulse } from "@/components/cockpit/home/OperationalPulse";
import { ShiftHighlights } from "@/components/cockpit/home/ShiftHighlights";
import { useCockpitPageTitle } from "@/hooks/useCockpitPageTitle";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { DashboardSnapshot } from "@/domain/cockpit/dashboard-types";
import { getDashboardSnapshot } from "@/services/cockpit-dashboard.service";

/**
 * Visão geral executiva — command center:
 * estado → causa → impacto → decisão.
 */
export function CockpitHomeClient() {
  useCockpitPageTitle("Visão Geral");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const next = await getDashboardSnapshot(db);
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  return (
    <div className="space-y-6 lg:space-y-7">
      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando operação…</p>
      ) : error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : snapshot ? (
        <>
          {snapshot.sync.criticalBanner ? (
            <CriticalBanner data={snapshot.sync.criticalBanner} />
          ) : null}

          <OperationalPulse
            kpis={snapshot.kpis}
            shiftLabel={snapshot.shiftLabel}
          />

          <FloorCard
            items={snapshot.floorItems}
            activeLots={snapshot.counts.activeLots}
            equipmentAvailable={snapshot.counts.equipmentAvailable}
          />

          <EquipmentStatusList
            items={snapshot.equipmentItems}
            operating={snapshot.counts.equipmentOperating}
            available={snapshot.counts.equipmentAvailable}
            stopped={snapshot.counts.equipmentStopped}
          />

          <ShiftHighlights highlights={snapshot.highlights} />

          <DashboardFooter
            updatedAt={snapshot.updatedAt}
            refreshMinutes={snapshot.refreshMinutes}
            sync={snapshot.sync}
          />
        </>
      ) : null}
    </div>
  );
}
