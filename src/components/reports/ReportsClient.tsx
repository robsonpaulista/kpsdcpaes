"use client";

import Link from "next/link";
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Monitor,
  PackageCheck,
  ScanSearch,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";

/**
 * Relatórios (Doc 02 /app/reports).
 * V1: atalhos para visões operacionais já existentes.
 * Agregados por turno / dailyMetrics só depois de turno validado (Doc 09/11).
 */
type ReportLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: "live" | "quality" | "audit";
};

const LINKS: ReadonlyArray<ReportLink> = [
  {
    href: "/app/cockpit",
    title: "Pulso da fábrica",
    description: "Situação agora, atenção, fluxo ao vivo e aderência do dia.",
    icon: Activity,
    group: "live",
  },
  {
    href: "/app/cockpit/production",
    title: "Produção ao vivo",
    description: "Kanban por etapa, tempos e lotes em execução.",
    icon: ClipboardList,
    group: "live",
  },
  {
    href: "/display/production",
    title: "Display TV",
    description: "Painel de chão — visão instantânea por etapa e atrasos.",
    icon: Monitor,
    group: "live",
  },
  {
    href: "/app/quality",
    title: "Qualidade",
    description: "Visão geral: perdas, ocorrências e bloqueios.",
    icon: ShieldAlert,
    group: "quality",
  },
  {
    href: "/app/quality/losses",
    title: "Fila de perdas",
    description: "Perdas do chão ainda sem ocorrência de qualidade.",
    icon: TriangleAlert,
    group: "quality",
  },
  {
    href: "/app/quality/incidents",
    title: "Ocorrências",
    description: "Registros, resolução e liberação de lotes bloqueados.",
    icon: ClipboardCheck,
    group: "quality",
  },
  {
    href: "/app/traceability",
    title: "Rastreabilidade",
    description: "Histórico por lote: etapas, eventos, equipamentos.",
    icon: ScanSearch,
    group: "audit",
  },
  {
    href: "/app/settings/qa",
    title: "QA · Roteiro E2E",
    description: "Checklist guiado OP → lote → Floor → rastreabilidade.",
    icon: ClipboardCheck,
    group: "audit",
  },
  {
    href: "/app/pcp?tab=completed",
    title: "OPs concluídas",
    description: "Ordens finalizadas no PCP (aba Concluídas).",
    icon: PackageCheck,
    group: "audit",
  },
];

const GROUPS: ReadonlyArray<{
  id: ReportLink["group"];
  title: string;
  detail: string;
}> = [
  {
    id: "live",
    title: "Ao vivo",
    detail: "Situação da fábrica agora.",
  },
  {
    id: "quality",
    title: "Qualidade",
    detail: "Perdas, ocorrências e bloqueios.",
  },
  {
    id: "audit",
    title: "Auditoria",
    detail: "Rastreio, QA e histórico de OPs.",
  },
];

export function ReportsClient() {
  return (
    <div className="space-y-8">
      <CockpitPageHeader
        eyebrow="Visões"
        title="Relatórios"
        description="Nesta V1 os “relatórios” são as visões operacionais já conectadas ao domínio. Agregados por turno / período ficam para depois — o modelo de turno ainda não foi validado com a fábrica."
      />

      {GROUPS.map((group) => {
        const items = LINKS.filter((item) => item.group === group.id);
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
                      className="group flex h-full items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 transition-[background-color,border-color] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--surface-2)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--surface-2)] text-[var(--ink-2)] transition-colors duration-150 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-strong)]">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold tracking-tight text-[var(--ink)]">
                            {item.title}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)] transition-colors duration-150 group-hover:text-[var(--accent)]" />
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[var(--ink-2)]">
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

      <div className="dc-panel-muted border-dashed px-5 py-5">
        <p className="dc-eyebrow">Em espera</p>
        <p className="mt-1 text-sm font-semibold tracking-tight text-dc-text">
          Não inventar
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-dc-text-secondary">
          <li>Aderência por turno e comparativo vs. turno anterior</li>
          <li>
            Coleções <code className="text-dc-text">shiftMetrics</code> /{" "}
            <code className="text-dc-text">dailyMetrics</code> (Doc 09 / 11)
          </li>
          <li>Exportações e ranking só com base comparável definida</li>
        </ul>
      </div>
    </div>
  );
}
