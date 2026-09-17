"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  Boxes,
  ChevronRight,
  ClipboardList,
  Factory,
  FileBarChart2,
  LayoutDashboard,
  Link2,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ConnectionBadge } from "@/components/shared/ConnectionBadge";
import {
  resolveCockpitPageTitle,
} from "@/domain/cockpit/page-title";
import { formatLiveStamp } from "@/domain/cockpit/format-dashboard";
import { FactoryRoleProvider, useFactoryRole } from "@/hooks/useFactoryRole";
import {
  CockpitPageTitleProvider,
  useCockpitPageTitleState,
} from "@/hooks/useCockpitPageTitle";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { FactoryCapability } from "@/domain/access/roles";
import type { LucideIcon } from "lucide-react";

const SIDEBAR_KEY = "dc_cockpit_sidebar_collapsed";
const NARROW_MQ = "(max-width: 859px)";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  capability: FactoryCapability;
  exact?: boolean;
};

const NAV_OPS: ReadonlyArray<NavItem> = [
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
];

const NAV_ADMIN: ReadonlyArray<NavItem> = [
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

function readCollapsedPreference(): boolean | null {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function userInitials(email: string | null | undefined): string {
  if (!email) return "DC";
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function CockpitShellInner({ children }: { children: React.ReactNode }) {
  const { role, setRole, can, roles, roleLabel, canManageRoles } =
    useFactoryRole();
  const { user } = useRequireAuth();
  const pathname = usePathname();
  const opsNav = NAV_OPS.filter((item) => can(item.capability));
  const adminNav = NAV_ADMIN.filter((item) => can(item.capability));

  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [stamp, setStamp] = useState(() => formatLiveStamp());

  useEffect(() => {
    const pref = readCollapsedPreference();
    const narrow = window.matchMedia(NARROW_MQ).matches;
    setCollapsed(pref ?? narrow);
    setReady(true);

    const mq = window.matchMedia(NARROW_MQ);
    const onChange = () => {
      const stored = readCollapsedPreference();
      if (stored != null) {
        setCollapsed(stored);
        return;
      }
      setCollapsed(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setStamp(formatLiveStamp()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
  }

  const expanded = ready ? !collapsed : true;
  const initials = userInitials(user?.email);
  const pageTitleOverride = useCockpitPageTitleState().pageTitle;
  const pageTitle =
    pageTitleOverride ?? resolveCockpitPageTitle(pathname);

  function renderNav(items: ReadonlyArray<NavItem>) {
    return items.map((item) => {
      const Icon = item.icon;
      const active = navActive(pathname, item.href, item.exact);
      return (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          data-active={active ? "true" : "false"}
          className="dc-sidebar-nav-item"
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {expanded ? (
            <span className="truncate">{item.label}</span>
          ) : (
            <span className="sr-only">{item.short}</span>
          )}
        </Link>
      );
    });
  }

  return (
    <div className="dc-app-bg flex h-dvh overflow-hidden">
      <aside
        className="dc-sidebar"
        data-collapsed={expanded ? "false" : "true"}
        aria-label="Navegação do Cockpit"
      >
        <div className="dc-sidebar-header justify-center px-2">
          <Link
            href="/app/cockpit"
            className="inline-flex items-center justify-center transition hover:opacity-90"
            title="KPS DC Pães"
          >
            <Image
              src="/brand/logomarca-white.png"
              alt="DC Pães"
              width={expanded ? 56 : 36}
              height={expanded ? 74 : 48}
              className={
                expanded ? "h-11 w-auto object-contain" : "h-8 w-auto object-contain"
              }
              priority
            />
          </Link>
        </div>

        <nav
          className={`mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto pb-3 ${
            expanded ? "px-2.5" : "px-1.5"
          }`}
        >
          {renderNav(opsNav)}

          {adminNav.length > 0 ? (
            <>
              <div className="dc-sidebar-divider" />
              {renderNav(adminNav)}
            </>
          ) : null}

          <div className="dc-sidebar-divider" />

          <Link
            href="/app/floor"
            title="Chão de fábrica"
            className="dc-sidebar-nav-item"
          >
            <Factory className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {expanded ? (
              <span className="truncate">Chão de fábrica</span>
            ) : (
              <span className="sr-only">Floor</span>
            )}
          </Link>
        </nav>

        <div
          className={`mt-auto border-t p-2 ${
            expanded ? "px-2.5" : "px-1.5"
          }`}
          style={{ borderColor: "#4a3428" }}
        >
          <div
            className={`mb-1.5 flex items-center ${
              expanded ? "gap-2.5 px-1.5 py-1" : "justify-center py-1"
            }`}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-normal text-white"
              style={{
                background: "#563f30",
                border: "1px solid #4a3428",
              }}
              title={user?.email ?? "Usuário"}
            >
              {initials}
            </span>
            {expanded ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-normal text-white">
                  {user?.email?.split("@")[0] ?? "Usuário"}
                </p>
                <p className="truncate text-[10px] text-white">
                  {roleLabel}
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="dc-sidebar-nav-item w-full"
            aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            aria-expanded={expanded}
            title={expanded ? "Recolher menu" : "Expandir menu"}
          >
            {expanded ? (
              <>
                <PanelLeftClose className="size-4 shrink-0" strokeWidth={1.75} />
                <span>Recolher</span>
              </>
            ) : (
              <PanelLeftOpen className="size-4 shrink-0" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="dc-topbar shrink-0">
          <div className="flex min-w-0 items-center gap-2.5">
            {!expanded ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-dc-border text-dc-text-secondary transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-dc-text min-[860px]:hidden"
                aria-label="Expandir menu"
                title="Expandir menu"
              >
                <ChevronRight className="size-4" strokeWidth={2} />
              </button>
            ) : null}
            <div className="min-w-0 leading-tight">
              <p className="dc-topbar-title truncate">{pageTitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <ConnectionBadge dense liveLabel />
              <span className="font-mono text-[11px] tabular-nums text-dc-text-secondary">
                {stamp}
              </span>
            </div>
            <div className="sm:hidden">
              <ConnectionBadge dense liveLabel />
            </div>
            {canManageRoles ? (
              <label className="flex items-center gap-1.5">
                <span className="hidden text-xs text-dc-text-muted md:inline">
                  Papel
                </span>
                <select
                  value={role}
                  onChange={(e) =>
                    void setRole(e.target.value as typeof role)
                  }
                  className="h-8 max-w-[8.5rem] rounded-[10px] border border-dc-border bg-[var(--bg)] px-2 text-xs font-medium text-dc-text outline-none focus:border-accent sm:max-w-[9.5rem]"
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
              <span className="rounded-[10px] border border-dc-border bg-[var(--bg)] px-2.5 py-1 text-[11px] font-semibold text-dc-text">
                {roleLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="h-8 rounded-[10px] border border-dc-border bg-dc-surface px-3 text-[11px] font-semibold text-dc-text-secondary transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-dc-text"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}

export function CockpitShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate label="DC Pães · Cockpit">
      <FactoryRoleProvider>
        <CockpitPageTitleProvider>
          <CockpitShellInner>{children}</CockpitShellInner>
        </CockpitPageTitleProvider>
      </FactoryRoleProvider>
    </AuthGate>
  );
}
