import { type Firestore } from "firebase/firestore";
import { omitUndefined } from "@/lib/firestore/omit-undefined";
import {
  createProductionEvent,
  listStepRunsWithLoss,
} from "@/repositories/execution.repository";
import {
  getLotByCode,
  getLotById,
  upsertLot,
} from "@/repositories/lots.repository";
import {
  getQualityIncident,
  listIncidentsByLot,
  listQualityIncidents,
  upsertQualityIncident,
} from "@/repositories/quality.repository";
import type { StepType } from "@/types/production";
import type { QualityIncident, QualityLossSignal } from "@/types/quality";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export interface CreateIncidentInput {
  lotCodeOrId: string;
  description: string;
  /** Se true, bloqueia o lote (ação explícita — Doc 10 §25). */
  blockLot?: boolean;
  stepType?: StepType;
  stationId?: string;
  relatedStepRunId?: string;
  lossQuantity?: number;
  lossReason?: string;
}

/**
 * Fila de perdas do chão → Qualidade.
 * Perda apontada na estação aparece aqui; ocorrência é o passo seguinte.
 */
export async function listQualityLossSignals(
  db: Firestore,
): Promise<QualityLossSignal[]> {
  const [lossSteps, incidents] = await Promise.all([
    listStepRunsWithLoss(db),
    listQualityIncidents(db),
  ]);

  const byStepRun = new Map<string, QualityIncident>();
  for (const incident of incidents) {
    if (incident.relatedStepRunId) {
      byStepRun.set(incident.relatedStepRunId, incident);
    }
  }

  const lotIds = [...new Set(lossSteps.map((s) => s.lotId))];
  const lots = await Promise.all(lotIds.map((id) => getLotById(db, id)));
  const lotById = new Map(
    lots.filter(Boolean).map((lot) => [lot!.id, lot!] as const),
  );

  const signals: QualityLossSignal[] = [];
  for (const step of lossSteps) {
    const lot = lotById.get(step.lotId);
    if (!lot) continue;
    const linked = byStepRun.get(step.id);
    signals.push({
      stepRunId: step.id,
      lotId: lot.id,
      lotCode: lot.lotCode,
      productionOrderId: lot.productionOrderId,
      productId: lot.productId,
      stepType: step.stepType,
      lossQuantity: step.lossQuantity ?? 0,
      lossReason: step.lossReason,
      outputQuantity: step.outputQuantity,
      inputQuantity: step.inputQuantity,
      finishedAt: step.finishedAt ?? step.updatedAt,
      hasIncident: Boolean(linked),
      incidentId: linked?.id,
    });
  }

  return signals;
}

/**
 * Registra ocorrência. Bloqueio só se `blockLot` for pedido explicitamente.
 */
export async function createQualityIncident(
  db: Firestore,
  input: CreateIncidentInput,
): Promise<{ incident: QualityIncident; lotBlocked: boolean }> {
  const description = input.description.trim();
  if (!description) throw new Error("Descrição da ocorrência é obrigatória.");

  const lot =
    (await getLotByCode(db, input.lotCodeOrId)) ??
    (await getLotById(db, input.lotCodeOrId));
  if (!lot) throw new Error("Lote não encontrado.");

  const now = new Date().toISOString();
  const incident: QualityIncident = omitUndefined({
    id: newId("qi"),
    lotId: lot.id,
    lotCode: lot.lotCode,
    productionOrderId: lot.productionOrderId,
    productId: lot.productId,
    stepType: input.stepType ?? lot.currentStep,
    stationId: input.stationId,
    description,
    status: "OPEN",
    blocksLot: Boolean(input.blockLot),
    relatedStepRunId: input.relatedStepRunId,
    lossQuantity: input.lossQuantity,
    lossReason: input.lossReason,
    createdAt: now,
    updatedAt: now,
  }) as QualityIncident;

  await upsertQualityIncident(db, incident);

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId: lot.id,
    productionOrderId: lot.productionOrderId,
    type: "QUALITY_INCIDENT",
    stepType: incident.stepType as StepType | undefined,
    stationId: input.stationId,
    occurredAt: now,
    createdAt: now,
    metadata: {
      incidentId: incident.id,
      description,
      blocksLot: incident.blocksLot,
      relatedStepRunId: input.relatedStepRunId,
      lossQuantity: input.lossQuantity,
      lossReason: input.lossReason,
    },
  });

  let lotBlocked = false;
  if (input.blockLot && lot.status !== "BLOCKED") {
    await upsertLot(db, {
      ...lot,
      status: "BLOCKED",
      updatedAt: now,
    });
    await createProductionEvent(db, {
      id: newId("evt"),
      lotId: lot.id,
      productionOrderId: lot.productionOrderId,
      type: "LOT_BLOCKED",
      occurredAt: now,
      createdAt: now,
      metadata: { incidentId: incident.id, reason: description },
    });
    lotBlocked = true;
  }

  return { incident, lotBlocked };
}

