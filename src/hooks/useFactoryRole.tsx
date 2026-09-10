"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FACTORY_ROLES,
  roleHasCapability,
  roleLabel,
  type FactoryCapability,
  type FactoryRole,
} from "@/domain/access/roles";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getFirestoreDb,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { updateUserRole } from "@/repositories/users.repository";
import { ensureUserProfile } from "@/services/user-profile.service";
import type { FactoryUserProfile } from "@/types/access";

const DEFAULT_ROLE: FactoryRole = "VIEWER";

type FactoryRoleContextValue = {
  role: FactoryRole;
  roleLabel: string;
  profile: FactoryUserProfile | null;
  profileStatus: "loading" | "ready" | "error" | "signed_out";
  profileError: string | null;
  setRole: (role: FactoryRole) => Promise<void>;
  can: (capability: FactoryCapability) => boolean;
  canManageRoles: boolean;
  roles: typeof FACTORY_ROLES;
  /** Papel vem de factory_users — não é mais só localStorage. */
  isLocalProfile: false;
};

const FactoryRoleContext = createContext<FactoryRoleContextValue | null>(null);

function parseRole(raw: string | null | undefined): FactoryRole {
  if (!raw) return DEFAULT_ROLE;
  if (FACTORY_ROLES.some((r) => r.id === raw)) return raw as FactoryRole;
  return DEFAULT_ROLE;
}

export function FactoryRoleProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useRequireAuth();
  const [profile, setProfile] = useState<FactoryUserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    FactoryRoleContextValue["profileStatus"]
  >("loading");
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "loading") {
      setProfileStatus("loading");
      return;
    }
    if (authStatus !== "ready" || !user) {
      setProfile(null);
      setProfileError(null);
      setProfileStatus("signed_out");
      return;
    }
    if (!isFirebaseConfigured()) {
      setProfile(null);
      setProfileError("Firebase não configurado");
      setProfileStatus("error");
      return;
    }

    let cancelled = false;
    setProfileStatus("loading");
    void (async () => {
      try {
        const next = await ensureUserProfile(getFirestoreDb(), user);
        if (cancelled) return;
        setProfile(next);
        setProfileError(null);
        setProfileStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setProfileError(
          err instanceof Error ? err.message : "Falha ao carregar perfil",
        );
        setProfileStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, user]);

  const role = parseRole(profile?.role);

  const setRole = useCallback(
    async (next: FactoryRole) => {
      if (!user || !profile) return;
      if (!roleHasCapability(role, "manageUsers") && user.uid !== profile.uid) {
        return;
      }
      // Só ADMIN (manageUsers) altera papel — inclusive o próprio, para testes WIP
      if (!roleHasCapability(role, "manageUsers")) return;

      const updated = await updateUserRole(getFirestoreDb(), user.uid, next);
      if (updated) setProfile(updated);
    },
    [user, profile, role],
  );

  const canManageRoles = roleHasCapability(role, "manageUsers");

  const value = useMemo(
    () => ({
      role,
      roleLabel: roleLabel(role),
      profile,
      profileStatus,
      profileError,
      setRole,
      can: (capability: FactoryCapability) =>
        roleHasCapability(role, capability),
      canManageRoles,
      roles: FACTORY_ROLES,
      isLocalProfile: false as const,
    }),
    [
      role,
      profile,
      profileStatus,
      profileError,
      setRole,
      canManageRoles,
    ],
  );

  if (profileStatus === "loading" || authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dc-bg text-sm text-dc-text-secondary">
        Carregando perfil…
      </div>
    );
  }

  if (profileStatus === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-dc-bg px-6 text-center">
        <p className="text-sm font-semibold text-dc-text">
          Não foi possível carregar o perfil
        </p>
        <p className="max-w-md text-sm text-danger">{profileError}</p>
        <p className="max-w-md text-xs text-dc-text-muted">
          Confirme firestore.rules publicadas e coleção{" "}
          <code>factory_users</code>.
        </p>
      </div>
    );
  }

  return (
    <FactoryRoleContext.Provider value={value}>
      {children}
    </FactoryRoleContext.Provider>
  );
}

export function useFactoryRole(): FactoryRoleContextValue {
  const ctx = useContext(FactoryRoleContext);
  if (!ctx) {
    throw new Error("useFactoryRole deve ser usado dentro de FactoryRoleProvider");
  }
  return ctx;
}
