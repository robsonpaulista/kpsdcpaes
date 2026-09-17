import {
  OPEN_INCIDENT_DECISION_HOURS,
  PROVISIONAL_LOSS_UNIT_BRL,
  QUEUE_STOP_DECISION_MINUTES,
  type DashboardDecision,
} from "@/domain/cockpit/dashboard-types";
import type { Severity } from "@/lib/severity/getSeverity";
import { formatBrl } from "@/domain/cockpit/format-dashboard";

export type DecisionInput = {
  plannedUnitsToday: number;
  losses: Array<{
    id: string;
    lotCode: string;
    productName: string;
    stepLabel: string;
    lossQuantity: number;
    pendingOccurrence: boolean;
    qualityHref: string;
    finishedAt: string;
  }>;
  quality: Array<{
    id: string;
    lotCode: string;
    productName: string;
    description: string;
    blocksLot: boolean;
    createdAt: string;
    href: string;
  }>;
  queueStops: Array<{
    lotId: string;
    lotCode: string;
    productName: string;
    stepLabel: string;
    waitingMinutes: number;
    href: string;
    customerHint?: string;
  }>;
  lateLots: Array<{
    lotId: string;
    lotCode: string;
    productName: string;
    href: string;
  }>;
  equipmentAvailable: number;
  equipmentStopped: number;
  equipmentOperating: number;
  atRiskOrderCount: number;
  atRiskOrderHref: string;
  atRiskCustomerHint?: string;
};

function hoursSince(iso: string, nowMs: number): number {
  return Math.max(0, (nowMs - new Date(iso).getTime()) / 3_600_000);
}

/**
 * Gera a lista "Decisões de hoje" a partir de regras — não hardcode no front.
 * Ordenada por impacto (maior primeiro). Lista vazia quando não há decisão humana.
 */
