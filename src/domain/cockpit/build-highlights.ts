import type { DashboardHighlight } from "@/domain/cockpit/dashboard-types";
import type { Severity } from "@/lib/severity/getSeverity";

export type HighlightsInput = {
  atRiskOrders: number;
  completedLotsToday: number;
  onTimeCount: number;
  lateCount: number;
  equipmentAvailable: number;
  equipmentOperating: number;
  equipmentStopped: number;
  decisionsOpen: number;
};

/**
 * Destaques positivos do turno — só com dados reais.
 * Sem inventar sequências ou scores.
 */
export function buildDashboardHighlights(
  input: HighlightsInput,
): DashboardHighlight[] {
  const items: DashboardHighlight[] = [];

  if (input.atRiskOrders === 0) {
    items.push({
      id: "no-risk",
      value: "0",
      label: "Pedidos em risco",
      tone: "good",
    });
  }

  if (input.completedLotsToday > 0) {
    items.push({
      id: "completed",
      value: String(input.completedLotsToday),
      label: "Lotes concluídos hoje",
      tone: "good",
    });
  }

  const timed = input.onTimeCount + input.lateCount;
  if (timed > 0 && input.onTimeCount > 0) {
    items.push({
      id: "on-time",
      value: String(input.onTimeCount),
      label: "Lotes no prazo (agora)",
      tone: input.lateCount === 0 ? "good" : "neutral",
    });
  }

  const equipTotal =
    input.equipmentAvailable +
    input.equipmentOperating +
    input.equipmentStopped;
  if (equipTotal > 0) {
    const freePct = Math.round(
      ((input.equipmentAvailable + input.equipmentOperating) / equipTotal) * 100,
    );
    items.push({
      id: "equip",
      value: `${freePct}%`,
      label: "Equipamentos operacionais",
      tone: (freePct >= 80 ? "good" : freePct >= 50 ? "warning" : "critical") as Severity,
    });
  }

  if (input.decisionsOpen === 0) {
    items.push({
      id: "clear",
      value: "Limpo",
      label: "Fila de decisões",
      tone: "good",
    });
  }

  return items.slice(0, 5);
}
