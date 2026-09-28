import type {
  Equipment,
  EquipmentCapacityUnit,
  EquipmentType,
} from "@/types/equipment";

export const EQUIPMENT_TYPES: EquipmentType[] = [
  "MIXER",
  "MODELER",
  "TRAYING_STATION",
  "PROOFING_CHAMBER",
  "OVEN",
  "COOLING_RACK",
  "PACKAGING_LINE",
  "OTHER",
];

export const EQUIPMENT_CAPACITY_UNITS: EquipmentCapacityUnit[] = [
  "KG",
  "KG_PER_HOUR",
  "UNITS",
  "UNITS_PER_HOUR",
  "TRAYS",
  "RACKS",
];

export function equipmentTypeLabel(type: string): string {
  switch (type) {
    case "MIXER":
      return "Amassadeira";
    case "MODELER":
      return "Modeladora";
    case "TRAYING_STATION":
      return "Bancada de embandejamento";
    case "PROOFING_CHAMBER":
      return "Câmara";
    case "OVEN":
      return "Forno";
    case "COOLING_RACK":
      return "Resfriamento";
    case "PACKAGING_LINE":
      return "Linha de embalagem";
    case "OTHER":
      return "Outro";
    default:
      return type;
  }
}

export function equipmentCapacityUnitLabel(unit: EquipmentCapacityUnit): string {
  const labels: Record<EquipmentCapacityUnit, string> = {
    KG: "kg por ciclo",
    KG_PER_HOUR: "kg/h",
    UNITS: "unidades por ciclo",
    UNITS_PER_HOUR: "un/h",
    TRAYS: "bandejas",
    RACKS: "carrinhos",
  };
  return labels[unit];
}

export function formatEquipmentCapacity(
  equipment: Pick<Equipment, "capacity" | "capacityUnit">,
): string | null {
  if (equipment.capacity == null) return null;
  const value = equipment.capacity.toLocaleString("pt-BR");
  return equipment.capacityUnit
    ? `${value} ${equipmentCapacityUnitLabel(equipment.capacityUnit)}`
    : value;
}

export function equipmentStatusLabel(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "DISPONÍVEL";
    case "OPERATING":
      return "OPERANDO";
    case "WAITING":
      return "AGUARDANDO";
    case "STOPPED":
      return "PARADO";
    case "MAINTENANCE":
      return "MANUTENÇÃO";
    case "UNAVAILABLE":
      return "INDISPONÍVEL";
    default:
      return status;
  }
}
