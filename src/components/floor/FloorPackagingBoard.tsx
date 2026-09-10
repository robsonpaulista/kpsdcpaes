"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FloorEmptyState,
  FloorMonitorHeader,
} from "@/components/floor/FloorUi";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  formatDurationClock,
  remainingMs,
} from "@/lib/labels/timing";
import { listProducts } from "@/repositories/products.repository";
import type { LotStepRun, ProductionLot, TimingStatus } from "@/types/production";

export type PackagingQueueItem = {
  lot: ProductionLot;
  step?: LotStepRun;
  timing: TimingStatus | null;
};

type PackZoneId = "LATE" | "ATTENTION" | "ON_TIME" | "WAITING";

const ZONE_ORDER: PackZoneId[] = ["LATE", "ATTENTION", "ON_TIME", "WAITING"];

const ZONE_LABEL: Record<PackZoneId, string> = {
  LATE: "ATRASADOS",
  ATTENTION: "ATENÇÃO",
  ON_TIME: "EM EMBALAGEM",
  WAITING: "PRONTOS PARA EMBALAR",
};

/**
 * Doc 08 §17 — só lotes já liberados do resfriamento (PACKAGING READY / IN_PROGRESS).
 */
export function packagingZone(
  step: LotStepRun | undefined,
  now = Date.now(),
): PackZoneId {
  if (!step || step.status === "READY") return "WAITING";
  if (step.status !== "IN_PROGRESS") return "WAITING";
  if (!step.startedAt || !step.expectedFinishAt) return "ON_TIME";

  const expected = new Date(step.expectedFinishAt).getTime();
  const lateLimit = expected + (step.toleranceMinutes ?? 0) * 60_000;
  if (now > lateLimit) return "LATE";
  if (expected - now <= 5 * 60_000) return "ATTENTION";
  return "ON_TIME";
}

function zoneCardClass(zone: PackZoneId): string {
  switch (zone) {
    case "LATE":
      return "border-danger/40 bg-danger-soft";
    case "ATTENTION":
      return "border-warning/40 bg-warning-soft";
    case "ON_TIME":
      return "border-success/30 bg-success-soft";
    default:
      return "border-dc-orange/40 bg-dc-orange/10";
  }
}

function zoneTitleClass(zone: PackZoneId): string {
  switch (zone) {
    case "LATE":
      return "text-danger";
    case "ATTENTION":
      return "text-warning";
    case "ON_TIME":
      return "text-success";
    default:
      return "text-dc-orange";
  }
}

function clockLabel(step: LotStepRun | undefined, zone: PackZoneId): string {
  if (zone === "WAITING") {
    if (step?.inputQuantity != null) {
      return `${step.inputQuantity.toLocaleString("pt-BR")} un.`;
    }
    return "embalar";
  }
  if (!step?.startedAt) return "—";
  if (!step.expectedFinishAt) {
    return formatDurationClock(Date.now() - new Date(step.startedAt).getTime());
  }
  const rem = remainingMs(step.expectedFinishAt);
  if (rem <= 0) return `+${formatDurationClock(-rem)}`;
  return formatDurationClock(rem);
}

/**
 * Monitor de embalagem (Doc 08 §17–19).
 * Não inventa validade / peso médio — só fila e quantidade recebida conhecida.
 */
export function FloorPackagingBoard({
  items,
  stationLabel = "Embalagem",
  onSelectLot,
  onRefresh,
}: {
  items: PackagingQueueItem[];
  stationLabel?: string;
  onSelectLot: (lotCode: string) => void;
  onRefresh: () => void;
}) {
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!isFirebaseConfigured()) return;
        const products = await listProducts(getFirestoreDb());
        if (cancelled) return;
        const names: Record<string, string> = {};
        for (const p of products) names[p.id] = p.name;
        setProductNames(names);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  void tick;

  const grouped = useMemo(() => {
    const buckets: Record<PackZoneId, PackagingQueueItem[]> = {
      LATE: [],
      ATTENTION: [],
      ON_TIME: [],
      WAITING: [],
    };
    for (const item of items) {
      buckets[packagingZone(item.step)].push(item);
    }
    return ZONE_ORDER.map((id) => ({
      id,
      label: ZONE_LABEL[id],
      items: buckets[id],
    })).filter((z) => z.items.length > 0);
  }, [items, tick]);

  const waiting = items.filter((i) => i.step?.status === "READY").length;
  const packing = items.filter((i) => i.step?.status === "IN_PROGRESS").length;

  return (
    <div className="w-full text-left">
      <FloorMonitorHeader
        eyebrow="Monitor · Embalagem"
        title={
          items.length === 0
            ? "Fila vazia"
            : `${waiting} prontos · ${packing} embalando`
        }
        subtitle="Só após liberação do resfriamento · qtd. recebida vem da etapa anterior"
        onRefresh={onRefresh}
      />

      {items.length === 0 ? (
        <FloorEmptyState detail="Nenhum lote para embalar. Liberar no resfriamento coloca o lote nesta fila." />
      ) : (
        <div className="mt-5 space-y-5">
          {grouped.map((zone) => (
            <section key={zone.id}>
              <h2
                className={`text-xs font-bold uppercase tracking-[0.14em] ${zoneTitleClass(zone.id)}`}
              >
                {zone.label} · {zone.items.length}
              </h2>
              <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {zone.items.map((item) => {
                  const productName =
                    productNames[item.lot.productId] ?? item.lot.productId;
                  const zoneId = packagingZone(item.step);
                  return (
                    <li key={item.lot.id}>
                      <button
                        type="button"
                        onClick={() => onSelectLot(item.lot.lotCode)}
                        className={`floor-zone-card ${zoneCardClass(zoneId)}`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-dc-text-muted">
                          {stationLabel}
                        </span>
                        <span className="mt-1.5 text-base font-medium leading-snug text-dc-text">
                          {productName}
                        </span>
                        <span className="mt-2 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold tabular-nums text-dc-text">
                            {item.lot.lotCode}
                          </span>
                          <span className="floor-timer-sm">
                            {clockLabel(item.step, zoneId)}
                          </span>
                        </span>
                        <span
                          className={`mt-1.5 text-[11px] font-bold ${zoneTitleClass(zoneId)}`}
                        >
                          {ZONE_LABEL[zoneId]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
