"use client";

import Link from "next/link";
import {
  Cable,
  ChevronRight,
  ClipboardCheck,
  Shield,
  Tablet,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { useFactoryRole } from "@/hooks/useFactoryRole";

type SettingsNeed = "viewSettings" | "syncIntegration";

type SettingsLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  need?: SettingsNeed;
  group: "catalog" | "access" | "ops";
};

const LINKS: ReadonlyArray<SettingsLink> = [
  {
    href: "/app/settings/stations",
    title: "Estações",
    description: "Tablets e etapas — catálogo V1 (leitura).",
    icon: Tablet,
    need: "viewSettings",
    group: "catalog",
  },
  {
    href: "/app/settings/equipment",
    title: "Equipamentos",
    description: "Semear catálogo · visão operacional em /app/equipment.",
    icon: Wrench,
    need: "viewSettings",
    group: "catalog",
  },
  {
    href: "/app/settings/loss-reasons",
    title: "Motivos de perda",
    description: "Catálogo configurável — sem motivos inventados.",
    icon: TriangleAlert,
    need: "viewSettings",
    group: "catalog",
  },
  {
    href: "/app/settings/roles",
    title: "Papéis",
    description: "Matriz de permissões + espelho nas Firestore rules.",
    icon: Shield,
    need: "viewSettings",
    group: "access",
  },
  {
    href: "/app/settings/users",
    title: "Usuários",
    description: "Perfis em factory_users — ADMIN atribui papéis.",
    icon: Users,
    need: "viewSettings",
    group: "access",
  },
  {
    href: "/app/settings/integrations/dev",
    title: "Integração (dev)",
    description: "Sync mock, estado da layer e firestore.rules.",
    icon: Cable,
    need: "syncIntegration",
    group: "ops",
  },
  {
    href: "/app/settings/qa",
    title: "QA · Cenários MVP",
    description: "Roteiro E2E + casos de borda antes do go-live.",
    icon: ClipboardCheck,
    need: "viewSettings",
    group: "ops",
  },
];

const GROUPS: ReadonlyArray<{
  id: SettingsLink["group"];
  title: string;
  detail: string;
}> = [
  {
    id: "catalog",
    title: "Catálogo",
    detail: "Estações, equipamentos e motivos de perda.",
  },
  {
    id: "access",
    title: "Acesso",
    detail: "Papéis e usuários do Factory OS.",
  },
  {
    id: "ops",
    title: "Operação",
    detail: "Integração de OPs e checklist de QA.",
  },
];

export function SettingsHubClient() {
  const { can } = useFactoryRole();

  const visible = LINKS.filter((item) => {
    if (!item.need) return true;
    return can(item.need);
  });

  return (
    <div className="space-y-8">
      <CockpitPageHeader
        eyebrow="Setup"
        title="Configurações"
        description="Setup do Factory OS. O que aparece depende do seu papel em factory_users (Auth corporativo ativo)."
      />

      {visible.length === 0 ? (
        <CockpitEmpty
          title="Sem acesso às configurações"
          detail="Este perfil não tem permissão para ver o setup. Peça a um admin para ajustar factory_users."
        />
      ) : (
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const items = visible.filter((item) => item.group === group.id);
            if (items.length === 0) return null;
            return (
              <section key={group.id} className="space-y-3">
                <div>
                  <p className="dc-eyebrow">{group.title}</p>
                  <p className="mt-1 text-sm text-dc-text-secondary">
                    {group.detail}
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="group dc-panel flex items-start gap-3 px-4 py-4 transition hover:border-dc-orange/35 hover:shadow-dc-md"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-dc-surface-secondary text-dc-text transition group-hover:bg-dc-orange/10 group-hover:text-dc-orange">
                            <Icon className="h-5 w-5" strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold tracking-tight text-dc-text">
                                {item.title}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-dc-text-muted transition group-hover:translate-x-0.5 group-hover:text-dc-orange" />
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-dc-text-secondary">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
