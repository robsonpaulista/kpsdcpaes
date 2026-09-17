import type { Firestore } from "firebase/firestore";
import { buildDashboardDecisions } from "@/domain/cockpit/build-decisions";
import { buildDashboardHighlights } from "@/domain/cockpit/build-highlights";
import { buildDashboardKpis } from "@/domain/cockpit/build-kpis";
import { buildDashboardVerdict } from "@/domain/cockpit/build-verdict";
import {
  CRITICAL_SYNC_HOURS,
  DEFAULT_DAILY_LOSS_TARGET_BRL,
  QUEUE_STOP_DECISION_MINUTES,
  type DashboardEquipmentRow,
  type DashboardFloorRow,
  type DashboardSnapshot,
} from "@/domain/cockpit/dashboard-types";
import { COCKPIT_PLANT } from "@/domain/cockpit/plant-context";
import { hoursLabel } from "@/domain/cockpit/format-dashboard";
import {
  DEFAULT_PROCESS_ROUTE,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { getCockpitMetrics } from "@/services/cockpit-metrics.service";

function buildRouteSteps(
  currentStepType: string | null,
): DashboardFloorRow["routeSteps"] {
  const route = DEFAULT_PROCESS_ROUTE;
  const currentIdx = currentStepType
    ? route.findIndex((s) => s.stepType === currentStepType)
    : -1;

  return route.map((step, idx) => {
    let state: "done" | "current" | "upcoming" = "upcoming";
    if (currentIdx < 0) {
      state = "upcoming";
    } else if (idx < currentIdx) {
      state = "done";
    } else if (idx === currentIdx) {
      state = "current";
    }
    return {
      stepType: step.stepType,
      stepLabel: stepTypeLabel(step.stepType),
      state,
    };
  });
}

/**
 * Loader único do Cockpit Visão Geral — um snapshot para toda a tela.
 */
export async function getDashboardSnapshot(
  db: Firestore,
): Promise<DashboardSnapshot> {
  const raw = await getCockpitMetrics(db);
  const {
    metrics,
    productionLots,
    losses,
    bottlenecks,
    flow,
    equipment,
    quality,
    orders,
    integrationAlert,
    trends,
  } = raw;

  const timed =
    metrics.onTimeCount + metrics.attentionCount + metrics.lateCount;
  const onTimePercent =
    timed > 0
      ? Math.round((metrics.onTimeCount / timed) * 1000) / 10
      : null;

  const lateLots = productionLots.filter((l) => l.timing === "LATE");
  const lateOrderIds = new Set(lateLots.map((l) => l.productionOrderId));
  const pressureBottleneck = bottlenecks.some(
    (b) => b.pressureScore > 20 && b.queueReady > 0,
  );
  const atRiskCount =
    lateOrderIds.size > 0
      ? lateOrderIds.size
      : pressureBottleneck && metrics.waitingReleaseOrders > 0
        ? 1
        : 0;

  const topBottleneck = bottlenecks.find((b) => b.pressureScore > 0);
  const customerHint = orders.find(
    (o) => o.kind === "WAITING_RELEASE" || o.kind === "IN_PROGRESS",
  )?.productName;

  const queueStops = productionLots
    .filter(
      (l) =>
        l.floorStatus === "stopped" ||
        (l.waitingMinutes != null &&
          l.waitingMinutes >= QUEUE_STOP_DECISION_MINUTES),
    )
    .map((l) => ({
      lotId: l.id,
      lotCode: l.lotCode,
      productName: l.productName,
      stepLabel: l.stepLabel,
      waitingMinutes: l.waitingMinutes ?? 0,
      href: l.href,
      customerHint,
    }));

  const decisions = buildDashboardDecisions({
    plannedUnitsToday: metrics.plannedUnitsToday,
    losses: losses
      .filter((l) => l.pendingOccurrence || l.lossQuantity > 0)
      .slice(0, 8),
    quality,
    queueStops,
    lateLots: lateLots.map((l) => ({
      lotId: l.id,
      lotCode: l.lotCode,
      productName: l.productName,
      href: l.href,
    })),
    equipmentAvailable: metrics.equipmentAvailable,
    equipmentStopped: metrics.equipmentStopped,
    equipmentOperating: metrics.equipmentOperating,
    atRiskOrderCount: atRiskCount,
    atRiskOrderHref: "/app/cockpit/production",
    atRiskCustomerHint: customerHint,
  });

  const verdict = buildDashboardVerdict({
    lossUnitsToday: metrics.totalLossUnits,
    lossTargetBrl: DEFAULT_DAILY_LOSS_TARGET_BRL,
    atRiskOrders: atRiskCount,
    lateCount: metrics.lateCount,
    blockedLots: metrics.blockedLots,
    activeLots: metrics.activeLots,
    bottleneckStepLabel: topBottleneck?.stepLabel,
    queueStopCount: queueStops.length,
  });

  const kpis = buildDashboardKpis({
    onTimePercent,
    lossUnitsToday: metrics.totalLossUnits,
    adherencePercent: metrics.adherencePercent,
    plannedUnitsToday: metrics.plannedUnitsToday,
    realizedUnitsToday: metrics.realizedUnitsToday,
    completedLotsToday: metrics.completedLotsToday,
    trends,
  });

  const hoursStale = integrationAlert?.hoursSinceAttempt ?? null;
  const criticalBanner = integrationAlert?.isCritical
    ? {
        title: integrationAlert.title,
        message: integrationAlert.message,
        href: integrationAlert.href,
        ctaLabel: "Verificar integração",
        hoursStale: hoursStale ?? CRITICAL_SYNC_HOURS,
      }
    : null;

  let gestorLabel = "sistema gestor (ok)";
  if (integrationAlert?.isCritical && hoursStale != null) {
    gestorLabel = `sistema gestor (desatualizado — ${hoursLabel(hoursStale)})`;
  } else if (integrationAlert) {
    gestorLabel = `sistema gestor (${integrationAlert.statusLabel.toLowerCase()})`;
  }

  const flowStages = flow.map((step) => {
    const bn = bottlenecks.find((b) => b.stepType === step.stepType);
    const wait = bn?.avgWaitingMinutes ?? null;
    const isBottleneck =
      step.count > 0 &&
      ((wait != null && wait >= QUEUE_STOP_DECISION_MINUTES) ||
        step.lateCount > 0 ||
        ((bn?.queueReady ?? 0) > 0 && (bn?.pressureScore ?? 0) > 15));
    return {
      stepType: step.stepType,
      stepLabel: step.stepLabel,
      count: step.count,
      lateCount: step.lateCount,
      attentionCount: step.attentionCount,
      isBottleneck,
      avgWaitingMinutes: wait,
      avgProcessMinutes: bn?.avgProcessMinutes ?? null,
      standardMinutes: bn?.standardMinutes ?? null,
      queueReady: bn?.queueReady ?? 0,
      queueRunning: bn?.queueRunning ?? 0,
    };
  });

  const bottleneckStepType =
    topBottleneck && topBottleneck.pressureScore > 0
      ? topBottleneck.stepType
      : null;

  const isLotInBottleneck = (lot: (typeof productionLots)[number]) =>
    Boolean(
      bottleneckStepType &&
        lot.stepType === bottleneckStepType &&
        (lot.floorStatus === "stopped" ||
          lot.floorStatus === "waiting" ||
          lot.floorStatus === "blocked" ||
          lot.timing === "LATE"),
    );

  // Prioriza gargalo → críticos / parados / atrasados / em andamento
  const rankedLots = [...productionLots].sort((a, b) => {
    const score = (lot: (typeof productionLots)[number]) => {
      let s = 0;
      if (isLotInBottleneck(lot)) s += 80;
      if (lot.floorStatus === "blocked" || lot.floorStatus === "stopped") s += 40;
      if (lot.timing === "LATE") s += 30;
      if (lot.timing === "ATTENTION") s += 15;
      if (lot.floorStatus === "running") s += 10;
      s += Math.min(lot.waitingMinutes ?? 0, 120);
      return s;
    };
    return score(b) - score(a);
  });

  const floorItems: DashboardFloorRow[] = rankedLots.slice(0, 4).map((lot) => ({
    id: lot.id,
    productName: lot.productName,
    lotCode: lot.lotCode,
    stepType: lot.stepType,
    stepLabel: lot.stepLabel,
    status:
      lot.floorStatus === "blocked" || lot.floorStatus === "stopped"
        ? ("stopped" as const)
        : lot.floorStatus === "running"
          ? ("running" as const)
          : ("waiting" as const),
    statusLabel:
      lot.floorStatus === "blocked" ? "bloqueado" : lot.floorStatusLabel,
    href: lot.href,
    waitingMinutes: lot.waitingMinutes,
    timing:
      lot.timing === "ON_TIME" ||
      lot.timing === "ATTENTION" ||
      lot.timing === "LATE"
        ? lot.timing
        : null,
    routeSteps: buildRouteSteps(lot.stepType),
    imageUrl: lot.imageUrl,
    isBottleneck: isLotInBottleneck(lot),
    plannedQuantity: lot.plannedQuantity,
  }));

  const bottleneckLot = productionLots.find((l) => isLotInBottleneck(l));

  const bottleneck =
    bottleneckStepType && topBottleneck
      ? {
          stepType: topBottleneck.stepType,
          stepLabel: topBottleneck.stepLabel,
          lotCode: bottleneckLot?.lotCode ?? null,
          productName: bottleneckLot?.productName ?? null,
          waitingMinutes:
            bottleneckLot?.waitingMinutes ?? topBottleneck.avgWaitingMinutes,
          href: bottleneckLot?.href ?? null,
          pressureScore: topBottleneck.pressureScore,
        }
      : null;

  const highlights = buildDashboardHighlights({
    atRiskOrders: atRiskCount,
    completedLotsToday: metrics.completedLotsToday,
    onTimeCount: metrics.onTimeCount,
    lateCount: metrics.lateCount,
    equipmentAvailable: metrics.equipmentAvailable,
    equipmentOperating: metrics.equipmentOperating,
    equipmentStopped: metrics.equipmentStopped,
    decisionsOpen: decisions.length,
  });

  const equipmentItems: DashboardEquipmentRow[] = equipment.map((eq) => ({
    id: eq.id,
    code: eq.code,
    name: eq.name,
    type: eq.type,
    typeLabel: eq.typeLabel,
    status: eq.displayStatus,
    href: `/app/equipment/${encodeURIComponent(eq.id)}`,
    lotCode: eq.lotCode ?? null,
    lotHref: eq.lotHref ?? null,
    remainingLabel: eq.remainingLabel ?? null,
    stoppedLabel: eq.stoppedLabel ?? null,
    stopReason: eq.stopReason ?? null,
    timing:
      eq.timing === "ON_TIME" ||
      eq.timing === "ATTENTION" ||
      eq.timing === "LATE"
        ? eq.timing
        : null,
  }));

  return {
    plantName: COCKPIT_PLANT.plantName,
    unitLabel: COCKPIT_PLANT.unitLabel,
    shiftLabel: COCKPIT_PLANT.shiftLabel,
    periodLabel: metrics.periodLabel,
    updatedAt: new Date().toISOString(),
    refreshMinutes: 5,
    sync: {
      floorRealtime: true,
      gestorLabel,
      hoursStale,
      criticalBanner,
    },
    verdict,
    kpis,
    decisions,
    floorItems,
    equipmentItems,
    flowStages,
    bottleneck,
    highlights,
    counts: {
      activeLots: metrics.activeLots,
      equipmentAvailable: metrics.equipmentAvailable,
      equipmentOperating: metrics.equipmentOperating,
      equipmentStopped: metrics.equipmentStopped,
      completedLotsToday: metrics.completedLotsToday,
      decisionsOpen: decisions.length,
    },
  };
}
