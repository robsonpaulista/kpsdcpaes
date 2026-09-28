import type { Firestore } from "firebase/firestore";
import { applyStepTimes } from "@/domain/production/process-route";
import {
  getStepTimesSettings,
  saveStepTimesSettings,
} from "@/repositories/process-settings.repository";
import type { ProcessRouteStep, Product } from "@/types/production";

/** Rota padrão da fábrica = DEFAULT_PROCESS_ROUTE + tempos configurados nas estações. */
export async function loadFactoryDefaultRoute(
  db: Firestore,
): Promise<ProcessRouteStep[]> {
  const settings = await getStepTimesSettings(db);
  return applyStepTimes(settings?.steps);
}

export async function loadFactoryStepTimes(db: Firestore): Promise<{
  steps: ProcessRouteStep[];
  updatedAt?: string;
  updatedBy?: string;
}> {
  const settings = await getStepTimesSettings(db);
  return {
    steps: applyStepTimes(settings?.steps),
    updatedAt: settings?.updatedAt,
    updatedBy: settings?.updatedBy,
  };
}

/** Rota usada ao liberar lote: produto (override por SKU) ou padrão da fábrica. */
export async function resolveRouteForProduct(
  db: Firestore,
  product: Product | null | undefined,
): Promise<ProcessRouteStep[]> {
  if (product?.processRoute?.length) {
    return [...product.processRoute].sort((a, b) => a.sequence - b.sequence);
  }
  return loadFactoryDefaultRoute(db);
}

export async function saveFactoryStepTimes(
  db: Firestore,
  steps: ProcessRouteStep[],
  updatedBy?: string,
): Promise<ProcessRouteStep[]> {
  for (const step of steps) {
    if (!Number.isFinite(step.standardDurationMinutes) || step.standardDurationMinutes < 1) {
      throw new Error("Tempo padrão deve ser de pelo menos 1 minuto.");
    }
    if (!Number.isFinite(step.lateToleranceMinutes) || step.lateToleranceMinutes < 0) {
      throw new Error("Tolerância não pode ser negativa.");
    }
  }
  const normalized = applyStepTimes(steps);
  await saveStepTimesSettings(db, {
    steps: normalized,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
  return normalized;
}
