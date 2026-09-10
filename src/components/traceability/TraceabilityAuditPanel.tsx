"use client";

import { stepTypeLabel } from "@/domain/production/process-route";
import type {
  LotStepRun,
  ProductionEvent,
  ProductionLot,
  ProductionOrder,
} from "@/types/production";
import type { QualityIncident } from "@/types/quality";

type AuditItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

function buildAuditItems(input: {
  lot: ProductionLot;
  order: ProductionOrder | null;
  steps: LotStepRun[];
  events: ProductionEvent[];
  incidents: QualityIncident[];
  equipmentIds: Set<string>;
}): AuditItem[] {
  const { lot, order, steps, events, incidents, equipmentIds } = input;
  const completedSteps = steps.filter((s) => s.status === "COMPLETED");
  const stepsWithEquipment = steps.filter((s) => s.equipmentId);
  const stepsWithOperator = steps.filter((s) => s.operatorId);
  const totalLoss = steps.reduce((sum, s) => sum + (s.lossQuantity ?? 0), 0);

  return [
    {
      id: "op",
      label: "OP vinculada",
      ok: Boolean(order),
      detail: order
        ? `OP ${order.externalOrderNumber}`
        : "Ordem de produção não encontrada",
    },
    {
      id: "route",
      label: "Rota snapshot",
      ok: Boolean(lot.processRoute?.length),
      detail: lot.processRoute?.length
        ? `${lot.processRoute.length} etapa(s) congeladas na liberação`
        : "Sem snapshot de rota no lote",
    },
    {
      id: "steps",
      label: "Etapas registradas",
      ok: steps.length > 0,
      detail:
        steps.length > 0
          ? `${completedSteps.length}/${steps.length} concluída(s)`
          : "Nenhuma etapa no histórico",
    },
    {
      id: "equipment",
      label: "Equipamentos",
      ok: stepsWithEquipment.length > 0 || equipmentIds.size > 0,
      detail:
        stepsWithEquipment.length > 0
          ? `${stepsWithEquipment.length} etapa(s) com equipamento`
          : "Nenhum equipamento vinculado às etapas",
    },
    {
      id: "operators",
      label: "Operadores",
      ok: stepsWithOperator.length > 0,
      detail:
        stepsWithOperator.length > 0
          ? `${stepsWithOperator.length} etapa(s) com operador`
          : "Operador não registrado nas etapas",
    },
    {
      id: "events",
      label: "Linha do tempo",
      ok: events.length > 0,
      detail:
        events.length > 0
          ? `${events.length} evento(s) de execução`
          : "Sem eventos na timeline",
    },
    {
      id: "losses",
      label: "Perdas (se houver)",
      ok: totalLoss === 0 || steps.some((s) => (s.lossQuantity ?? 0) > 0),
      detail:
        totalLoss > 0
          ? `${totalLoss.toLocaleString("pt-BR")} un. em ${steps.filter((s) => (s.lossQuantity ?? 0) > 0).length} etapa(s)`
          : "Nenhuma perda apontada",
    },
    {
      id: "incidents",
      label: "Ocorrências (se houver)",
      ok: incidents.length === 0 || incidents.every((i) => i.status === "RESOLVED" || !i.blocksLot),
      detail:
        incidents.length === 0
          ? "Sem ocorrências"
          : `${incidents.length} ocorrência(s) · ${
              incidents.filter((i) => i.status === "OPEN").length
            } aberta(s)`,
    },
    {
      id: "complete",
      label: "Lote concluído",
      ok: lot.status === "COMPLETED",
      detail:
        lot.status === "COMPLETED"
          ? "Embalagem finalizada — pronto para auditoria"
          : lot.currentStep
            ? `Em ${stepTypeLabel(lot.currentStep)} · ${lot.currentStepStatus ?? "—"}`
            : "Ainda em execução",
    },
  ];
}

/**
 * Painel de auditoria para QA E2E (Doc 11 §31 / §32).
 * Mostra o que já está presente no histórico do lote.
 */
export function TraceabilityAuditPanel({
  lot,
  order,
  steps,
  events,
  incidents,
  equipmentIds,
}: {
  lot: ProductionLot;
  order: ProductionOrder | null;
  steps: LotStepRun[];
  events: ProductionEvent[];
  incidents: QualityIncident[];
  equipmentIds: Set<string>;
}) {
  const items = buildAuditItems({
    lot,
    order,
    steps,
    events,
    incidents,
    equipmentIds,
  });
  const okCount = items.filter((i) => i.ok).length;
  const requiredForMvp = items.filter((i) => i.id !== "losses" && i.id !== "incidents");
  const mvpReady = requiredForMvp.every((i) => i.ok);

  return (
    <section className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-dc-text">
            Auditoria E2E
          </h2>
          <p className="mt-1 text-xs text-dc-text-secondary">
            Critérios do Doc 11 §32 — o que o histórico já prova neste lote.
          </p>
        </div>
        <p
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            mvpReady
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning"
          }`}
        >
          {okCount}/{items.length} ·{" "}
          {mvpReady ? "Pronto para validar" : "Incompleto"}
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg px-2 py-1.5"
          >
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                  item.ok
                    ? "bg-success text-white"
                    : "border border-dc-border bg-dc-bg text-dc-text-muted"
                }`}
                aria-hidden
              >
                {item.ok ? "✓" : "·"}
              </span>
              <div>
                <p className="text-sm font-medium text-dc-text">{item.label}</p>
                <p className="text-xs text-dc-text-secondary">{item.detail}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
