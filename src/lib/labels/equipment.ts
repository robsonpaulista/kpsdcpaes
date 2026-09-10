export function equipmentTypeLabel(type: string): string {
  switch (type) {
    case "MIXER":
      return "Amassadeira";
    case "MODELER":
      return "Modeladora";
    case "PROOFING_CHAMBER":
      return "Câmara";
    case "OVEN":
      return "Forno";
    case "PACKAGING_LINE":
      return "Linha de embalagem";
    default:
      return type;
  }
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
