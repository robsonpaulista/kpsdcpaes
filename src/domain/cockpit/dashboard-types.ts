import type { Severity } from "@/lib/severity/getSeverity";
import type { EquipmentType } from "@/types/equipment";

/**
 * Estimativa provisória de custo unitário de perda até o ERP enviar custo.
 * Não é preço oficial de ficha — só para traduzir impacto em R$ na UI.
 */
export const PROVISIONAL_LOSS_UNIT_BRL = 12.4;

/** Meta diária provisória de perdas em R$ (até dailyMetrics). */
export const DEFAULT_DAILY_LOSS_TARGET_BRL = 300;

/** Meta provisória de eficiência (% lotes no prazo). */
export const DEFAULT_EFFICIENCY_TARGET_PERCENT = 82;

/** Meta de aderência ao plano (%). */
export const DEFAULT_ADHERENCE_TARGET_PERCENT = 95;

/** Pedidos em risco: meta do dia = 0. */
export const DEFAULT_AT_RISK_ORDERS_TARGET = 0;

/** Sync acima deste limiar (horas) = banner crítico. */
export const CRITICAL_SYNC_HOURS = 24;

/** Fila parada acima deste limiar (min) = decisão. */
export const QUEUE_STOP_DECISION_MINUTES = 3;

/** Ocorrência aberta há mais deste limiar (horas) = decisão. */
export const OPEN_INCIDENT_DECISION_HOURS = 2;

export type DecisionKind =
  | "LOSS"
  | "QUEUE_STOP"
  | "NO_PLAN"
  | "OPEN_INCIDENT"
  | "BLOCKED_LOT"
  | "IDLE_CAPACITY"
  | "LATE_LOT"
  | "AT_RISK_ORDER";

export interface DashboardDecision {
  id: string;
  kind: DecisionKind;
  severity: Severity;
  title: string;
  /** Tag curta: CRÍTICO · R$ 1.240 */
  tag: string;
  /** Impacto numérico para ordenação (maior = primeiro). */
  impactScore: number;
  /** Impacto exibido (R$, min, etc.) */
  impactLabel?: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface DashboardKpi {
  id: string;
  label: string;
  /** Valor formatado ou null → estado explicado */
  value: string | null;
  valueRaw: number | null;
  metaLabel: string;
  metaRaw: number | null;
  severity: Severity;
  /** Pill: "▼ 14pp" / "▲ 314%" / "sem dado" */
  deltaLabel: string;
  deltaTone: Severity;
  sparkline: number[];
  sparkFooterLeft: string;
  sparkFooterRight: string;
  href: string;
  emptyHint?: string;
  /** Título curto para pulso (ex.: PERDAS HOJE) */
  pulseLabel?: string;
  /** CTA quando sem dado */
  emptyCtaLabel?: string;
}

export interface DashboardVerdict {
  severity: Severity;
  /** Ex.: ABAIXO DO RITMO */
  statusLabel: string;
  /** Prefixo tipográfico: "A fábrica está" */
  statusLead: string;
  headline: string;
  explanation: string;
  impactBrl: number | null;
  impactMultiple: number | null;
  lossTargetBrl: number;
  /** Partes com ênfase para o JSX (texto + tom) */
  segments: Array<{
    text: string;
    tone?: Severity | "strong";
    countUp?: number;
    format?: "brl" | "int";
  }>;
  ctaHref: string;
  ctaLabel: string;
}

export interface CriticalBannerData {
  title: string;
  message: string;
  href: string;
  ctaLabel: string;
  hoursStale: number;
}

export type FloorRowStatus = "waiting" | "running" | "stopped";

export interface DashboardFloorRow {
  id: string;
  productName: string;
  lotCode: string;
  stepType: string | null;
  stepLabel: string;
  status: FloorRowStatus;
  statusLabel: string;
  href: string;
  /** Minutos na fila (READY) — base para LiveTimer */
  waitingMinutes: number | null;
  timing: "ON_TIME" | "ATTENTION" | "LATE" | null;
  /** Progresso na rota padrão: índices 0..n-1 */
  routeSteps: Array<{
    stepType: string;
    stepLabel: string;
    state: "done" | "current" | "upcoming";
  }>;
  /** Foto do produto (product.imageUrl). */
  imageUrl: string | null;
  /** Lote na etapa de gargalo atual */
  isBottleneck: boolean;
  /** Qtde planejada do lote em unidades. */
  plannedQuantity: number | null;
}

export interface DashboardFlowStage {
  stepType: string;
  stepLabel: string;
  count: number;
  lateCount: number;
  attentionCount: number;
  isBottleneck: boolean;
  avgWaitingMinutes: number | null;
  avgProcessMinutes: number | null;
  standardMinutes: number | null;
  queueReady: number;
  queueRunning: number;
}

export interface DashboardBottleneck {
  stepType: string;
  stepLabel: string;
  lotCode: string | null;
  productName: string | null;
  waitingMinutes: number | null;
  href: string | null;
  pressureScore: number;
}

export interface DashboardHighlight {
  id: string;
  value: string;
  label: string;
  tone: Severity;
}

/** Status efetivo de equipamento na Visão Geral. */
export type DashboardEquipmentStatus =
  | "AVAILABLE"
  | "OPERATING"
  | "WAITING"
  | "STOPPED"
  | "MAINTENANCE"
  | "UNAVAILABLE";

export interface DashboardEquipmentRow {
  id: string;
  code: string;
  name: string;
  type: EquipmentType;
  typeLabel: string;
  status: DashboardEquipmentStatus;
  href: string;
  lotCode: string | null;
  lotHref: string | null;
  remainingLabel: string | null;
  stoppedLabel: string | null;
  stopReason: string | null;
  timing: "ON_TIME" | "ATTENTION" | "LATE" | null;
}

export interface DashboardCounts {
  activeLots: number;
  equipmentAvailable: number;
  equipmentOperating: number;
  equipmentStopped: number;
  completedLotsToday: number;
  decisionsOpen: number;
}

export interface DashboardSyncStatus {
  floorRealtime: boolean;
  gestorLabel: string;
  hoursStale: number | null;
  criticalBanner: CriticalBannerData | null;
}

export interface DashboardSnapshot {
  plantName: string;
  unitLabel: string;
  shiftLabel: string;
  periodLabel: string;
  updatedAt: string;
  refreshMinutes: number;
  sync: DashboardSyncStatus;
  verdict: DashboardVerdict;
  kpis: DashboardKpi[];
  decisions: DashboardDecision[];
  floorItems: DashboardFloorRow[];
  equipmentItems: DashboardEquipmentRow[];
  flowStages: DashboardFlowStage[];
  bottleneck: DashboardBottleneck | null;
  highlights: DashboardHighlight[];
  counts: DashboardCounts;
}
