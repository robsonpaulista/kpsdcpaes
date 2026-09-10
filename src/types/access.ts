import type { FactoryRole } from "@/domain/access/roles";

/**
 * Perfil Factory OS (Doc 04 §40) — uid = Firebase Auth.
 * Papel V1 único em `role`; `roleIds` espelha para alinhar ao modelo.
 */
export type FactoryUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: FactoryRole;
  roleIds: FactoryRole[];
  stationIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
