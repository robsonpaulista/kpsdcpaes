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
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { buildProductMaps } from "@/lib/products/product-maps";
import type { LotStepRun, ProductionLot, TimingStatus } from "@/types/production";

export type ProofQueueItem = {
  lot: ProductionLot;
  step?: LotStepRun;
  timing: TimingStatus | null;
};

/** Zonas do monitor Doc 08 §7–8. */
export type ProofZoneId =
  | "LATE"
  | "READY"
  | "ATTENTION"
  | "ON_TIME"
  | "WAITING";

const ZONE_ORDER: ProofZoneId[] = [
  "LATE",
  "READY",
  "ATTENTION",
  "ON_TIME",
  "WAITING",
];

const ZONE_LABEL: Record<ProofZoneId, string> = {
  LATE: "ATRASADOS",
  READY: "PRONTOS",
  ATTENTION: "ATENÇÃO",
  ON_TIME: "NO PADRÃO",
  WAITING: "AGUARDANDO ENTRADA",
};

/**
 * Classificação temporal da fermentação (Doc 08 §8).
 * PRONTO = tempo previsto atingido, ainda na câmara (≠ transferido).
 */
export function proofingZone(
  step: LotStepRun | undefined,
  now = Date.now(),
): ProofZoneId {
  if (!step || step.status === "READY") return "WAITING";
  if (step.status !== "IN_PROGRESS") return "WAITING";
  if (!step.startedAt || !step.expectedFinishAt) return "ON_TIME";

  const expected = new Date(step.expectedFinishAt).getTime();
  const lateLimit = expected + (step.toleranceMinutes ?? 0) * 60_000;
  if (now > lateLimit) return "LATE";
  if (now >= expected) return "READY";
  if (expected - now <= 15 * 60_000) return "ATTENTION";
  return "ON_TIME";
}

function zoneCardClass(zone: ProofZoneId): string {
  switch (zone) {
    case "LATE":
      return "border-danger/40 bg-danger-soft";
    case "READY":
      return "border-dc-orange/40 bg-dc-orange/10";
    case "ATTENTION":
      return "border-warning/40 bg-warning-soft";
    case "ON_TIME":
      return "border-success/30 bg-success-soft";
    default:
      return "border-dc-border bg-dc-surface";
  }
}

function zoneTitleClass(zone: ProofZoneId): string {
  switch (zone) {
    case "LATE":
      return "text-danger";
    case "READY":
      return "text-dc-orange";
    case "ATTENTION":
      return "text-warning";
    case "ON_TIME":
      return "text-success";
    default:
      return "text-dc-text-muted";
  }
}

function clockLabel(step: LotStepRun | undefined, zone: ProofZoneId): string {
  if (!step?.startedAt) return "—";
  if (zone === "WAITING") return "fila";
  if (!step.expectedFinishAt) {
    const elapsed = Date.now() - new Date(step.startedAt).getTime();
    return formatDurationClock(elapsed);
  }
  const rem = remainingMs(step.expectedFinishAt);
  if (rem <= 0) {
    return `+${formatDurationClock(-rem)}`;
  }
  return formatDurationClock(rem);
}

/**
 * Monitor multi-lote da fermentação (Doc 08 §6–9).
 */
export function FloorProofingBoard({
  items,
  chamberLabel = "Câmara",
  onSelectLot,
  onRefresh,
}: {
  items: ProofQueueItem[];
  chamberLabel?: string;
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
    const buckets: Record<ProofZoneId, ProofQueueItem[]> = {
      LATE: [],
      READY: [],
      ATTENTION: [],
      ON_TIME: [],
      WAITING: [],
    };
    for (const item of items) {
      const zone = proofingZone(item.step);
      buckets[zone].push(item);
    }
    return ZONE_ORDER.map((id) => ({
      id,
      label: ZONE_LABEL[id],
      items: buckets[id],
    })).filter((z) => z.items.length > 0);
  }, [items, tick]);

  const totalInChamber = items.filter(
    (i) => i.step?.status === "IN_PROGRESS",
  ).length;

  return (
    <div className="w-full text-left">
      <FloorMonitorHeader
        eyebrow="Monitor · Fermentação"
        title={
          totalInChamber === 0
            ? "Câmaras livres"
            : totalInChamber === 1
              ? "1 lote nas câmaras"
              : `${totalInChamber} lotes nas câmaras`
        }
        subtitle="PRONTO ≠ transferido — liberar aqui só sinaliza forno"
        onRefresh={onRefresh}
      />

      {items.length === 0 ? (
        <FloorEmptyState detail="Nenhum lote em fermentação ou na fila de entrada." />
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
                  const zoneId = proofingZone(item.step);

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
                              {chamberLabel}
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
                          {zoneId === "READY" ? " PARA FORNO" : ""}
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