export function buildDashboardDecisions(
  input: DecisionInput,
  nowMs = Date.now(),
): DashboardDecision[] {
  const decisions: DashboardDecision[] = [];

  for (const loss of input.losses) {
    if (!loss.pendingOccurrence && loss.lossQuantity <= 0) continue;
    if (loss.lossQuantity <= 0 && !loss.pendingOccurrence) continue;

    const brl = Math.round(loss.lossQuantity * PROVISIONAL_LOSS_UNIT_BRL);
    const severity: Severity =
      brl >= 600 || loss.pendingOccurrence ? "critical" : "warning";

    decisions.push({
      id: `loss-${loss.id}`,
      kind: "LOSS",
      severity,
      title: `Perda de ${loss.lossQuantity.toLocaleString("pt-BR")} un. de ${loss.productName} no ${loss.stepLabel.toLowerCase()}`,
      tag: `${severity === "critical" ? "CRÍTICO" : "ATENÇÃO"} · ${formatBrl(brl)}`,
      impactScore: 1000 + brl,
      impactLabel: formatBrl(brl),
      description: loss.pendingOccurrence
        ? `Apontamento em ${loss.lotCode} sem ocorrência registrada — impede o fechamento do lote.`
        : `Perda apontada em ${loss.lotCode} · estimativa provisória de impacto.`,
      href: loss.qualityHref,
      ctaLabel: "Abrir ocorrência →",
    });
  }

  for (const incident of input.quality) {
    const ageH = hoursSince(incident.createdAt, nowMs);
    if (ageH < OPEN_INCIDENT_DECISION_HOURS && !incident.blocksLot) continue;

    decisions.push({
      id: `qi-${incident.id}`,
      kind: "OPEN_INCIDENT",
      severity: incident.blocksLot ? "critical" : "warning",
      title: incident.blocksLot
        ? `Bloqueio de qualidade em ${incident.lotCode}`
        : `Ocorrência aberta em ${incident.lotCode}`,
      tag: incident.blocksLot
        ? "CRÍTICO · BLOQUEIO"
        : `ATENÇÃO · ${Math.round(ageH)}h`,
      impactScore: incident.blocksLot ? 950 : 700 + ageH,
      description:
        incident.description.slice(0, 120) ||
        `Ocorrência aberta há ${Math.round(ageH)}h sem tratativa registrada.`,
      href: incident.href,
      ctaLabel: "Abrir ocorrência →",
    });
  }

  for (const stop of input.queueStops) {
    if (stop.waitingMinutes < QUEUE_STOP_DECISION_MINUTES) continue;
    decisions.push({
      id: `queue-${stop.lotId}`,
      kind: "QUEUE_STOP",
      severity: stop.waitingMinutes >= 15 ? "critical" : "warning",
      title: `Fila parada no ${stop.stepLabel.toLowerCase()}`,
      tag: `ATENÇÃO · ${stop.waitingMinutes} MIN`,
      impactScore: 500 + stop.waitingMinutes,
      impactLabel: `${stop.waitingMinutes} min`,
      description: `Lote ${stop.lotCode} aguardando liberação${
        stop.customerHint
          ? ` — se persistir, atrasa ${stop.customerHint}`
          : " — se persistir, atrasa as etapas seguintes"
      }.`,
      href: stop.href,
      ctaLabel: "Ver lote →",
    });
  }

  for (const late of input.lateLots) {
    decisions.push({
      id: `late-${late.lotId}`,
      kind: "LATE_LOT",
      severity: "critical",
      title: `Lote ${late.lotCode} atrasado`,
      tag: "CRÍTICO · ATRASO",
      impactScore: 800,
      description: `${late.productName} fora do tempo padrão da etapa — exige decisão de prioridade.`,
      href: late.href,
      ctaLabel: "Ver lote →",
    });
  }

  if (input.plannedUnitsToday <= 0) {
    decisions.push({
      id: "no-plan",
      kind: "NO_PLAN",
      severity: "neutral",
      title: "Sem plano de produção cadastrado hoje",
      tag: "BLOQUEIA INDICADOR",
      impactScore: 400,
      description:
        "Aderência ao plano não pode ser calculada enquanto o PCP não lançar a meta do dia.",
      href: "/app/pcp",
      ctaLabel: "Cadastrar plano →",
    });
  }

  if (input.atRiskOrderCount > 0) {
    decisions.push({
      id: "at-risk-orders",
      kind: "AT_RISK_ORDER",
      severity: input.atRiskOrderCount >= 2 ? "critical" : "warning",
      title:
        input.atRiskOrderCount === 1
          ? "1 pedido em risco de atraso"
          : `${input.atRiskOrderCount} pedidos em risco de atraso`,
      tag:
        input.atRiskOrderCount >= 2
          ? `CRÍTICO · ${input.atRiskOrderCount}`
          : `ATENÇÃO · ${input.atRiskOrderCount}`,
      impactScore: 600 + input.atRiskOrderCount * 50,
      description: input.atRiskCustomerHint
        ? `Impacto em ${input.atRiskCustomerHint} se o gargalo não for resolvido.`
        : "Lotes/atrasos na linha colocam entrega em risco.",
      href: input.atRiskOrderHref,
      ctaLabel: "Ver produção →",
    });
  }

  const free = input.equipmentAvailable;
  const stopped = input.equipmentStopped;
  if (free >= 3 && stopped === 0 && input.equipmentOperating >= 0) {
    decisions.push({
      id: "idle-capacity",
      kind: "IDLE_CAPACITY",
      severity: "good",
      title: `${free} equipamentos livres, ${stopped} parados`,
      tag: "CAPACIDADE OCIOSA",
      impactScore: 50 + free,
      description:
        "Nenhum recurso travado agora — janela boa para adiantar o próximo lote da fila.",
      href: "/app/equipment",
      ctaLabel: "Ver equipamentos →",
    });
  }

  decisions.sort((a, b) => b.impactScore - a.impactScore);
  return decisions;
}
