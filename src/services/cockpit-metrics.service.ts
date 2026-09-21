import type { Firestore } from "firebase/firestore";
import {
  DEFAULT_PROCESS_ROUTE,
  getStepDefinition,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { executionStatusLabel, timingStatusLabel } from "@/lib/labels/production-status";
import { listCompletedStepRuns, listOpenStepRuns, listStepRunsWithLoss } from "@/repositories/execution.repository";
import {
  getStation,
  getStationForStep,
} from "@/domain/production/stations";
import { listEquipment } from "@/repositories/equipment.repository";
import { getIntegrationState } from "@/repositories/integration.repository";
import { getLotById, listActiveLots, listBlockedLots, listCompletedLots } from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import { listQualityIncidents } from "@/repositories/quality.repository";
import { MOCK_SOURCE_SYSTEM } from "@/integrations/production-orders/fixtures/mock-orders";
import { getProductionOrderSourceKind } from "@/integrations/production-orders/production-order-source";
import { equipmentTypeLabel } from "@/lib/labels/equipment";
import { formatDurationClock, remainingMs } from "@/lib/labels/timing";
import { listQualityLossSignals } from "@/services/quality.service";
import { computeTimingStatus } from "@/services/workflow.service";
import type { EquipmentStatus, EquipmentType } from "@/types/equipment";
import type { LotStepRun, ProductionLot, StepType, TimingStatus } from "@/types/production";

/** Sync sem tentativa recente = aviso (minutos). */
const INTEGRATION_STALE_MINUTES = 60;
/** Sync acima deste limiar = falha crítica de integração (horas). */
export const INTEGRATION_CRITICAL_HOURS = 24;
export type AttentionKind =
  | "LATE"
  | "ATTENTION"
  | "QUALITY_LOSS"
  | "PENDING_MAPPING"
  | "BLOCKED";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  subtitle: string;
  href: string;
  actionLabel: string;
  priority: number;
}

export type FloorLotStatus = "waiting" | "running" | "stopped" | "blocked";

export interface ProductionLotSummary {
  id: string;
  lotCode: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  stepType: StepType | null;
  stepLabel: string;
  stepStatusLabel: string;
  timing: TimingStatus | null;
  timingLabel: string;
  href: string;
  /** Status real para o card "Em produção agora". */
  floorStatus: FloorLotStatus;
  floorStatusLabel: string;
  /** Minutos parado na fila (READY) ou null. */
  waitingMinutes: number | null;
  productionOrderId: string;
  /** Qtde planejada do lote (unidades em produção). */
  plannedQuantity: number | null;
}

export interface CompletedLotSummary {
  id: string;
  lotCode: string;
  productName: string;
  orderNumber: string;
  orderHref: string;
  lotHref: string;
  completedAt: string;
}

export interface LossDetailSummary {
  id: string;
  lotId: string;
  lotCode: string;
  productName: string;
  stepLabel: string;
  stationLabel: string;
  lossQuantity: number;
  lossReason?: string;
  finishedAt: string;
  pendingOccurrence: boolean;
  href: string;
  qualityHref: string;
}

/** Visão de gargalo por etapa — baseada em espera/processo apontados. */
export interface BottleneckInsight {
  stepType: StepType;
  stepLabel: string;
  stationLabel: string;
  queueReady: number;
  queueRunning: number;
  lateNow: number;
  completedSamples: number;
  avgWaitingMinutes: number | null;
  avgProcessMinutes: number | null;
  standardMinutes: number;
  /** Maior = mais crítico (fila + atraso + espera). */
  pressureScore: number;
}

/** Contagem de lotes ativos por etapa — fluxo ao vivo (Doc 09). */
export interface FlowStepSummary {
  stepType: StepType;
  stepLabel: string;
  count: number;
  lateCount: number;
  attentionCount: number;
}

/** Visão operacional de equipamento — só o que dá para derivar agora. */
export interface EquipmentInsight {
  id: string;
  code: string;
  name: string;
  type: EquipmentType;
  typeLabel: string;
  /** Status efetivo: etapa em andamento sobrescreve AVAILABLE. */
  displayStatus: EquipmentStatus;
  lotCode?: string;
  lotHref?: string;
  remainingLabel?: string;
  /** Tempo desde stoppedAt (ex.: "14 min"). */
  stoppedLabel?: string;
  stopReason?: string;
  timing?: TimingStatus | null;
}

