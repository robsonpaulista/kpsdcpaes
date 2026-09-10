import type { StepType } from "@/types/production";

/**
 * Estações V1 para handoff no Floor.
 * Associação estação↔etapa é simplificada para o vertical slice —
 * layout físico real fica para validação operacional.
 */
export interface StationDefinition {
  id: string;
  label: string;
  stepType: StepType;
}

export const FACTORY_STATIONS: StationDefinition[] = [
  { id: "amassadeira-02", label: "Amassadeira 02", stepType: "MIXING" },
  { id: "modelagem-01", label: "Modelagem 01", stepType: "MODELING" },
  { id: "embandejamento-01", label: "Embandejamento 01", stepType: "TRAYING" },
  { id: "camara-01", label: "Câmara 01", stepType: "PROOFING" },
  { id: "forno-01", label: "Forno 01", stepType: "BAKING" },
  { id: "resfriamento-01", label: "Resfriamento 01", stepType: "COOLING" },
  { id: "embalagem-01", label: "Embalagem 01", stepType: "PACKAGING" },
];

export function getStation(id: string): StationDefinition | undefined {
  return FACTORY_STATIONS.find((s) => s.id === id);
}

export function getStationForStep(stepType: StepType): StationDefinition | undefined {
  return FACTORY_STATIONS.find((s) => s.stepType === stepType);
}