/** Status do lote ao sair do bloqueio (sem inventar COMPLETED se ainda há etapa). */
function statusAfterRelease(
  lot: Awaited<ReturnType<typeof getLotById>>,
): "WAITING" | "IN_PROGRESS" | "COMPLETED" {
  if (!lot) return "WAITING";
  if (lot.completedAt || lot.currentStepStatus === "COMPLETED") {
    return "COMPLETED";
  }
  if (lot.currentStepStatus === "IN_PROGRESS") return "IN_PROGRESS";
  return "WAITING";
}

async function markIncidentResolved(
  db: Firestore,
  existing: QualityIncident,
  resolutionNote: string | undefined,
  now: string,
): Promise<QualityIncident> {
  const updated: QualityIncident = omitUndefined({
    ...existing,
    status: "RESOLVED",
    resolvedAt: now,
    resolutionNote: resolutionNote?.trim() || undefined,
    updatedAt: now,
  }) as QualityIncident;

  await upsertQualityIncident(db, updated);

  await createProductionEvent(db, {
    id: newId("evt"),
    lotId: existing.lotId,
    productionOrderId: existing.productionOrderId,
    type: "QUALITY_INCIDENT_RESOLVED",
    occurredAt: now,
    createdAt: now,
    metadata: {
      incidentId: existing.id,
      resolutionNote: updated.resolutionNote,
    },
  });

  return updated;
}

/**
 * Fecha a ocorrência. Exige texto da solução. Se era de bloqueio e o lote
 * ainda está BLOCKED, exige liberação explícita (Doc 10 §25–27).
 */
export async function resolveQualityIncident(
  db: Firestore,
  incidentId: string,
  resolutionNote: string,
): Promise<QualityIncident> {
  const note = resolutionNote.trim();
  if (!note) {
    throw new Error("Informe o que foi resolvido / a solução aplicada.");
  }

  const existing = await getQualityIncident(db, incidentId);
  if (!existing) throw new Error("Ocorrência não encontrada.");
  if (existing.status === "RESOLVED") return existing;

  if (existing.blocksLot) {
    const lot = await getLotById(db, existing.lotId);
    if (lot?.status === "BLOCKED") {
      throw new Error(
        "Este registro bloqueou o lote. Use Liberar lote (com motivo) para desbloquear e fechar a ocorrência.",
      );
    }
  }

  return markIncidentResolved(db, existing, note, new Date().toISOString());
}

/**
 * Libera lote bloqueado (ação auditável) e resolve ocorrências abertas
 * que pediram o bloqueio — evita “Aberta · Bloqueio” com lote já liberado.
 */
export async function releaseBlockedLot(
  db: Firestore,
  lotId: string,
  reason: string,
): Promise<void> {
  const note = reason.trim();
  if (!note) throw new Error("Informe o motivo da liberação.");

  const lot = await getLotById(db, lotId);
  if (!lot) throw new Error("Lote não encontrado.");

  const now = new Date().toISOString();
  const openBlocking = (await listIncidentsByLot(db, lotId)).filter(
    (i) => i.status === "OPEN" && i.blocksLot,
  );

  if (lot.status === "BLOCKED") {
    const nextStatus = statusAfterRelease(lot);
    await upsertLot(db, {
      ...lot,
      status: nextStatus,
      updatedAt: now,
    });

    await createProductionEvent(db, {
      id: newId("evt"),
      lotId: lot.id,
      productionOrderId: lot.productionOrderId,
      type: "LOT_UNBLOCKED",
      occurredAt: now,
      createdAt: now,
      metadata: { reason: note },
    });
  } else if (openBlocking.length === 0) {
    throw new Error("Lote não está bloqueado.");
  }

  for (const incident of openBlocking) {
    await markIncidentResolved(db, incident, note, now);
  }
}

export async function getLotQualitySummary(db: Firestore, lotId: string) {
  return listIncidentsByLot(db, lotId);
}
