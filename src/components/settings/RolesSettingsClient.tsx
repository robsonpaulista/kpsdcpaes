"use client";

import Link from "next/link";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  FACTORY_CAPABILITIES,
  FACTORY_ROLES,
  roleHasCapability,
} from "@/domain/access/roles";
import { useFactoryRole } from "@/hooks/useFactoryRole";

/**
 * Matriz de papéis (Doc 02 / Doc 11 §23–25).
 * Fonte do papel ativo: factory_users (ADMIN pode alterar).
 */
export function RolesSettingsClient() {
  const { role, roleLabel, setRole, roles, canManageRoles } = useFactoryRole();

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Acesso"
        title="Papéis"
        description="Modelo Admin · PCP · Gestor · Supervisor · Operador · Qualidade · Viewer. Papel em factory_users. A matriz espelha firestore.rules — esconder botão ≠ autorização de dados."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link
              href="/app/settings/users"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Usuários →
            </Link>
          </div>
        }
      />

      <div className="dc-panel flex flex-wrap items-center gap-3 px-5 py-4">
        <p className="dc-eyebrow">Seu papel</p>
        {canManageRoles ? (
          <select
            value={role}
            onChange={(e) =>
              void setRole(e.target.value as (typeof roles)[number]["id"])
            }
            className="h-10 rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm font-medium text-dc-text outline-none focus:border-dc-orange"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-[12px] border border-dc-border bg-dc-bg px-3 py-2 text-sm font-medium text-dc-text">
            {roleLabel}
          </span>
        )}
        <span className="text-xs tabular-nums text-dc-text-muted">({role})</span>
      </div>

      <div className="dc-panel overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dc-border text-dc-text-muted">
              <th className="sticky left-0 bg-dc-surface px-4 py-3 font-medium">
                Capacidade
              </th>
              {FACTORY_ROLES.map((r) => (
                <th
                  key={r.id}
                  className={`px-2 py-3 text-center font-medium ${
                    r.id === role ? "text-dc-orange" : ""
                  }`}
                >
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FACTORY_CAPABILITIES.map((cap) => (
              <tr
                key={cap.id}
                className="border-b border-dc-border/60 last:border-0"
              >
                <td className="sticky left-0 bg-dc-surface px-4 py-2.5 font-medium text-dc-text">
                  {cap.label}
                </td>
                {FACTORY_ROLES.map((r) => {
                  const ok = roleHasCapability(r.id, cap.id);
                  return (
                    <td
                      key={r.id}
                      className={`px-2 py-2.5 text-center tabular-nums ${
                        r.id === role ? "bg-dc-orange/5" : ""
                      }`}
                    >
                      <span
                        className={
                          ok
                            ? "font-semibold text-success"
                            : "text-dc-text-muted"
                        }
                      >
                        {ok ? "●" : "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-dc-text-muted">
        Atribuição de papéis: Configurações → Usuários. Rules publicadas: Viewer
        não grava em <code className="text-[10px]">factory_*</code>; só Admin
        altera papéis. Claims por capacidade ficam depois.
      </p>
    </div>
  );
}
