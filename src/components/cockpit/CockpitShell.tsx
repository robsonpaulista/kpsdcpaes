"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Boxes,
  ClipboardList,
  Factory,
  FileBarChart2,
  LayoutDashboard,
  Link2,
  Package,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { BrandMark } from "@/components/shared/BrandMark";
import { ConnectionBadge } from "@/components/shared/ConnectionBadge";
import { FactoryRoleProvider, useFactoryRole } from "@/hooks/useFactoryRole";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { FactoryCapability } from "@/domain/access/roles";
import type { LucideIcon } from "lucide-react";

const NAV: ReadonlyArray<{
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  capability: FactoryCapability;
  exact?: boolean;
}> = [
  {
    href: "/app/cockpit",
    label: "Visão Geral",
    short: "Visão",
    icon: LayoutDashboard,
    capability: "viewCockpit",
    exact: true,
  },
  {
    href: "/app/cockpit/production",
    label: "Produção",
    short: "Prod.",
    icon: Factory,
    capability: "viewCockpit",
  },
  {
    href: "/app/products",
    label: "Produtos",
    short: "Itens",
    icon: Package,
    capability: "viewCockpit",
  },
  {
    href: "/app/equipment",
    label: "Equipamentos",
    short: "Equip.",
    icon: Wrench,
    capability: "viewCockpit",
  },
  {
    href: "/app/pcp",
    label: "PCP",
    short: "PCP",
    icon: ClipboardList,
    capability: "viewPcp",
  },
  {
    href: "/app/quality",
    label: "Qualidade",
    short: "Qual.",
    icon: ShieldCheck,
    capability: "viewQuality",
  },
  {
    href: "/app/traceability",
    label: "Rastreabilidade",
    short: "Rastr.",
    icon: Boxes,
    capability: "viewTraceability",
  },
  {
    href: "/app/reports",
    label: "Relatórios",
    short: "Relat.",
    icon: FileBarChart2,
    capability: "viewCockpit",
  },
  {
    href: "/app/settings",
    label: "Configurações",
    short: "Config.",
    icon: Settings,
    capability: "viewSettings",
  },
  {
    href: "/app/settings/integrations/dev",
    label: "Integração",
    short: "Integ.",
    icon: Link2,
    capability: "syncIntegration",
  },
];

function navActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === "/app/cockpit") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CockpitShellInner({ children }: { children: React.ReactNode }) {
  const { role, setRole, can, roles, roleLabel, canManageRoles } =
    useFactoryRole();
  const { user } = useRequireAuth();
  const pathname = usePathname();
  const visibleNav = NAV.filter((item) => can(item.capability));

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
  }

  return (
    <div className="dc-app-bg flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[76px] flex-col border-r border-dc-border/80 bg-dc-surface/95 backdrop-blur-sm lg:w-[232px]">
        <div className="flex h-16 items-center justify-center border-b border-dc-border/70 px-2 lg:justify-start lg:px-4">
          <span className="lg:hidden">
            <BrandMark href="/app/cockpit" size="sm" showWordmark={false} />
          </span>
          <span className="hidden lg:inline">
            <BrandMark href="/app/cockpit" size="sm" />
          </span>
        </div>

        <nav className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4 lg:px-3">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = navActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`group flex items-center gap-3 rounded-[12px] px-2 py-2.5 text-[11px] font-medium transition lg:px-3 lg:text-sm ${
                  active
                    ? "bg-dc-orange-soft text-dc-orange"
                    : "text-dc-text-secondary hover:bg-dc-surface-secondary hover:text-dc-text"
                }`}
              >
                <Icon
                  className={`mx-auto size-[18px] shrink-0 stroke-[1.75] lg:mx-0 ${
                    active ? "text-dc-orange" : "text-dc-text-muted group-hover:text-dc-text"
                  }`}
                  aria-hidden
                />
                <span className="hidden truncate lg:inline">{item.label}</span>
                <span className="sr-only lg:hidden">{item.short}</span>
              </Link>
            );
          })}

          <div className="my-2 border-t border-dc-border/70" />

          <Link
            href="/app/floor"
            title="Chão de fábrica"
            className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 text-[11px] font-semibold text-dc-orange transition hover:bg-dc-orange-soft lg:px-3 lg:text-sm"
          >
            <Factory
              className="mx-auto size-[18px] shrink-0 stroke-[1.75] lg:mx-0"
              aria-hidden
            />
            <span className="hidden lg:inline">Chão de fábrica</span>
            <span className="sr-only lg:hidden">Floor</span>
          </Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-dc-border/80 bg-dc-surface/90 px-3 py-2 backdrop-blur-md sm:px-5 lg:px-7">
          <div className="min-w-0">
            <p className="dc-eyebrow">Cockpit</p>
            <p className="truncate text-sm font-semibold tracking-tight text-dc-text">
              {user?.email ?? "Painel"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-dc-text-secondary sm:gap-3">
            {canManageRoles ? (
              <label className="flex items-center gap-1.5">
                <span className="hidden text-dc-text-muted md:inline">
                  Papel
                </span>
                <select
                  value={role}
                  onChange={(e) =>
                    void setRole(e.target.value as typeof role)
                  }
                  className="h-9 max-w-[8.5rem] rounded-[10px] border border-dc-border bg-dc-bg px-2 text-xs font-medium text-dc-text outline-none focus:border-dc-orange sm:max-w-[9.5rem]"
                  title="Altera factory_users (só ADMIN)"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="rounded-[10px] border border-dc-border bg-dc-bg px-2.5 py-1.5 text-[11px] font-semibold text-dc-text">
                {roleLabel}
              </span>
            )}
            <ConnectionBadge dense />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="h-9 rounded-[10px] border border-dc-border bg-dc-surface px-3 text-[11px] font-semibold text-dc-text-secondary transition hover:border-dc-text/20 hover:text-dc-text"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

export function CockpitShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate label="DC Pães · Cockpit">
      <FactoryRoleProvider>
        <CockpitShellInner>{children}</CockpitShellInner>
      </FactoryRoleProvider>
    </AuthGate>
  );
}
