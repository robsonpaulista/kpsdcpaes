"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { TEMP_ADMIN } from "@/domain/access/temp-admin";
import {
  FACTORY_ROLES,
  type FactoryRole,
} from "@/domain/access/roles";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import {
  getFirebaseAuth,
  getFirebaseStatus,
  getFirestoreDb,
  getPublicProjectId,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import {
  listUserProfiles,
  updateUserRole,
} from "@/repositories/users.repository";
import type { FactoryUserProfile } from "@/types/access";

/**
 * Doc 02 /app/settings/users + Doc 11 §22–23.
 * Lista factory_users; ADMIN atribui papéis.
 */
export function UsersSettingsClient() {
  const { can, role: myRole, setRole } = useFactoryRole();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<FactoryUserProfile[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const status = getFirebaseStatus();
  const projectId = getPublicProjectId();
  const canManage = can("manageUsers");

  const reload = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    try {
      setProfiles(await listUserProfiles(getFirestoreDb()));
      setListError(null);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Falha ao listar usuários",
      );
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthReady(true);
      return;
    }
    try {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(
        auth,
        (next) => {
          setUser(next && !next.isAnonymous ? next : null);
          setAuthReady(true);
          setAuthError(null);
        },
        (err) => {
          setAuthError(err.message);
          setAuthReady(true);
        },
      );
      return () => unsub();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Falha no Auth");
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleRoleChange(uid: string, next: FactoryRole) {
    if (!canManage) return;
    setBusyUid(uid);
    try {
      await updateUserRole(getFirestoreDb(), uid, next);
      if (uid === user?.uid) {
        await setRole(next);
      }
      await reload();
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Falha ao atualizar papel",
      );
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Acesso"
        title="Usuários"
        description="Auth = Firebase. Papel = factory_users. Sem segundo sistema de senha."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link
              href="/app/settings/roles"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Papéis →
            </Link>
          </div>
        }
      />

      <section className="dc-panel px-5 py-5">
        <h2 className="text-sm font-semibold tracking-tight text-dc-text">
          Sessão atual
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-dc-text-secondary">Firebase client</dt>
            <dd className="font-medium text-dc-text">
              {status === "ready" && "Configurado"}
              {status === "missing_config" && "Falta .env.local"}
              {status === "init_error" && "Erro ao inicializar"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-dc-text-secondary">Project ID</dt>
            <dd className="font-medium tabular-nums text-dc-text">
              {projectId ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-dc-text-secondary">Usuário</dt>
            <dd className="font-medium text-dc-text">
              {!authReady ? "…" : (user?.email ?? "—")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-dc-text-secondary">Papel</dt>
            <dd className="font-medium text-dc-text">{myRole}</dd>
          </div>
        </dl>
        {authError ? (
          <p className="mt-3 text-sm text-danger">{authError}</p>
        ) : null}
      </section>

      <section className="dc-panel px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-dc-text">
            Perfis em factory_users
          </h2>
          <button
            type="button"
            onClick={() => void reload()}
            className="dc-btn-secondary h-9 px-3 text-xs"
          >
            Atualizar
          </button>
        </div>
        {!canManage ? (
          <p className="mt-2 text-xs text-dc-text-muted">
            Somente ADMIN altera papéis. Você vê a lista em modo leitura.
          </p>
        ) : null}
        {listError ? (
          <p className="mt-3 text-sm text-danger">{listError}</p>
        ) : null}
        {profiles.length === 0 ? (
          <p className="mt-3 text-sm text-dc-text-secondary">
            Nenhum perfil ainda. Entre de novo no Cockpit para criar o seu.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-dc-border">
            {profiles.map((p) => (
              <li
                key={p.uid}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-dc-text">
                    {p.email ?? p.uid}
                  </p>
                  <p className="truncate text-xs text-dc-text-muted">{p.uid}</p>
                </div>
                {canManage ? (
                  <select
                    value={p.role}
                    disabled={busyUid === p.uid}
                    onChange={(e) =>
                      void handleRoleChange(
                        p.uid,
                        e.target.value as FactoryRole,
                      )
                    }
                    className="h-9 rounded-lg border border-dc-border bg-dc-bg px-2 text-xs font-medium text-dc-text outline-none focus:border-dc-orange"
                  >
                    {FACTORY_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-dc-text">
                    {p.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[14px] border border-dashed border-dc-border bg-dc-surface p-5">
        <p className="text-sm font-semibold text-dc-text">{TEMP_ADMIN.label}</p>
        <p className="mt-2 font-medium tabular-nums text-dc-text">
          {TEMP_ADMIN.email} · {TEMP_ADMIN.password}
        </p>
        <p className="mt-2 text-xs text-dc-text-muted">
          Bootstrap cria perfil ADMIN. Rules: VIEWER só lê; troca de papel exige
          ADMIN. Publique com{" "}
          <code className="text-[10px]">npm run deploy:firestore</code>. Claims
          Firebase ficam para o Auth corporativo definitivo.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/app/settings/roles" className="font-medium text-dc-orange">
          Matriz de papéis →
        </Link>
        <Link href="/login" className="font-medium text-dc-orange">
          Tela de login →
        </Link>
      </div>
    </div>
  );
}
