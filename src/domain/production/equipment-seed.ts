import type { Equipment, EquipmentType } from "@/types/equipment";
import type { StepType } from "@/types/production";

/**
 * Catálogo inicial com códigos do material (Doc 04 / 08).
 * Não são motivos/processos inventados — são exemplos documentados.
 * Layout físico real e mais equipamentos ficam para validação operacional.
 */
export interface EquipmentSeed {
  id: string;
  code: string;
  name: string;
  type: EquipmentType;
  stationId?: string;
  applicableStepTypes: StepType[];
}

export const EQUIPMENT_SEED: EquipmentSeed[] = [
  {
    id: "eq_am01",
    code: "AM01",
    name: "Amassadeira 01",
    type: "MIXER",
    stationId: "amassadeira-02",
    applicableStepTypes: ["MIXING"],
  },
  {
    id: "eq_am02",
    code: "AM02",
    name: "Amassadeira 02",
    type: "MIXER",
    stationId: "amassadeira-02",
    applicableStepTypes: ["MIXING"],
  },
  {
    id: "eq_md01",
    code: "MD01",
    name: "Modeladora 01",
    type: "MODELER",
    stationId: "modelagem-01",
    applicableStepTypes: ["MODELING"],
  },
  {
    id: "eq_cf01",
    code: "CF01",
    name: "Câmara de fermentação 01",
    type: "PROOFING_CHAMBER",
    stationId: "camara-01",
    applicableStepTypes: ["PROOFING"],
  },
  {
    id: "eq_fo01",
    code: "FO01",
    name: "Forno 01",
    type: "OVEN",
    stationId: "forno-01",
    applicableStepTypes: ["BAKING"],
  },
  {
    id: "eq_fo02",
    code: "FO02",
    name: "Forno 02",
    type: "OVEN",
    stationId: "forno-01",
    applicableStepTypes: ["BAKING"],
  },
  {
    id: "eq_em01",
    code: "EM01",
    name: "Linha de embalagem 01",
    type: "PACKAGING_LINE",
    stationId: "embalagem-01",
    applicableStepTypes: ["PACKAGING"],
  },
];

export function equipmentFromSeed(
  seed: EquipmentSeed,
  nowIso: string,
): Equipment {
  return {
    id: seed.id,
    code: seed.code,
    name: seed.name,
    type: seed.type,
    stationId: seed.stationId,
    applicableStepTypes: seed.applicableStepTypes,
    status: "AVAILABLE",
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