/** Ocorrências abertas para o bloco Qualidade (Doc 09). */
export interface QualityInsight {
  id: string;
  lotCode: string;
  productName: string;
  description: string;
  blocksLot: boolean;
  createdAt: string;
  href: string;
}

/** Pendência de OP para o bloco Ordens (Doc 09 §30). */
export type OrderAttentionKind =
  | "PENDING_MAPPING"
  | "WAITING_RELEASE"
  | "OUTDATED"
  | "IN_PROGRESS";

export interface OrderInsight {
  id: string;
  orderNumber: string;
  productName: string;
  kind: OrderAttentionKind;
  kindLabel: string;
  href: string;
}

/** Alerta de sync — só quando relevante (Doc 09 §31). */
export interface IntegrationAlert {
  severity: "ERROR" | "WARNING";
  title: string;
  message: string;
  href: string;
  statusLabel: string;
  minutesSinceAttempt: number | null;
  hoursSinceAttempt: number | null;
  /** true quando falha real ou sync > limiar crítico — banner vermelho. */
  isCritical: boolean;
}

/** Séries diárias dos últimos 7 dias (índice 0 = mais antigo). */
export interface CockpitTrendSeries {
  efficiencyPercent: number[];
  lossBrl: number[];
  adherencePercent: number[];
  atRiskOrders: number[];
  dates: string[];
}

export interface CockpitMetrics {
  activeLots: number;
  runningLots: number;
  readyLots: number;
  blockedLots: number;
  lateCount: number;
  attentionCount: number;
  onTimeCount: number;
  totalLossUnits: number;
  pendingLossSignals: number;
  pendingMappingOrders: number;
  waitingReleaseOrders: number;
  completedOrdersToday: number;
  completedLotsToday: number;
  /** OPs com productionDate = hoje (não canceladas). */
  ordersReceivedToday: number;
  /** RELEASED + IN_PROGRESS. */
  ordersInProduction: number;
  /** Integração OUTDATED. */
  ordersOutdated: number;
  /** Período explícito — V1 = dia civil local (sem turno definido). */
  periodLabel: string;
  plannedUnitsToday: number;
  /** Saída apontada em embalagem concluída hoje. */
  realizedUnitsToday: number;
  /** null se não há planejado. */
  adherencePercent: number | null;
  equipmentOperating: number;
  equipmentAvailable: number;
  equipmentStopped: number;
  openQualityIncidents: number;
  qualityIncidentsToday: number;
  /** Texto operacional — sem fórmula inventada de "pulso". */
  situationLabel: string;
  situationHint: string;
}

function pickActiveStep(
  lotId: string,
  steps: LotStepRun[],
): LotStepRun | undefined {
  const forLot = steps.filter((s) => s.lotId === lotId);
  return (
    forLot.find((s) => s.status === "IN_PROGRESS") ??
    forLot.find((s) => s.status === "READY")
  );
}

function timingForLot(
  lot: ProductionLot,
  steps: LotStepRun[],
): TimingStatus | null {
  const step = pickActiveStep(lot.id, steps);
  if (
    !step ||
    step.status !== "IN_PROGRESS" ||
    !step.startedAt ||
    !step.expectedFinishAt
  ) {
    return null;
  }
  const def = lot.currentStep
    ? getStepDefinition(lot.currentStep)
    : undefined;
  return computeTimingStatus(
    step.startedAt,
    step.expectedFinishAt,
    step.toleranceMinutes ?? def?.lateToleranceMinutes ?? 0,
  );
}

