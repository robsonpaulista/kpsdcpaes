import type {
  IntegrationStatus,
  LotStatus,
  ProductionStatus,
  StepStatus,
  TimingStatus,
} from "@/types/production";

export function productionStatusLabel(status: ProductionStatus): string {
  switch (status) {
    case "WAITING":
      return "AGUARDANDO";
    case "RELEASED":
      return "LIBERADA";
    case "IN_PROGRESS":
      return "EM PRODUÇÃO";
    case "COMPLETED":
      return "CONCLUÍDA";
    case "CANCELLED":
      return "CANCELADA";
    default:
      return status;
  }
}

export function integrationStatusLabel(status: IntegrationStatus): string {
  switch (status) {
    case "PENDING_VALIDATION":
      return "PRODUTO NÃO MAPEADO";
    case "OUTDATED":
      return "ALTERAÇÃO NA ORIGEM";
    case "ERROR":
      return "ERRO DE IMPORTAÇÃO";
    case "IGNORED":
      return "IGNORADA";
    case "SYNCED":
      return "SINCRONIZADA";
    default:
      return status;
  }
}

export function stepStatusLabel(status: StepStatus): string {
  switch (status) {
    case "WAITING":
      return "AGUARDANDO";
    case "READY":
      return "PRONTO";
    case "IN_PROGRESS":
      return "EM ANDAMENTO";
    case "COMPLETED":
      return "CONCLUÍDO";
    case "BLOCKED":
      return "BLOQUEADO";
    default:
      return status;
  }
}

export function lotStatusLabel(status: LotStatus): string {
  switch (status) {
    case "WAITING":
      return "AGUARDANDO";
    case "IN_PROGRESS":
      return "EM ANDAMENTO";
    case "BLOCKED":
      return "BLOQUEADO";
    case "COMPLETED":
      return "CONCLUÍDO";
    case "CANCELLED":
      return "CANCELADO";
    default:
      return status;
  }
}

export function timingStatusLabel(status: TimingStatus): string {
  switch (status) {
    case "ON_TIME":
      return "NO PRAZO";
    case "ATTENTION":
      return "ATENÇÃO";
    case "LATE":
      return "ATRASADO";
    case "COMPLETED":
      return "CONCLUÍDO";
    case "NOT_STARTED":
      return "NÃO INICIADO";
    default:
      return status;
  }
}

/** Rótulo curto para lista/kanban (etapa ou lote). Bloqueio do lote tem prioridade. */
export function executionStatusLabel(
  stepStatus?: StepStatus | null,
  lotStatus?: LotStatus | null,
): string {
  if (lotStatus === "BLOCKED") return lotStatusLabel("BLOCKED");
  if (stepStatus) return stepStatusLabel(stepStatus);
  if (lotStatus) return lotStatusLabel(lotStatus);
  return "—";
}
