import { stepTypeLabel } from "@/domain/production/process-route";
import type { ProductionEvent, StepType } from "@/types/production";

export function productionEventLabel(event: ProductionEvent): string {
  const step =
    event.stepType != null
      ? stepTypeLabel(event.stepType as StepType)
      : null;
  switch (event.type) {
    case "LOT_RELEASED":
      return "Lote liberado para produção";
    case "STEP_READY":
      return step ? `${step} pronta` : "Etapa pronta";
    case "STEP_STARTED": {
      const wait = event.metadata?.waitingDurationMinutes;
      const waitTxt =
        typeof wait === "number" ? ` · espera ${wait} min` : "";
      const auto =
        event.metadata?.autoStarted === true
          ? " · automático (saída do forno)"
          : "";
      return step
        ? `${step} iniciada${waitTxt}${auto}`
        : `Etapa iniciada${waitTxt}${auto}`;
    }
    case "STEP_COMPLETED": {
      const proc = event.metadata?.processDurationMinutes;
      const procTxt =
        typeof proc === "number" ? ` · processo ${proc} min` : "";
      return step
        ? `${step} concluída${procTxt}`
        : `Etapa concluída${procTxt}`;
    }
    case "LOT_COMPLETED":
      return "Lote concluído";
    case "ORDER_COMPLETED":
      return "Ordem de produção concluída";
    case "LOSS_RECORDED": {
      const qty = event.metadata?.lossQuantity;
      const reason = event.metadata?.lossReason;
      const lossTxt =
        typeof qty === "number"
          ? ` · ${qty.toLocaleString("pt-BR")} un.`
          : "";
      const reasonTxt =
        typeof reason === "string" && reason.trim()
          ? ` · ${reason.trim()}`
          : "";
      return step
        ? `Perda apontada em ${step}${lossTxt}${reasonTxt}`
        : `Perda apontada${lossTxt}${reasonTxt}`;
    }
    case "QUALITY_INCIDENT":
      return "Ocorrência de qualidade registrada";
    case "QUALITY_INCIDENT_RESOLVED":
      return "Ocorrência resolvida";
    case "LOT_BLOCKED":
      return "Lote bloqueado";
    case "LOT_UNBLOCKED":
      return "Lote liberado (qualidade)";
    default:
      return event.type;
  }
}
