import type { ProcessRouteStep, StepType } from "@/types/production";

/**
 * Rota padrão V1 para vertical slice / fallback.
 * Tempos = exemplos do material — sobrescritos por produto quando configurados.
 */
export const DEFAULT_PROCESS_ROUTE: ProcessRouteStep[] = [
  { stepType: "MIXING", sequence: 1, standardDurationMinutes: 12, lateToleranceMinutes: 2 },
  { stepType: "MODELING", sequence: 2, standardDurationMinutes: 20, lateToleranceMinutes: 5 },
  { stepType: "TRAYING", sequence: 3, standardDurationMinutes: 15, lateToleranceMinutes: 5 },
  { stepType: "PROOFING", sequence: 4, standardDurationMinutes: 300, lateToleranceMinutes: 15 },
  { stepType: "BAKING", sequence: 5, standardDurationMinutes: 14, lateToleranceMinutes: 2 },
  { stepType: "COOLING", sequence: 6, standardDurationMinutes: 60, lateToleranceMinutes: 10 },
  { stepType: "PACKAGING", sequence: 7, standardDurationMinutes: 40, lateToleranceMinutes: 10 },
];

export function cloneDefaultProcessRoute(): ProcessRouteStep[] {
  return DEFAULT_PROCESS_ROUTE.map((step) => ({ ...step }));
}

/** Rota efetiva: snapshot/produto ou default. */
export function resolveProcessRoute(
  route?: ProcessRouteStep[] | null,
): ProcessRouteStep[] {
  if (route && route.length > 0) {
    return [...route].sort((a, b) => a.sequence - b.sequence);
  }
  return cloneDefaultProcessRoute();
}

export function getStepDefinition(
  stepType: StepType,
  route?: ProcessRouteStep[] | null,
) {
  return resolveProcessRoute(route).find((s) => s.stepType === stepType);
}

export function getNextStepType(
  stepType: StepType,
  route?: ProcessRouteStep[] | null,
): StepType | null {
  const resolved = resolveProcessRoute(route);
  const current = resolved.find((s) => s.stepType === stepType);
  if (!current) return null;
  const next = resolved.find((s) => s.sequence === current.sequence + 1);
  return next?.stepType ?? null;
}

export function stepTypeLabel(stepType: StepType): string {
  const labels: Record<StepType, string> = {
    WEIGHING: "Pesagem",
    MIXING: "Amassamento",
    MODELING: "Modelagem",
    TRAYING: "Embandejamento",
    PROOFING: "Fermentação",
    BAKING: "Forneamento",
    COOLING: "Resfriamento",
    PACKAGING: "Embalagem",
  };
  return labels[stepType];
}

export type { ProcessRouteStep };
