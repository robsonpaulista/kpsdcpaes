"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FloorEmptyState,
  FloorMonitorHeader,
} from "@/components/floor/FloorUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  formatDurationClock,
  formatStandardMinutes,
  remainingMs,
} from "@/lib/labels/timing";
import { listProducts } from "@/repositories/products.repository";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { buildProductMaps } from "@/lib/products/product-maps";
import type {
  LotStepRun,
  ProductionLot,
  StepType,
  TimingStatus,
} from "@/types/production";

export type PrepQueueItem = {
  lot: ProductionLot;
  step?: LotStepRun;
  timing: TimingStatus | null;
};

type PrepZoneId = "LATE" | "ATTENTION" | "ON_TIME" | "WAITING";

const ZONE_ORDER: PrepZoneId[] = ["LATE", "ATTENTION", "ON_TIME", "WAITING"];

const ZONE_LABEL: Record<PrepZoneId, string> = {
  LATE: "ATRASADOS",
  ATTENTION: "ATENÇÃO",
  ON_TIME: "NO PADRÃO",
  WAITING: "NA FILA",
};

/**
 * Estações de preparo (Doc 08 §3–5) — Amassadeira / Modelagem / Embandejamento.
 */
export function prepZone(
  step: LotStepRun | undefined,
  now = Date.now(),
): PrepZoneId {
  if (!step || step.status === "READY") return "WAITING";
  if (step.status !== "IN_PROGRESS") return "WAITING";
  if (!step.startedAt || !step.expectedFinishAt) return "ON_TIME";

  const expected = new Date(step.expectedFinishAt).getTime();
  const lateLimit = expected + (step.toleranceMinutes ?? 0) * 60_000;
  if (now > lateLimit) return "LATE";
  // Atenção nos últimos ~15% ou 3 min (etapas curtas)
  const standard = expected - new Date(step.startedAt).getTime();
  const attentionWindow = Math.min(Math.max(standard * 0.15, 60_000), 3 * 60_000);
  if (expected - now <= attentionWindow) return "ATTENTION";
  return "ON_TIME";
}

function zoneCardClass(zone: PrepZoneId): string {
  switch (zone) {
    case "LATE":
      return "border-danger/40 bg-danger-soft";
    case "ATTENTION":
      return "border-warning/40 bg-warning-soft";
    case "ON_TIME":
      return "border-success/30 bg-success-soft";
    default:
      return "border-dc-border bg-dc-surface";
  }
}

function zoneTitleClass(zone: PrepZoneId): string {
  switch (zone) {
    case "LATE":
      return "text-danger";
    case "ATTENTION":
      return "text-warning";
    case "ON_TIME":
      return "text-success";
    default:
      return "text-dc-text-muted";
  }
}

function clockLabel(step: LotStepRun | undefined, zone: PrepZoneId): string {
  if (zone === "WAITING") {
    if (step?.standardDurationMinutes != null) {
      return formatStandardMinutes(step.standardDurationMinutes);
    }
    return "iniciar";
  }
  if (!step?.startedAt) return "—";
  if (!step.expectedFinishAt) {
    return formatDurationClock(Date.now() - new Date(step.startedAt).getTime());
  }
  const rem = remainingMs(step.expectedFinishAt);
  if (rem <= 0) return `+${formatDurationClock(-rem)}`;
  return formatDurationClock(rem);
}

export function FloorPrepBoard({
  items,
  stepType,
  stationLabel,
  onSelectLot,
  onRefresh,
}: {
  items: PrepQueueItem[];
  stepType: StepType;
  stationLabel: string;
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
    const buckets: Record<PrepZoneId, PrepQueueItem[]> = {
      LATE: [],
      ATTENTION: [],
      ON_TIME: [],
      WAITING: [],
    };
    for (const item of items) {
      buckets[prepZone(item.step)].push(item);
    }
    return ZONE_ORDER.map((id) => ({
      id,
      label: ZONE_LABEL[id],
      items: buckets[id],
    })).filter((z) => z.items.length > 0);
  }, [items, tick]);

  const running = items.filter((i) => i.step?.status === "IN_PROGRESS").length;
  const waiting = items.filter((i) => i.step?.status === "READY").length;
  const stepLabel = stepTypeLabel(stepType);

  return (
    <div className="w-full text-left">
      <FloorMonitorHeader
        eyebrow={`Monitor · ${stepLabel}`}
        title={
          items.length === 0
            ? `${stationLabel} livre`
            : `${waiting} na fila · ${running} em execução`
        }
        subtitle="Timer NO PADRÃO → ATENÇÃO → ATRASADO · tempo do snapshot do produto"
        onRefresh={onRefresh}
      />

      {items.length === 0 ? (
        <FloorEmptyState
          detail={`Nenhum lote aguardando em ${stepLabel.toLowerCase()}. Liberar uma OP no PCP coloca o lote na primeira etapa.`}
          action={
            <Link
              href="/app/pcp"
              className="inline-flex h-11 items-center rounded-[12px] bg-dc-orange px-4 text-sm font-semibold text-white"
            >
              Ir ao PCP →
            </Link>
          }
        />
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
                  const zoneId = prepZone(item.step);
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
                              {stationLabel}
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
