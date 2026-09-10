/**
 * Papéis conceituais (Doc 11 §23).
 * V1 = perfil local até reutilizar Firebase Auth existente.
 * Esconder botão ≠ autorização de dados (Doc 11 §24).
 */
export type FactoryRole =
  | "ADMIN"
  | "PCP"
  | "MANAGER"
  | "SUPERVISOR"
  | "OPERATOR"
  | "QUALITY"
  | "VIEWER";

export const FACTORY_ROLES: ReadonlyArray<{
  id: FactoryRole;
  label: string;
}> = [
  { id: "ADMIN", label: "Admin" },
  { id: "PCP", label: "PCP" },
  { id: "MANAGER", label: "Gestor" },
  { id: "SUPERVISOR", label: "Supervisor" },
  { id: "OPERATOR", label: "Operador" },
  { id: "QUALITY", label: "Qualidade" },
  { id: "VIEWER", label: "Somente leitura" },
];

export type FactoryCapability =
  | "viewCockpit"
  | "viewPcp"
  | "viewQuality"
  | "viewTraceability"
  | "viewSettings"
  | "executeFloor"
  | "releaseOrder"
  | "manageQuality"
  | "manageEquipment"
  | "manageLossReasons"
  | "manageCatalog"
  | "syncIntegration"
  | "manageUsers";

export const FACTORY_CAPABILITIES: ReadonlyArray<{
  id: FactoryCapability;
  label: string;
}> = [
  { id: "viewCockpit", label: "Ver Cockpit" },
  { id: "viewPcp", label: "Ver PCP" },
  { id: "viewQuality", label: "Ver Qualidade" },
  { id: "viewTraceability", label: "Ver Rastreabilidade" },
  { id: "viewSettings", label: "Ver Configurações" },
  { id: "executeFloor", label: "Executar chão de fábrica" },
  { id: "releaseOrder", label: "Liberar OP" },
  { id: "manageQuality", label: "Gerir qualidade / liberar lote" },
  { id: "manageEquipment", label: "Gerir equipamentos" },
  { id: "manageLossReasons", label: "Gerir motivos de perda" },
  { id: "manageCatalog", label: "Gerir produtos / mapeamentos" },
  { id: "syncIntegration", label: "Sincronizar integração" },
  { id: "manageUsers", label: "Gerir usuários / papéis" },
];

const ALL: FactoryCapability[] = FACTORY_CAPABILITIES.map((c) => c.id);

const BY_ROLE: Record<FactoryRole, FactoryCapability[]> = {
  ADMIN: ALL,
  MANAGER: [
    "viewCockpit",
    "viewPcp",
    "viewQuality",
    "viewTraceability",
    "viewSettings",
    "executeFloor",
    "releaseOrder",
    "manageQuality",
    "manageEquipment",
    "manageLossReasons",
    "manageCatalog",
  ],
  SUPERVISOR: [
    "viewCockpit",
    "viewPcp",
    "viewQuality",
    "viewTraceability",
    "viewSettings",
    "executeFloor",
    "releaseOrder",
    "manageQuality",
  ],
  PCP: [
    "viewCockpit",
    "viewPcp",
    "viewTraceability",
    "viewSettings",
    "releaseOrder",
    "manageCatalog",
  ],
  QUALITY: [
    "viewCockpit",
    "viewQuality",
    "viewTraceability",
    "viewSettings",
    "manageQuality",
  ],
  OPERATOR: ["viewCockpit", "executeFloor"],
  VIEWER: [
    "viewCockpit",
    "viewPcp",
    "viewQuality",
    "viewTraceability",
    "viewSettings",
  ],
};

export function roleHasCapability(
  role: FactoryRole,
  capability: FactoryCapability,
): boolean {
  return BY_ROLE[role].includes(capability);
}

export function roleLabel(role: FactoryRole): string {
  return FACTORY_ROLES.find((r) => r.id === role)?.label ?? role;
}

export function capabilitiesForRole(role: FactoryRole): FactoryCapability[] {
  return BY_ROLE[role];
}
