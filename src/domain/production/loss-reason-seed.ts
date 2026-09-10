import type { LossReason } from "@/types/loss-reason";

/** Único seed V1 — não inventa motivos oficiais da DC Pães. */
export const LOSS_REASON_SEED: Omit<
  LossReason,
  "createdAt" | "updatedAt"
>[] = [
  {
    id: "loss_other",
    code: "OTHER",
    label: "Outro (descrever)",
    stepTypes: [],
    requiresNotes: true,
    provisional: true,
    active: true,
  },
];
