import type { StepType } from "@/types/production";

/**
 * Motivo de perda configurável (Doc 04 / 10).
 * Catálogo oficial da DC Pães ainda não validado — não inventar motivos reais.
 * V1: estrutura + "Outro" + cadastro manual em Settings.
 */
export interface LossReason {
  id: string;
  code: string;
  label: string;
  /** Vazio = aplicável a todas as etapas. */
  stepTypes: StepType[];
  /** Exige texto livre complementar (ex.: Outro). */
  requiresNotes: boolean;
  /** true = placeholder até validação operacional. */
  provisional: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
