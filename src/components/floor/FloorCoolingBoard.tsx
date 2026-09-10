"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FloorEmptyState,
  FloorMonitorHeader,
} from "@/components/floor/FloorUi";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDurationClock } from "@/lib/labels/timing";
import {
  coolingMinimumRemainingMs,
  getCoolingReleaseAt,
  isCoolingMinimumReached,
} from "@/services/workflow.service";
import { listProducts } from "@/repositories/products.repository";
import type { LotStepRun, ProductionLot, TimingStatus } from "@/types/production";

export type CoolingQueueItem = {
  lot: ProductionLot;
  step?: LotStepRun;
  timing: TimingStatus | null;
};

type CoolZoneId = "LATE" | "READY" | "COOLING" | "WAITING";

const ZONE_ORDER: CoolZoneId[] = ["LATE", "READY", "COOLING", "WAITING"];

const ZONE_LABEL: Record<CoolZoneId, string> = {
  LATE: "ATRASADOS NA LIBERAÇÃO",
  READY: "PRONTOS PARA EMBALAGEM",
  COOLING: "EM RESFRIAMENTO",
  WAITING: "AGUARDANDO INÍCIO",
};

/**
 * Doc 08 §14–16 — zonas pelo releaseAt (tempo mínimo).
 */
export function coolingZone(
  step: LotStepRun | undefined,
  now = Date.now(),
): CoolZoneId {
  if (!step || step.status === "READY") return "WAITING";
  if (step.status !== "IN_PROGRESS") return "WAITING";

  const releaseAt = getCoolingReleaseAt(step);
  if (!releaseAt) return "COOLING";

  const releaseMs = new Date(releaseAt).getTime();
  const lateLimit = releaseMs + (step.toleranceMinutes ?? 0) * 60_000;

  if (now >= lateLimit && isCoolingMinimumReached(step, new Date(now))) {
    return "LATE";
  }
  if (isCoolingMinimumReached(step, new Date(now))) return "READY";
  return "COOLING";
}

function zoneCardClass(zone: CoolZoneId): string {
  switch (zone) {
    case "LATE":
      return "border-danger/40 bg-danger-soft";
    case "READY":
      return "border-dc-orange/40 bg-dc-orange/10";
    case "COOLING":
      return "border-dc-border bg-dc-surface";
    default:
      return "border-dc-border bg-dc-surface-secondary";
  }
}

function zoneTitleClass(zone: CoolZoneId): string {
  switch (zone) {
    case "LATE":
      return "text-danger";
    case "READY":
      return "text-dc-orange";
    case "COOLING":
      return "text-dc-text-secondary";
    default:
      return "text-dc-text-muted";
  }
}

function clockLabel(step: LotStepRun | undefined, zone: CoolZoneId): string {
  if (!step) return "—";
  if (zone === "WAITING") return "—";
  if (zone === "COOLING") {
    const rem = coolingMinimumRemainingMs(step) ?? 0;
    return formatDurationClock(rem);
  }
  // READY / LATE: tempo desde liberável
  const releaseAt = getCoolingReleaseAt(step);
  if (!releaseAt) return "liberar";
  const over = Date.now() - new Date(releaseAt).getTime();
  if (over <= 0) return "liberar";
  return `+${formatDurationClock(over)}`;
}

/**
 * Monitor de resfriamento — controle temporal (Doc 08 §14–16).
 */
export function FloorCoolingBoard({
  items,
  stationLabel = "Resfriamento",
  onSelectLot,
  onRefresh,
}: {
  items: CoolingQueueItem[];
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
    const buckets: Record<CoolZoneId, CoolingQueueItem[]> = {
      LATE: [],
      READY: [],
      COOLING: [],
      WAITING: [],
    };
    for (const item of items) {
      buckets[coolingZone(item.step)].push(item);
    }
    return ZONE_ORDER.map((id) => ({
      id,
      label: ZONE_LABEL[id],
      items: buckets[id],
    })).filter((z) => z.items.length > 0);
  }, [items, tick]);

  const cooling = items.filter((i) => coolingZone(i.step) === "COOLING").length;
  const ready = items.filter((i) => {
    const z = coolingZone(i.step);
    return z === "READY" || z === "LATE";
  }).length;

  return (
    <div className="w-full text-left">
      <FloorMonitorHeader
        eyebrow="Monitor · Resfriamento"
        title={
          items.length === 0
            ? "Nada em resfriamento"
            : `${cooling} no tempo · ${ready} liberáveis`
        }
        subtitle="Relógio inicia na saída do forno · embalagem bloqueada até o mínimo"
        onRefresh={onRefresh}
      />

      {items.length === 0 ? (
        <FloorEmptyState detail="Finalize o forno para o lote entrar automaticamente no resfriamento." />
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
                  const zoneId = coolingZone(item.step);
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
