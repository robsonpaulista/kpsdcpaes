import type { Firestore } from "firebase/firestore";
import { PROVISIONAL_LOSS_UNIT_BRL } from "@/domain/cockpit/dashboard-types";
import {
  DEFAULT_PROCESS_ROUTE,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { dayKey, inPeriod } from "@/lib/production/list-filters";
import {
  listCompletedStepRuns,
  listStepRunsWithLoss,
} from "@/repositories/execution.repository";
import {
  getLotById,
  listCompletedLots,
} from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type { ProductionLot, StepType, TimingStatus } from "@/types/production";

export type ProductionOverviewPeriod = {
  dateFrom: string;
  dateTo: string;
};

export type ChartBar = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  /** Largura/altura relativa ao máximo da série (0–100). */
  sharePercent: number;
};

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
};

export type ProductionOverviewMetrics = {
  dateFrom: string;
  dateTo: string;
  plannedUnits: number;
  realizedUnits: number;
  adherencePercent: number | null;
  onTimePercent: number | null;
  timedSteps: number;
  yieldPercent: number | null;
  lossUnits: number;
  lossBrl: number;
  completedLots: number;
  packagingSteps: number;
  lossByStep: ChartBar[];
  productionByProduct: ChartBar[];
  avgMinutesByStep: ChartBar[];
  avgLotMinutes: number | null;
  lotsWithDuration: number;
  avgOrderMinutes: number | null;
  ordersWithDuration: number;
  productionByShift: ChartBar[];
  /** Produção (embalagem) por dia civil no período. */
  productionByDay: ChartPoint[];
  /** Perdas por dia civil no período. */
  lossByDay: ChartPoint[];
};

function localTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultOverviewPeriod(): ProductionOverviewPeriod {
  const today = localTodayKey();
  return { dateFrom: today, dateTo: today };
}

export function overviewPeriodPreset(
  days: number,
): ProductionOverviewPeriod {
  const to = localTodayKey();
  if (days <= 1) return { dateFrom: to, dateTo: to };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const from = dayKey(start.toISOString()) ?? to;
  return { dateFrom: from, dateTo: to };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toShareBars(
  rows: Array<{ key: string; label: string; value: number }>,
  unitSuffix: string,
): ChartBar[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(0, ...rows.map((r) => r.value));
  return rows.map((r) => {
    const share = total > 0 ? round1((r.value / total) * 100) : 0;
    return {
      key: r.key,
      label: r.label,
      value: r.value,
      valueLabel: `${r.value.toLocaleString("pt-BR")} ${unitSuffix} · ${share}%`,
      sharePercent: max > 0 ? round1((r.value / max) * 100) : 0,
    };
  });
}

function toDurationBars(
  rows: Array<{ key: string; label: string; value: number }>,
): ChartBar[] {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    value: r.value,
    valueLabel: r.value > 0 ? formatMinutes(r.value) : "—",
    sharePercent: max > 0 ? round1((r.value / max) * 100) : 0,
  }));
}

function stepProcessMinutes(step: {
  processDurationMinutes?: number;
  startedAt?: string;
  finishedAt?: string;
}): number | null {
  if (
    step.processDurationMinutes != null &&
    Number.isFinite(step.processDurationMinutes) &&
    step.processDurationMinutes >= 0
  ) {
    return step.processDurationMinutes;
  }
  if (step.startedAt && step.finishedAt) {
    const ms =
      new Date(step.finishedAt).getTime() -
      new Date(step.startedAt).getTime();
    if (Number.isFinite(ms) && ms >= 0) return ms / 60_000;
  }
  return null;
}