function timingPriority(timing: TimingStatus | null, status?: string): number {
  if (status === "BLOCKED") return 100;
  if (timing === "LATE") return 90;
  if (timing === "ATTENTION") return 70;
  if (status === "IN_PROGRESS") return 40;
  if (status === "READY") return 20;
  return 10;
}

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getCockpitMetrics(db: Firestore): Promise<{
  metrics: CockpitMetrics;
  attention: AttentionItem[];
  productionLots: ProductionLotSummary[];
  completedToday: CompletedLotSummary[];
  losses: LossDetailSummary[];
  bottlenecks: BottleneckInsight[];
  flow: FlowStepSummary[];
  equipment: EquipmentInsight[];
  quality: QualityInsight[];
  orders: OrderInsight[];
  integrationAlert: IntegrationAlert | null;
  trends: CockpitTrendSeries;
}> {
  const sourceKind = getProductionOrderSourceKind();
  const sourceSystem =
    sourceKind === "mock" ? MOCK_SOURCE_SYSTEM : "ERP_DC_PAES";

  const [
    activeLots,
    blockedLotsList,
    openSteps,
    lossSteps,
    completedSteps,
    lossSignals,
    orders,
    products,
    completedLots,
    equipmentList,
    incidents,
    integrationState,
  ] = await Promise.all([
    listActiveLots(db),
    listBlockedLots(db),
    listOpenStepRuns(db),
    listStepRunsWithLoss(db),
    listCompletedStepRuns(db),
    listQualityLossSignals(db),
    listProductionOrders(db),
    listProducts(db),
    listCompletedLots(db, 40),
    listEquipment(db),
    listQualityIncidents(db),
    getIntegrationState(db, sourceSystem),
  ]);

  const floorLots = [...activeLots, ...blockedLotsList];

  const productNames: Record<string, string> = {};
  const productImages: Record<string, string | null> = {};
  for (const p of products) {
    productNames[p.id] = p.name;
    productImages[p.id] = p.imageUrl ?? null;
  }

  const orderById = new Map(orders.map((o) => [o.id, o]));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();
  const todayDate = localDateString(startOfToday);
  const periodLabel = "HOJE";

  const plannedUnitsToday = orders
    .filter(
      (o) =>
        o.productionDate === todayDate &&
        o.productionStatus !== "CANCELLED",
    )
    .reduce((sum, o) => sum + (o.plannedQuantity ?? 0), 0);

  const realizedUnitsToday = completedSteps
    .filter(
      (s) =>
        s.stepType === "PACKAGING" &&
        (s.finishedAt ?? s.updatedAt) >= todayIso &&
        s.outputQuantity != null,
    )
    .reduce((sum, s) => sum + (s.outputQuantity ?? 0), 0);

  const adherencePercent =
    plannedUnitsToday > 0
      ? Math.round((realizedUnitsToday / plannedUnitsToday) * 1000) / 10
      : null;

  const completedTodayLots = completedLots.filter(
    (l) => (l.completedAt ?? l.updatedAt) >= todayIso,
  );

  const completedToday: CompletedLotSummary[] = completedTodayLots
    .slice(0, 12)
    .map((lot) => {
      const order = orderById.get(lot.productionOrderId);
      return {
        id: lot.id,
        lotCode: lot.lotCode,
        productName: productNames[lot.productId] ?? lot.productId,
        orderNumber: order?.externalOrderNumber ?? lot.productionOrderId,
        orderHref: `/app/pcp/orders/${encodeURIComponent(lot.productionOrderId)}`,
        lotHref: `/app/cockpit/production/lots/${lot.id}`,
        completedAt: lot.completedAt ?? lot.updatedAt,
      };
    });

  const completedOrdersToday = orders.filter(
    (o) =>
      o.productionStatus === "COMPLETED" && o.updatedAt >= todayIso,
  ).length;

  let lateCount = 0;
  let attentionCount = 0;
  let onTimeCount = 0;
  const attention: AttentionItem[] = [];
  const productionLots: ProductionLotSummary[] = [];

  for (const lot of floorLots) {
    const timing = timingForLot(lot, openSteps);
    const productName = productNames[lot.productId] ?? lot.productId;
    const activeStep = pickActiveStep(lot.id, openSteps);
    const waitingMinutes =
      activeStep?.status === "READY" && activeStep.readyAt
        ? Math.max(
            0,
            Math.round(
              (Date.now() - new Date(activeStep.readyAt).getTime()) / 60_000,
            ),
          )
        : null;

    let floorStatus: FloorLotStatus = "waiting";
    let floorStatusLabel = "aguardando início";
    if (lot.status === "BLOCKED") {
      floorStatus = "blocked";
      floorStatusLabel = "bloqueado";
    } else if (lot.currentStepStatus === "IN_PROGRESS") {
      floorStatus = "running";
      floorStatusLabel = "em andamento";
    } else if (
      lot.currentStepStatus === "READY" &&
      waitingMinutes != null &&
      waitingMinutes >= 3
    ) {
      floorStatus = "stopped";
      floorStatusLabel = `parado há ${waitingMinutes} min`;
    } else if (lot.currentStepStatus === "READY") {
      floorStatus = "waiting";
      floorStatusLabel = "aguardando início";
    }

    productionLots.push({
      id: lot.id,
      lotCode: lot.lotCode,
      productId: lot.productId,
      productName,
      imageUrl: productImages[lot.productId] ?? null,
      stepType: lot.currentStep ?? null,
      stepLabel: lot.currentStep ? stepTypeLabel(lot.currentStep) : "sem etapa",
      stepStatusLabel: executionStatusLabel(lot.currentStepStatus, lot.status),
      timing,
      timingLabel: timing
        ? timingStatusLabel(timing)
        : lot.status === "BLOCKED"
          ? "BLOQUEADO"
          : lot.currentStepStatus === "READY"
            ? "AGUARDANDO INÍCIO"
            : lot.currentStepStatus === "IN_PROGRESS"
              ? "EM ANDAMENTO"
              : "aguardando início",
      href: `/app/cockpit/production/lots/${lot.id}`,
      floorStatus,
      floorStatusLabel,
      waitingMinutes,
      productionOrderId: lot.productionOrderId,
      plannedQuantity: lot.plannedQuantity ?? null,
    });

    if (lot.status === "BLOCKED") {
      attention.push({
        id: `blocked-${lot.id}`,
        kind: "BLOCKED",
        title: lot.lotCode,
        subtitle: `${productName} · bloqueado`,
        href: "/app/quality/incidents",
        actionLabel: "Qualidade →",
        priority: 5,
      });
      continue;
    }

    if (timing === "LATE") {
      lateCount += 1;
      attention.push({
        id: `late-${lot.id}`,
        kind: "LATE",
        title: lot.lotCode,
        subtitle: `${productName} · atrasado`,
        href: `/app/cockpit/production/lots/${lot.id}`,
        actionLabel: "Ver lote →",
        priority: 10,
      });
    } else if (timing === "ATTENTION") {
      attentionCount += 1;
      attention.push({
        id: `att-${lot.id}`,
        kind: "ATTENTION",
        title: lot.lotCode,
        subtitle: `${productName} · atenção no tempo`,
        href: `/app/cockpit/production/lots/${lot.id}`,
        actionLabel: "Ver lote →",
        priority: 8,
      });
    } else if (timing === "ON_TIME") {
      onTimeCount += 1;
    }
  }

  productionLots.sort((a, b) => {
    const lotA = activeLots.find((l) => l.id === a.id);
    const lotB = activeLots.find((l) => l.id === b.id);
    return (
      timingPriority(b.timing, lotB?.status ?? lotB?.currentStepStatus) -
      timingPriority(a.timing, lotA?.status ?? lotA?.currentStepStatus)
    );
  });

  const pendingLoss = lossSignals.filter((s) => !s.hasIncident);
  const pendingByStepRun = new Set(pendingLoss.map((s) => s.stepRunId));

  for (const signal of pendingLoss) {
    const station =
      getStationForStep(signal.stepType as StepType)?.label ??
      stepTypeLabel(signal.stepType as StepType);
    attention.push({
      id: `loss-${signal.stepRunId}`,
      kind: "QUALITY_LOSS",
      title: signal.lotCode,
      subtitle: `Perda ${signal.lossQuantity.toLocaleString("pt-BR")} un. · ${station}${
        signal.lossReason ? ` · ${signal.lossReason}` : ""
      }`,
      href: "/app/quality/losses",
      actionLabel: "Qualidade →",
      priority: 9,
    });
  }

  const lossLotIds = [...new Set(lossSteps.map((s) => s.lotId))];
  const lossLots = await Promise.all(lossLotIds.map((id) => getLotById(db, id)));
  const lossLotById = new Map(
    lossLots.filter(Boolean).map((lot) => [lot!.id, lot!] as const),
  );

  const losses: LossDetailSummary[] = lossSteps.map((step) => {
    const lot = lossLotById.get(step.lotId);
    const stationFromId = step.stationId
      ? getStation(step.stationId)?.label
      : undefined;
    const stationFromStep = getStationForStep(step.stepType)?.label;
    const stationLabel =
      stationFromId ?? stationFromStep ?? stepTypeLabel(step.stepType);
    return {
      id: step.id,
      lotId: step.lotId,
      lotCode: lot?.lotCode ?? step.lotId,
      productName: lot
        ? (productNames[lot.productId] ?? lot.productId)
        : "—",
      stepLabel: stepTypeLabel(step.stepType),
      stationLabel,
      lossQuantity: step.lossQuantity ?? 0,
      lossReason: step.lossReason,
      finishedAt: step.finishedAt ?? step.updatedAt,
      pendingOccurrence: pendingByStepRun.has(step.id),
      href: `/app/cockpit/production/lots/${step.lotId}`,
      qualityHref: "/app/quality/losses",
    };
  });

  const pendingMapping = orders.filter(
    (o) => o.integrationStatus === "PENDING_VALIDATION",
  );
  for (const order of pendingMapping) {
    attention.push({
      id: `map-${order.id}`,
      kind: "PENDING_MAPPING",
      title: order.externalOrderNumber,
      subtitle: "Produto não mapeado",
      href: `/app/pcp/orders/${encodeURIComponent(order.id)}`,
      actionLabel: "Mapear →",
      priority: 7,
    });
  }

  attention.sort((a, b) => b.priority - a.priority);

  const totalLossUnits = lossSteps
    .filter(
      (s) =>
        localDateFromIso(s.finishedAt ?? s.updatedAt) === todayDate,
    )
    .reduce((sum, s) => sum + (s.lossQuantity ?? 0), 0);

  const runningLots = activeLots.filter(
    (l) => l.currentStepStatus === "IN_PROGRESS",
  ).length;
  const readyLots = activeLots.filter(
    (l) => l.currentStepStatus === "READY",
  ).length;
  const blockedLots = blockedLotsList.length;

  const waitingReleaseOrders = orders.filter(
    (o) =>
      o.integrationStatus === "SYNCED" &&
      o.productionStatus === "WAITING",
  ).length;

  const ordersReceivedToday = orders.filter(
    (o) =>
      o.productionDate === todayDate && o.productionStatus !== "CANCELLED",
  ).length;
  const ordersInProduction = orders.filter(
    (o) =>
      o.productionStatus === "RELEASED" ||
      o.productionStatus === "IN_PROGRESS",
  ).length;
  const ordersOutdated = orders.filter(
    (o) => o.integrationStatus === "OUTDATED",
  ).length;

  let situationLabel = "LINHA PARADA";
  let situationHint = "Nenhum lote ativo — liberar OPs no PCP para começar.";
  if (lateCount > 0 || pendingLoss.length > 0 || blockedLots > 0) {
    const bits: string[] = [];
    if (lateCount > 0) bits.push(`${lateCount} atraso(s)`);
    if (blockedLots > 0) bits.push(`${blockedLots} bloqueio(s)`);
    if (pendingLoss.length > 0) bits.push(`${pendingLoss.length} perda(s) na fila`);
    situationLabel = "REQUER AÇÃO";
    situationHint = bits.join(" · ");
  } else if (attentionCount > 0) {
    situationLabel = "NO LIMITE";
    situationHint = `${attentionCount} lote(s) perto do tempo padrão da etapa.`;
  } else if (activeLots.length > 0) {
    situationLabel = "OPERAÇÃO ESTÁVEL";
    situationHint = `${activeLots.length} lote(s) em produção sem alerta crítico.`;
  }

  const metrics: CockpitMetrics = {
    activeLots: activeLots.length,
    runningLots,
    readyLots,
    blockedLots,
    lateCount,
    attentionCount,
    onTimeCount,
    totalLossUnits,
    pendingLossSignals: pendingLoss.length,
    pendingMappingOrders: pendingMapping.length,
    waitingReleaseOrders,
    completedOrdersToday,
    completedLotsToday: completedTodayLots.length,
    ordersReceivedToday,
    ordersInProduction,
    ordersOutdated,
    periodLabel,
    plannedUnitsToday,
    realizedUnitsToday,
    adherencePercent,
    equipmentOperating: 0,
    equipmentAvailable: 0,
    equipmentStopped: 0,
    openQualityIncidents: 0,
    qualityIncidentsToday: 0,
    situationLabel,
    situationHint,
  };

  const flow: FlowStepSummary[] = DEFAULT_PROCESS_ROUTE.map((route) => {
    const lotsHere = activeLots.filter((l) => l.currentStep === route.stepType);
    let late = 0;
    let attention = 0;
    for (const lot of lotsHere) {
      const timing = timingForLot(lot, openSteps);
      if (timing === "LATE") late += 1;
      else if (timing === "ATTENTION") attention += 1;
    }
    return {
      stepType: route.stepType,
      stepLabel: stepTypeLabel(route.stepType),
      count: lotsHere.length,
      lateCount: late,
      attentionCount: attention,
    };
  });

  const bottlenecks: BottleneckInsight[] = DEFAULT_PROCESS_ROUTE.map((route) => {
    const completed = completedSteps.filter((s) => s.stepType === route.stepType);
    const waits = completed
      .map((s) => s.waitingDurationMinutes)
      .filter((m): m is number => m != null);
    const processes = completed
      .map((s) => s.processDurationMinutes)
      .filter((m): m is number => m != null);
    const avgWaitingMinutes =
      waits.length > 0
        ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
        : null;
    const avgProcessMinutes =
      processes.length > 0
        ? Math.round(processes.reduce((a, b) => a + b, 0) / processes.length)
        : null;

    const queueReady = activeLots.filter(
      (l) =>
        l.currentStep === route.stepType && l.currentStepStatus === "READY",
    ).length;
    const queueRunning = activeLots.filter(
      (l) =>
        l.currentStep === route.stepType &&
        l.currentStepStatus === "IN_PROGRESS",
    ).length;

    let lateNow = 0;
    for (const lot of activeLots) {
      if (lot.currentStep !== route.stepType) continue;
      if (timingForLot(lot, openSteps) === "LATE") lateNow += 1;
    }

    const pressureScore =
      lateNow * 40 +
      queueReady * 8 +
      queueRunning * 3 +
      (avgWaitingMinutes ?? 0);

    return {
      stepType: route.stepType,
      stepLabel: stepTypeLabel(route.stepType),
      stationLabel:
        getStationForStep(route.stepType)?.label ?? stepTypeLabel(route.stepType),
      queueReady,
      queueRunning,
      lateNow,
      completedSamples: completed.length,
      avgWaitingMinutes,
      avgProcessMinutes,
      standardMinutes: route.standardDurationMinutes,
      pressureScore,
    };
  }).sort((a, b) => b.pressureScore - a.pressureScore);

  const lotById = new Map(activeLots.map((l) => [l.id, l]));
  const equipmentInsights: EquipmentInsight[] = equipmentList
    .filter((eq) => eq.active)
    .map((eq) => {
      const running = openSteps.find(
        (s) => s.status === "IN_PROGRESS" && s.equipmentId === eq.id,
      );
      if (running) {
        const lot = lotById.get(running.lotId);
        const timing =
          running.startedAt && running.expectedFinishAt
            ? computeTimingStatus(
                running.startedAt,
                running.expectedFinishAt,
                running.toleranceMinutes ??
                  getStepDefinition(running.stepType)?.lateToleranceMinutes ??
                  0,
              )
            : null;
        const rem =
          running.expectedFinishAt != null
            ? remainingMs(running.expectedFinishAt)
            : null;
        return {
          id: eq.id,
          code: eq.code,
          name: eq.name,
          type: eq.type,
          typeLabel: equipmentTypeLabel(eq.type),
          displayStatus: "OPERATING" as const,
          lotCode: lot?.lotCode,
          lotHref: lot
            ? `/app/cockpit/production/lots/${lot.id}`
            : undefined,
          remainingLabel:
            rem != null ? formatDurationClock(Math.max(0, rem)) : undefined,
          timing,
        };
      }

      return {
        id: eq.id,
        code: eq.code,
        name: eq.name,
        type: eq.type,
        typeLabel: equipmentTypeLabel(eq.type),
        displayStatus: eq.status,
        stoppedLabel:
          eq.status === "STOPPED" && eq.stoppedAt
            ? formatStoppedDuration(eq.stoppedAt)
            : undefined,
        stopReason: eq.stopReason,
      };
    })
    .sort((a, b) => {
      const lineRank = (t: EquipmentType): number => {
        if (t === "MIXER") return 0;
        if (t === "MODELER") return 1;
        if (t === "PROOFING_CHAMBER") return 2;
        if (t === "OVEN") return 3;
        if (t === "PACKAGING_LINE") return 4;
        return 9;
      };
      return lineRank(a.type) - lineRank(b.type) || a.code.localeCompare(b.code);
    });

  const equipmentOperating = equipmentInsights.filter(
    (e) => e.displayStatus === "OPERATING",
  ).length;
  const equipmentStopped = equipmentInsights.filter((e) =>
    ["STOPPED", "MAINTENANCE", "UNAVAILABLE"].includes(e.displayStatus),
  ).length;
  const equipmentAvailable = equipmentInsights.filter(
    (e) =>
      e.displayStatus === "AVAILABLE" || e.displayStatus === "WAITING",
  ).length;

  metrics.equipmentOperating = equipmentOperating;
  metrics.equipmentAvailable = equipmentAvailable;
  metrics.equipmentStopped = equipmentStopped;

  const openIncidents = incidents.filter((i) => i.status === "OPEN");
  const qualityIncidentsToday = incidents.filter(
    (i) => i.createdAt >= todayIso,
  ).length;
  metrics.openQualityIncidents = openIncidents.length;
  metrics.qualityIncidentsToday = qualityIncidentsToday;

  const quality: QualityInsight[] = openIncidents.slice(0, 8).map((i) => ({
    id: i.id,
    lotCode: i.lotCode,
    productName: productNames[i.productId] ?? i.productId,
    description: i.description,
    blocksLot: i.blocksLot,
    createdAt: i.createdAt,
    href: "/app/quality/incidents",
  }));

  const orderProductName = (orderId: string, productId?: string): string => {
    if (productId && productNames[productId]) return productNames[productId];
    const order = orderById.get(orderId);
    const snap = order?.externalSnapshot as
      | { externalProductName?: string }
      | undefined;
    return snap?.externalProductName ?? productId ?? "Produto";
  };

  const orderInsights: OrderInsight[] = [];
  for (const order of pendingMapping) {
    orderInsights.push({
      id: order.id,
      orderNumber: order.externalOrderNumber,
      productName: orderProductName(order.id, order.productId),
      kind: "PENDING_MAPPING",
      kindLabel: "MAPEAR PRODUTO",
      href: `/app/pcp/orders/${encodeURIComponent(order.id)}`,
    });
  }
  for (const order of orders.filter((o) => o.integrationStatus === "OUTDATED")) {
    orderInsights.push({
      id: `outdated-${order.id}`,
      orderNumber: order.externalOrderNumber,
      productName: orderProductName(order.id, order.productId),
      kind: "OUTDATED",
      kindLabel: "ALTERAÇÃO NA ORIGEM",
      href: `/app/pcp/orders/${encodeURIComponent(order.id)}`,
    });
  }
  for (const order of orders.filter(
    (o) =>
      o.integrationStatus === "SYNCED" &&
      o.productionStatus === "WAITING",
  )) {
    orderInsights.push({
      id: `wait-${order.id}`,
      orderNumber: order.externalOrderNumber,
      productName: orderProductName(order.id, order.productId),
      kind: "WAITING_RELEASE",
      kindLabel: "AGUARDANDO LIBERAÇÃO",
      href: `/app/pcp/orders/${encodeURIComponent(order.id)}`,
    });
  }
  for (const order of orders
    .filter((o) => o.productionStatus === "IN_PROGRESS")
    .slice(0, 5)) {
    orderInsights.push({
      id: `prog-${order.id}`,
      orderNumber: order.externalOrderNumber,
      productName: orderProductName(order.id, order.productId),
      kind: "IN_PROGRESS",
      kindLabel: "EM PRODUÇÃO",
      href: `/app/pcp/orders/${encodeURIComponent(order.id)}`,
    });
  }

  return {
    metrics,
    attention,
    productionLots,
    completedToday,
    losses,
    bottlenecks,
    flow,
    equipment: equipmentInsights,
    quality,
    orders: orderInsights.slice(0, 10),
    integrationAlert: buildIntegrationAlert(integrationState),
    trends: buildTrendSeries({
      completedSteps,
      lossSteps,
      orders,
      todayDate,
    }),
  };
}

