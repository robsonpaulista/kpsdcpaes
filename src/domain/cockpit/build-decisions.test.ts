import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDashboardDecisions } from "./build-decisions";

const empty = {
  plannedUnitsToday: 100,
  losses: [],
  quality: [],
  queueStops: [],
  lateLots: [],
  equipmentAvailable: 0,
  equipmentStopped: 1,
  equipmentOperating: 2,
  atRiskOrderCount: 0,
  atRiskOrderHref: "/app/cockpit/production",
};

describe("buildDashboardDecisions", () => {
  it("retorna lista vazia quando tudo ok (sem capacidade ociosa)", () => {
    const decisions = buildDashboardDecisions(empty);
    assert.equal(decisions.length, 0);
  });

  it("ordena por impacto com múltiplos critérios", () => {
    const decisions = buildDashboardDecisions({
      ...empty,
      plannedUnitsToday: 0,
      losses: [
        {
          id: "l1",
          lotCode: "PF01",
          productName: "Pão de Forma",
          stepLabel: "Embandejamento",
          lossQuantity: 100,
          pendingOccurrence: true,
          qualityHref: "/app/quality/losses",
          finishedAt: new Date().toISOString(),
        },
      ],
      queueStops: [
        {
          lotId: "lot-a",
          lotCode: "260826-005",
          productName: "Pão",
          stepLabel: "Amassamento",
          waitingMinutes: 3,
          href: "/app/cockpit/production/lots/lot-a",
          customerHint: "o pedido da Padoca Center",
        },
      ],
      equipmentAvailable: 7,
      equipmentStopped: 0,
      equipmentOperating: 1,
    });

    assert.ok(decisions.length >= 3);
    assert.equal(decisions[0]?.kind, "LOSS");
    assert.ok(
      decisions.find((d) => d.kind === "QUEUE_STOP"),
      "deve incluir fila parada",
    );
    assert.ok(
      decisions.find((d) => d.kind === "NO_PLAN"),
      "deve incluir ausência de plano",
    );
    assert.ok(
      decisions.find((d) => d.kind === "IDLE_CAPACITY"),
      "deve incluir capacidade ociosa",
    );

    for (let i = 1; i < decisions.length; i += 1) {
      assert.ok(
        (decisions[i - 1]?.impactScore ?? 0) >=
          (decisions[i]?.impactScore ?? 0),
      );
    }
  });
});