function lotCycleMinutes(lot: ProductionLot): number | null {
  const start = lot.startedAt ?? lot.createdAt;
  const end = lot.completedAt ?? lot.updatedAt;
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 60_000;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function localHour(iso: string): number {
  return new Date(iso).getHours();
}

function eachDayKey(from: string, to: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return [from];
  }
  while (cursor.getTime() <= end.getTime()) {
    const key = dayKey(cursor.toISOString());
    if (key) keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.length > 0 ? keys : [from];
}

function shortDayLabel(isoDay: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return isoDay;
  return `${m[3]}/${m[2]}`;
}

export async function getProductionOverviewMetrics(
  db: Firestore,
  period: ProductionOverviewPeriod,
): Promise<ProductionOverviewMetrics> {
  const dateFrom = period.dateFrom || localTodayKey();
  const dateTo = period.dateTo || dateFrom;

  const [completedSteps, lossSteps, lots, orders, products] =
    await Promise.all([
      listCompletedStepRuns(db),
      listStepRunsWithLoss(db),
      listCompletedLots(db, 200),
      listProductionOrders(db),
      listProducts(db),
    ]);

  const productNames: Record<string, string> = {};
  for (const p of products) productNames[p.id] = p.name;

  const lotById = new Map<string, ProductionLot>();
  for (const lot of lots) lotById.set(lot.id, lot);

  const packagingInPeriod = completedSteps.filter(
    (s) =>
      s.stepType === "PACKAGING" &&
      s.outputQuantity != null &&
      inPeriod(s.finishedAt ?? s.updatedAt, dateFrom, dateTo),
  );

  const realizedUnits = packagingInPeriod.reduce(
    (sum, s) => sum + (s.outputQuantity ?? 0),
    0,
  );

  const plannedUnits = orders
    .filter(
      (o) =>
        o.productionStatus !== "CANCELLED" &&
        Boolean(o.productionDate) &&
        inPeriod(o.productionDate, dateFrom, dateTo),
    )
    .reduce((sum, o) => sum + (o.plannedQuantity ?? 0), 0);

  const adherencePercent =
    plannedUnits > 0
      ? Math.round((realizedUnits / plannedUnits) * 1000) / 10
      : null;

  const lossesInPeriod = lossSteps.filter((s) =>
    inPeriod(s.finishedAt ?? s.updatedAt, dateFrom, dateTo),
  );
  const lossUnits = lossesInPeriod.reduce(
    (sum, s) => sum + (s.lossQuantity ?? 0),
    0,
  );
  const lossBrl = Math.round(lossUnits * PROVISIONAL_LOSS_UNIT_BRL);

  const yieldPercent =
    realizedUnits > 0
      ? round1(
          Math.max(
            0,
            Math.min(100, ((realizedUnits - lossUnits) / realizedUnits) * 100),
          ),
        )
      : null;

  const TIMING: TimingStatus[] = ["ON_TIME", "ATTENTION", "LATE"];
  const timedInPeriod = completedSteps.filter(
    (s) =>
      inPeriod(s.finishedAt ?? s.updatedAt, dateFrom, dateTo) &&
      TIMING.includes(s.timingStatus),
  );
  const onTimeCount = timedInPeriod.filter(
    (s) => s.timingStatus === "ON_TIME",
  ).length;
  const onTimePercent =
    timedInPeriod.length > 0
      ? Math.round((onTimeCount / timedInPeriod.length) * 1000) / 10
      : null;

  const completedLotsInPeriod = lots.filter((l) =>
    inPeriod(l.completedAt ?? l.updatedAt, dateFrom, dateTo),
  );

  const needLotIds = [
    ...new Set([
      ...lossesInPeriod.map((s) => s.lotId),
      ...packagingInPeriod.map((s) => s.lotId),
    ]),
  ].filter((id) => !lotById.has(id));

  if (needLotIds.length > 0) {
    const found = await Promise.all(
      needLotIds.map((id) => getLotById(db, id)),
    );
    for (const lot of found) {
      if (lot) lotById.set(lot.id, lot);
    }
  }

  const lossQtyByStep = new Map<string, number>();
  for (const step of lossesInPeriod) {
    lossQtyByStep.set(
      step.stepType,
      (lossQtyByStep.get(step.stepType) ?? 0) + (step.lossQuantity ?? 0),
    );
  }
  const lossByStep = toShareBars(
    DEFAULT_PROCESS_ROUTE.map((def) => ({
      key: def.stepType,
      label: stepTypeLabel(def.stepType),
      value: lossQtyByStep.get(def.stepType) ?? 0,
    })),
    "un.",
  );

  const prodByProduct = new Map<string, { label: string; value: number }>();
  for (const step of packagingInPeriod) {
    const lot = lotById.get(step.lotId);
    const productId = lot?.productId ?? step.lotId;
    const label = lot
      ? (productNames[lot.productId] ?? lot.productId)
      : "Produto não identificado";
    const prev = prodByProduct.get(productId) ?? { label, value: 0 };
    prodByProduct.set(productId, {
      label,
      value: prev.value + (step.outputQuantity ?? 0),
    });
  }
  const productionByProduct = toShareBars(
    [...prodByProduct.entries()]
      .map(([key, row]) => ({ key, label: row.label, value: row.value }))
      .sort((a, b) => b.value - a.value),
    "un.",
  );

  const stepsInPeriod = completedSteps.filter((s) =>
    inPeriod(s.finishedAt ?? s.updatedAt, dateFrom, dateTo),
  );
  const durationAcc = new Map<string, { sum: number; n: number }>();
  for (const step of stepsInPeriod) {
    const mins = stepProcessMinutes(step);
    if (mins == null) continue;
    const prev = durationAcc.get(step.stepType) ?? { sum: 0, n: 0 };
    durationAcc.set(step.stepType, {
      sum: prev.sum + mins,
      n: prev.n + 1,
    });
  }
  const avgMinutesByStep = toDurationBars(
    DEFAULT_PROCESS_ROUTE.map((def) => {
      const acc = durationAcc.get(def.stepType);
      const avg = acc && acc.n > 0 ? acc.sum / acc.n : 0;
      return {
        key: def.stepType,
        label: stepTypeLabel(def.stepType as StepType),
        value: round1(avg),
      };
    }),
  );

  const lotDurations = completedLotsInPeriod
    .map(lotCycleMinutes)
    .filter((m): m is number => m != null);
  const avgLotMinutes =
    lotDurations.length > 0
      ? round1(lotDurations.reduce((a, b) => a + b, 0) / lotDurations.length)
      : null;

  const lotsByOrder = new Map<string, ProductionLot[]>();
  for (const lot of completedLotsInPeriod) {
    const list = lotsByOrder.get(lot.productionOrderId) ?? [];
    list.push(lot);
    lotsByOrder.set(lot.productionOrderId, list);
  }
  const orderDurations: number[] = [];
  for (const group of lotsByOrder.values()) {
    const starts = group
      .map((l) => l.startedAt ?? l.createdAt)
      .filter(Boolean)
      .map((iso) => new Date(iso).getTime());
    const ends = group
      .map((l) => l.completedAt ?? l.updatedAt)
      .filter(Boolean)
      .map((iso) => new Date(iso).getTime());
    if (starts.length === 0 || ends.length === 0) continue;
    const ms = Math.max(...ends) - Math.min(...starts);
    if (Number.isFinite(ms) && ms >= 0) orderDurations.push(ms / 60_000);
  }
  const avgOrderMinutes =
    orderDurations.length > 0
      ? round1(
          orderDurations.reduce((a, b) => a + b, 0) / orderDurations.length,
        )
      : null;

  let morning = 0;
  let afternoon = 0;
  for (const step of packagingInPeriod) {
    const at = step.finishedAt ?? step.updatedAt;
    const qty = step.outputQuantity ?? 0;
    if (localHour(at) < 12) morning += qty;
    else afternoon += qty;
  }
  const productionByShift = toShareBars(
    [
      { key: "morning", label: "Manhã (até 12:00)", value: morning },
      { key: "afternoon", label: "Tarde (após 12:00)", value: afternoon },
    ],
    "un.",
  );

  const dayKeys = eachDayKey(dateFrom, dateTo);
  const prodDayMap = new Map<string, number>();
  const lossDayMap = new Map<string, number>();
  for (const key of dayKeys) {
    prodDayMap.set(key, 0);
    lossDayMap.set(key, 0);
  }
  for (const step of packagingInPeriod) {
    const key = dayKey(step.finishedAt ?? step.updatedAt);
    if (!key || !prodDayMap.has(key)) continue;
    prodDayMap.set(key, (prodDayMap.get(key) ?? 0) + (step.outputQuantity ?? 0));
  }
  for (const step of lossesInPeriod) {
    const key = dayKey(step.finishedAt ?? step.updatedAt);
    if (!key || !lossDayMap.has(key)) continue;
    lossDayMap.set(key, (lossDayMap.get(key) ?? 0) + (step.lossQuantity ?? 0));
  }
  const productionByDay: ChartPoint[] = dayKeys.map((key) => ({
    key,
    label: shortDayLabel(key),
    value: prodDayMap.get(key) ?? 0,
  }));
  const lossByDay: ChartPoint[] = dayKeys.map((key) => ({
    key,
    label: shortDayLabel(key),
    value: lossDayMap.get(key) ?? 0,
  }));

  return {
    dateFrom,
    dateTo,
    plannedUnits,
    realizedUnits,
    adherencePercent,
    onTimePercent,
    timedSteps: timedInPeriod.length,
    yieldPercent,
    lossUnits,
    lossBrl,
    completedLots: completedLotsInPeriod.length,
    packagingSteps: packagingInPeriod.length,
    lossByStep,
    productionByProduct,
    avgMinutesByStep,
    avgLotMinutes,
    lotsWithDuration: lotDurations.length,
    avgOrderMinutes,
    ordersWithDuration: orderDurations.length,
    productionByShift,
    productionByDay,
    lossByDay,
  };
}