function formatStoppedDuration(stoppedAt: string): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(stoppedAt).getTime()) / 60_000),
  );
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function buildIntegrationAlert(
  state: Awaited<ReturnType<typeof getIntegrationState>>,
): IntegrationAlert | null {
  if (!state?.lastAttemptAt) return null;

  const attemptMs = new Date(state.lastAttemptAt).getTime();
  const minutesSinceAttempt = Math.max(
    0,
    Math.round((Date.now() - attemptMs) / 60_000),
  );
  const hoursSinceAttempt =
    Math.round((minutesSinceAttempt / 60) * 10) / 10;
  const stale = minutesSinceAttempt >= INTEGRATION_STALE_MINUTES;
  const failed = state.status === "ERROR";
  const partial = state.status === "PARTIAL";
  const criticalStale = hoursSinceAttempt >= INTEGRATION_CRITICAL_HOURS;

  if (!failed && !partial && !stale) return null;

  const ago =
    minutesSinceAttempt < 60
      ? `${minutesSinceAttempt} min`
      : hoursSinceAttempt >= 24
        ? `${Math.round(hoursSinceAttempt)}h (${Math.floor(hoursSinceAttempt / 24)} dia${Math.floor(hoursSinceAttempt / 24) === 1 ? "" : "s"})`
        : `${Math.round(hoursSinceAttempt)} h`;

  if (failed || criticalStale) {
    return {
      severity: "ERROR",
      title: `Sistema gestor sem sincronizar há ${ago}`,
      message:
        "Estoque, pedidos e custos exibidos aqui podem estar desatualizados. Isso não é um aviso de rotina — é uma falha de integração.",
      href: "/app/settings/integrations/dev",
      statusLabel: failed ? "ERRO" : "CRÍTICO",
      minutesSinceAttempt,
      hoursSinceAttempt,
      isCritical: true,
    };
  }

  if (partial) {
    return {
      severity: "WARNING",
      title: "ATENÇÃO · SISTEMA GESTOR",
      message: `Última sincronização há ${ago} · ${state.lastErrorCount ?? 0} falha(s) parcial(is)`,
      href: "/app/settings/integrations/dev",
      statusLabel: "PARCIAL",
      minutesSinceAttempt,
      hoursSinceAttempt,
      isCritical: false,
    };
  }

  return {
    severity: "WARNING",
    title: "ATENÇÃO · SISTEMA GESTOR",
    message: `Última sincronização há ${ago} · sem nova sync recente`,
    href: "/app/settings/integrations/dev",
    statusLabel: "ATRASADA",
    minutesSinceAttempt,
    hoursSinceAttempt,
    isCritical: false,
  };
}

