import {
  DEFAULT_DAILY_LOSS_TARGET_BRL,
  PROVISIONAL_LOSS_UNIT_BRL,
  type DashboardVerdict,
} from "@/domain/cockpit/dashboard-types";
import { formatBrl } from "@/domain/cockpit/format-dashboard";
import { getSeverity, type Severity } from "@/lib/severity/getSeverity";

export type VerdictInput = {
  lossUnitsToday: number;
  lossTargetBrl?: number;
  atRiskOrders: number;
  lateCount: number;
  blockedLots: number;
  activeLots: number;
  bottleneckStepLabel?: string;
  queueStopCount?: number;
};

export function buildDashboardVerdict(input: VerdictInput): DashboardVerdict {
  const lossTargetBrl = input.lossTargetBrl ?? DEFAULT_DAILY_LOSS_TARGET_BRL;
  const lossBrl = Math.round(input.lossUnitsToday * PROVISIONAL_LOSS_UNIT_BRL);
  const lossSeverity = getSeverity(lossBrl, lossTargetBrl, "lowerIsBetter");
  const riskSeverity = getSeverity(input.atRiskOrders, 0, "lowerIsBetter");
  const opsCritical = input.lateCount > 0 || input.blockedLots > 0;
  const lossHot = lossSeverity === "critical" || lossSeverity === "warning";

  let severity: Severity = "good";
  if (opsCritical || lossSeverity === "critical" || riskSeverity === "critical") {
    severity = "critical";
  } else if (
    lossSeverity === "warning" ||
    riskSeverity === "warning" ||
    input.atRiskOrders > 0
  ) {
    severity = "warning";
  } else if (input.activeLots === 0) {
    severity = "neutral";
  }

  const multiple =
    lossTargetBrl > 0
      ? Math.round((lossBrl / lossTargetBrl) * 10) / 10
      : null;

  let statusLead = "A fábrica está";
  let statusLabel = "OPERAÇÃO ESTÁVEL";
  if (severity === "critical" || (severity === "warning" && lossHot)) {
    statusLabel = "ABAIXO DO RITMO";
  } else if (severity === "warning") {
    statusLabel = "ATENÇÃO NA LINHA";
  } else if (severity === "neutral") {
    statusLead = "A linha está";
    statusLabel = "PARADA";
  } else if (severity === "good" && input.activeLots > 0) {
    statusLabel = "PRODUÇÃO DENTRO DO PLANO";
  }

  const explanationParts: string[] = [];
  if (lossHot) {
    explanationParts.push("Perdas acima da meta");
  }
  if ((input.queueStopCount ?? 0) > 0) {
    explanationParts.push(
      input.queueStopCount === 1
        ? "1 lote aguardando liberação"
        : `${input.queueStopCount} lotes aguardando liberação`,
    );
  }
  if (input.lateCount > 0) {
    explanationParts.push(
      input.lateCount === 1
        ? "1 lote fora do tempo padrão"
        : `${input.lateCount} lotes fora do tempo padrão`,
    );
  }
  if (input.blockedLots > 0) {
    explanationParts.push(
      input.blockedLots === 1
        ? "1 bloqueio de qualidade"
        : `${input.blockedLots} bloqueios de qualidade`,
    );
  }
  if (input.atRiskOrders > 0) {
    explanationParts.push(
      input.atRiskOrders === 1
        ? "1 pedido em risco"
        : `${input.atRiskOrders} pedidos em risco`,
    );
  }
  if (input.bottleneckStepLabel && (severity === "critical" || severity === "warning")) {
    explanationParts.push(`gargalo em ${input.bottleneckStepLabel.toLowerCase()}`);
  }

  let explanation: string;
  if (severity === "good" && input.activeLots > 0) {
    explanation =
      "Produção dentro do ritmo. Nenhum pedido em risco e perdas na meta do dia.";
  } else if (severity === "neutral") {
    explanation =
      "Nenhum lote ativo — liberar OPs no PCP para começar o turno.";
  } else if (explanationParts.length > 0) {
    const [first, ...rest] = explanationParts;
    explanation =
      rest.length === 0
        ? `${first}.`
        : `${first} e ${rest.join("; ")}.`;
    explanation = explanation.charAt(0).toUpperCase() + explanation.slice(1);
  } else {
    explanation = "Monitorar a operação e a fila de decisões.";
  }

  const segments: DashboardVerdict["segments"] = [];
  const bottleneck = input.bottleneckStepLabel
    ? ` se o gargalo do ${input.bottleneckStepLabel.toLowerCase()} não for resolvido nas próximas 2h`
    : " se a fila não for destravada nas próximas 2h";

  if (severity === "good" && input.activeLots > 0) {
    segments.push({
      text: "Operação no ritmo: sem atraso crítico e perdas dentro da meta do dia.",
    });
  } else if (severity === "neutral") {
    segments.push({
      text: "Linha parada: nenhum lote ativo — liberar OPs no PCP para começar.",
    });
  } else {
    const parts: DashboardVerdict["segments"] = [];

    if (lossHot) {
      parts.push({ text: "Abaixo do ritmo: perdas já somam " });
      parts.push({
        text: formatBrl(lossBrl),
        tone: lossSeverity,
        countUp: lossBrl,
        format: "brl",
      });
      if (multiple != null && multiple > 1) {
        parts.push({ text: " — " });
        parts.push({
          text: `${multiple.toLocaleString("pt-BR")}× a meta diária`,
          tone: lossSeverity,
        });
      }
    } else if (opsCritical) {
      parts.push({ text: "Atenção na linha: " });
      if (input.blockedLots > 0) {
        parts.push({
          text: `${input.blockedLots} bloqueio(s) de qualidade`,
          tone: "critical",
        });
      }
      if (input.lateCount > 0) {
        if (input.blockedLots > 0) parts.push({ text: " e " });
        parts.push({
          text: `${input.lateCount} lote(s) fora do tempo padrão`,
          tone: "critical",
        });
      }
    } else {
      parts.push({ text: "Atenção: " });
    }

    if (input.atRiskOrders > 0) {
      parts.push({ text: lossHot || opsCritical ? " — e " : "" });
      parts.push({
        text:
          input.atRiskOrders === 1
            ? "1 pedido"
            : `${input.atRiskOrders} pedidos`,
        tone: "warning",
        countUp: input.atRiskOrders,
        format: "int",
      });
      parts.push({ text: ` corre risco de atraso${bottleneck}.` });
    } else if (lossHot && input.lateCount > 0) {
      parts.push({
        text: ` — e ${input.lateCount} lote(s) fora do tempo padrão.`,
        tone: "critical",
      });
    } else {
      parts.push({ text: "." });
    }

    segments.push(...parts);
  }

  const headline = segments.map((s) => s.text).join("");

  return {
    severity,
    statusLead,
    statusLabel,
    headline,
    explanation,
    impactBrl: lossHot || lossBrl > 0 ? lossBrl : null,
    impactMultiple:
      lossHot && multiple != null && multiple > 1 ? multiple : null,
    lossTargetBrl,
    segments,
    ctaHref: "#status-equipamentos",
    ctaLabel: "Ver status dos equipamentos →",
  };
}
