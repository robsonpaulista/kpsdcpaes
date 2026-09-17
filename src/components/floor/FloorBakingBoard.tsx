"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  FloorEmptyState,
  FloorMonitorHeader,
} from "@/components/floor/FloorUi";
import {
  formatDurationClock,
  formatStandardMinutes,
  remainingMs,
} from "@/lib/labels/timing";
import { listProducts } from "@/repositories/products.repository";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { buildProductMaps } from "@/lib/products/product-maps";
import type { LotStepRun, ProductionLot, TimingStatus } from "@/types/production";

export type BakingQueueItem = {
  lot: ProductionLot;
  step?: LotStepRun;
  timing: TimingStatus | null;
};

type BakeZoneId = "LATE" | "ATTENTION" | "ON_TIME" | "WAITING";

const ZONE_ORDER: BakeZoneId[] = ["LATE", "ATTENTION", "ON_TIME", "WAITING"];

const ZONE_LABEL: Record<BakeZoneId, string> = {
  LATE: "ATRASADOS NO FORNO",
  ATTENTION: "ATENÇÃO",
  ON_TIME: "NO FORNO",
  WAITING: "PRONTOS PARA FORNO",
};

/**
 * Doc 08 §10 — fila do forno.
 * WAITING = liberados da fermentação (BAKING READY).
 */
export function bakingZone(
  step: LotStepRun | undefined,
  now = Date.now(),
): BakeZoneId {
  if (!step || step.status === "READY") return "WAITING";
  if (step.status !== "IN_PROGRESS") return "WAITING";
  if (!step.startedAt || !step.expectedFinishAt) return "ON_TIME";

  const expected = new Date(step.expectedFinishAt).getTime();
  const lateLimit = expected + (step.toleranceMinutes ?? 0) * 60_000;
  if (now > lateLimit) return "LATE";
  if (expected - now <= 2 * 60_000) return "ATTENTION";
  return "ON_TIME";
}

function zoneCardClass(zone: BakeZoneId): string {
  switch (zone) {
    case "LATE":
      return "border-danger/40 bg-danger-soft";
    case "ATTENTION":
      return "border-warning/40 bg-warning-soft";
    case "ON_TIME":
      return "border-dc-orange/40 bg-dc-orange/10";
    default:
      return "border-dc-border bg-dc-surface";
  }
}

function zoneTitleClass(zone: BakeZoneId): string {
  switch (zone) {
    case "LATE":
      return "text-danger";
    case "ATTENTION":
      return "text-warning";
    case "ON_TIME":
      return "text-dc-orange";
    default:
      return "text-dc-text-muted";
  }
}

function clockLabel(step: LotStepRun | undefined, zone: BakeZoneId): string {
  if (zone === "WAITING") {
    if (step?.standardDurationMinutes != null) {
      return formatStandardMinutes(step.standardDurationMinutes);
    }
    return "carregar";
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
 * Monitor do forno (Doc 08 §10–13).
 * Temperatura oficial só quando existir no produto — não inventar °C.
 */
export function FloorBakingBoard({
  items,
  ovenLabel = "Forno",
  onSelectLot,
  onRefresh,
}: {
  items: BakingQueueItem[];
  ovenLabel?: string;
  onSelectLot: (lotCode: string) => void;
  onRefresh: () => void;
}) {
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string | null>>({});
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
        const maps = buildProductMaps(products);
        setProductNames(maps.names);
        setProductImages(maps.images);
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
    const buckets: Record<BakeZoneId, BakingQueueItem[]> = {
      LATE: [],
      ATTENTION: [],
      ON_TIME: [],
      WAITING: [],
    };
    for (const item of items) {
      buckets[bakingZone(item.step)].push(item);
    }
    return ZONE_ORDER.map((id) => ({
      id,
      label: ZONE_LABEL[id],
      items: buckets[id],
    })).filter((z) => z.items.length > 0);
  }, [items, tick]);

  const inOven = items.filter((i) => i.step?.status === "IN_PROGRESS").length;
  const waiting = items.filter((i) => i.step?.status === "READY").length;

  return (
    <div className="w-full text-left">
      <FloorMonitorHeader
        eyebrow="Monitor · Forneamento"
        title={
          inOven === 0 && waiting === 0
            ? "Forno livre"
            : `${waiting} prontos · ${inOven} no forno`
        }
        subtitle="Só lotes liberados da fermentação · tempo do snapshot do produto"
        onRefresh={onRefresh}
      />

      {items.length === 0 ? (
        <FloorEmptyState detail='Nenhum lote no forno. Liberar fermentação na câmara gera a fila “Prontos para forno”.' />
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
                  const zoneId = bakingZone(item.step);
                  return (
                    <li key={item.lot.id}>
                      <button
                        type="button"
                        onClick={() => onSelectLot(item.lot.lotCode)}
                        className={`floor-zone-card ${zoneCardClass(zoneId)}`}
                      >
                        <span className="flex items-start gap-3">
                          <ProductThumbnail
                            imageUrl={productImages[item.lot.productId]}
                            alt={productName}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold uppercase tracking-wide text-dc-text-muted">
                              {ovenLabel}
                            </span>
                            <span className="mt-1.5 block text-base font-medium leading-snug text-dc-text">
                              {productName}
                            </span>
                          </span>
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
