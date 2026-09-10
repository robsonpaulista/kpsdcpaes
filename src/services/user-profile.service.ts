import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { isTempAdminEmail } from "@/domain/access/temp-admin";
import type { FactoryRole } from "@/domain/access/roles";
import {
  getUserProfile,
  upsertUserProfile,
} from "@/repositories/users.repository";
import type { FactoryUserProfile } from "@/types/access";

const DEFAULT_NEW_USER_ROLE: FactoryRole = "VIEWER";

function defaultRoleForAuthUser(user: User): FactoryRole {
  if (isTempAdminEmail(user.email)) return "ADMIN";
  return DEFAULT_NEW_USER_ROLE;
}

/**
 * Garante factory_users/{uid} após login.
 * Admin temporário → ADMIN; demais → VIEWER até um admin atribuir papel.
 */
export async function ensureUserProfile(
  db: Firestore,
  user: User,
): Promise<FactoryUserProfile> {
  const existing = await getUserProfile(db, user.uid);
  if (existing) {
    const email = user.email ?? existing.email;
    const displayName = user.displayName ?? existing.displayName;
    if (email !== existing.email || displayName !== existing.displayName) {
      return upsertUserProfile(db, {
        ...existing,
        email,
        displayName,
      });
    }
    // Promoção única do admin WIP se perfil antigo veio como VIEWER
    if (isTempAdminEmail(user.email) && existing.role !== "ADMIN") {
      return upsertUserProfile(db, {
        ...existing,
        role: "ADMIN",
        roleIds: ["ADMIN"],
      });
    }
    return existing;
  }

  const role = defaultRoleForAuthUser(user);
  return upsertUserProfile(db, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role,
    roleIds: [role],
    stationIds: [],
    active: true,
  });
}
