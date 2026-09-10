import type { Firestore } from "firebase/firestore";
import { LOSS_REASON_SEED } from "@/domain/production/loss-reason-seed";
import {
  getLossReasonById,
  listLossReasons,
  upsertLossReason,
} from "@/repositories/loss-reason.repository";
import type { LossReason } from "@/types/loss-reason";
import type { StepType } from "@/types/production";

function newId(): string {
  return `loss_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function seedLossReasons(db: Firestore): Promise<{
  created: number;
  skipped: number;
  reasons: LossReason[];
}> {
  const now = new Date().toISOString();
  let created = 0;
  let skipped = 0;

  for (const seed of LOSS_REASON_SEED) {
    const existing = await getLossReasonById(db, seed.id);
    if (existing) {
      skipped += 1;
      continue;
    }
    await upsertLossReason(db, {
      ...seed,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }

  return {
    created,
    skipped,
    reasons: await listLossReasons(db),
  };
}

export async function createLossReason(
  db: Firestore,
  input: {
    code: string;
    label: string;
    stepTypes: StepType[];
    requiresNotes: boolean;
  },
): Promise<LossReason> {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "_");
  const label = input.label.trim();
  if (!code) throw new Error("Informe o código do motivo.");
  if (!label) throw new Error("Informe o rótulo do motivo.");

  const now = new Date().toISOString();
  const reason: LossReason = {
    id: newId(),
    code,
    label,
    stepTypes: input.stepTypes,
    requiresNotes: input.requiresNotes,
    provisional: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await upsertLossReason(db, reason);
  return reason;
}

export async function setLossReasonActive(
  db: Firestore,
  id: string,
  active: boolean,
): Promise<LossReason> {
  const existing = await getLossReasonById(db, id);
  if (!existing) throw new Error("Motivo não encontrado.");
  const updated: LossReason = {
    ...existing,
    active,
    updatedAt: new Date().toISOString(),
  };
  await upsertLossReason(db, updated);
  return updated;
}

/** Monta texto persistido na etapa (snapshot legível). */
export function formatLossReasonSnapshot(input: {
  label: string;
  notes?: string;
  requiresNotes: boolean;
}): string {
  const notes = input.notes?.trim();
  if (input.requiresNotes) {
    if (!notes) throw new Error("Descreva o motivo da perda.");
    return notes;
  }
  if (notes) return `${input.label} · ${notes}`;
  return input.label;
}