function dayKeysLast7(todayDate: string): string[] {
  const [y, m, d] = todayDate.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const keys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    keys.push(localDateString(dt));
  }
  return keys;
}

function localDateFromIso(iso: string): string {
  return localDateString(new Date(iso));
}

/**
 * Séries dos últimos 7 dias a partir de apontamentos reais.
 * Eficiência do dia = proxy (1 - perdas/saída) quando há saída; senão null→0 no spark.
 * Aderência precisa de plano por dia — só hoje tem plano confiável; dias anteriores usam 0 se sem dado.
 */
function buildTrendSeries(input: {
  completedSteps: LotStepRun[];
  lossSteps: LotStepRun[];
  orders: Awaited<ReturnType<typeof listProductionOrders>>;
  todayDate: string;
}): CockpitTrendSeries {
  const dates = dayKeysLast7(input.todayDate);
  const PROVISIONAL = 12.4;

  const plannedByDay = new Map<string, number>();
  for (const o of input.orders) {
    if (o.productionStatus === "CANCELLED" || !o.productionDate) continue;
    const day = o.productionDate;
    plannedByDay.set(
      day,
      (plannedByDay.get(day) ?? 0) + (o.plannedQuantity ?? 0),
    );
  }

  const outputByDay = new Map<string, number>();
  for (const s of input.completedSteps) {
    if (s.stepType !== "PACKAGING" || s.outputQuantity == null) continue;
    const day = localDateFromIso(s.finishedAt ?? s.updatedAt);
    outputByDay.set(day, (outputByDay.get(day) ?? 0) + s.outputQuantity);
  }

  const lossByDay = new Map<string, number>();
  for (const s of input.lossSteps) {
    const day = localDateFromIso(s.finishedAt ?? s.updatedAt);
    lossByDay.set(day, (lossByDay.get(day) ?? 0) + (s.lossQuantity ?? 0));
  }

  const efficiencyPercent: number[] = [];
  const lossBrl: number[] = [];
  const adherencePercent: number[] = [];
  const atRiskOrders: number[] = [];

  for (const day of dates) {
    const out = outputByDay.get(day) ?? 0;
    const loss = lossByDay.get(day) ?? 0;
    const planned = plannedByDay.get(day) ?? 0;
    lossBrl.push(Math.round(loss * PROVISIONAL));
    if (out > 0) {
      const yieldPct = Math.max(0, Math.min(100, ((out - loss) / out) * 100));
      efficiencyPercent.push(Math.round(yieldPct));
    } else {
      efficiencyPercent.push(0);
    }
    adherencePercent.push(
      planned > 0 ? Math.round((out / planned) * 1000) / 10 : 0,
    );
    // Sem histórico de "em risco" por dia — spark usa 0; valor atual no card.
    atRiskOrders.push(0);
  }

  return {
    efficiencyPercent,
    lossBrl,
    adherencePercent,
    atRiskOrders,
    dates,
  };
}
