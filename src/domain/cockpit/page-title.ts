import { COCKPIT_PLANT } from "@/domain/cockpit/plant-context";

/**
 * Título da topbar a partir da rota — mais específico primeiro.
 */
const PAGE_TITLES: ReadonlyArray<{ match: (path: string) => boolean; title: string }> = [
  {
    match: (p) => p.startsWith("/app/cockpit/production/lots/") && p !== "/app/cockpit/production/lots",
    title: "Detalhe do lote",
  },
  {
    match: (p) =>
      p.startsWith("/app/cockpit/production/orders/") &&
      p !== "/app/cockpit/production/orders",
    title: "Detalhe da ordem",
  },
  { match: (p) => p.startsWith("/app/cockpit/production/history"), title: "Histórico" },
  { match: (p) => p.startsWith("/app/cockpit/production/lots"), title: "Lotes" },
  { match: (p) => p.startsWith("/app/cockpit/production/orders"), title: "Ordens de produção" },
  { match: (p) => p.startsWith("/app/cockpit/production/overview"), title: "Visão Geral · Produção" },
  { match: (p) => p.startsWith("/app/cockpit/production"), title: "Produção ao vivo" },
  { match: (p) => p === "/app/cockpit" || p === "/app/cockpit/", title: "Visão Geral" },
  {
    match: (p) => p.startsWith("/app/products/") && p !== "/app/products",
    title: "Detalhe do produto",
  },
  { match: (p) => p.startsWith("/app/products"), title: "Produtos" },
  {
    match: (p) => p.startsWith("/app/equipment/") && p !== "/app/equipment",
    title: "Detalhe do equipamento",
  },
  { match: (p) => p.startsWith("/app/equipment"), title: "Equipamentos" },
  {
    match: (p) => p.startsWith("/app/pcp/orders/"),
    title: "Detalhe da OP",
  },
  { match: (p) => p.startsWith("/app/pcp"), title: "PCP / Programação" },
  { match: (p) => p.startsWith("/app/quality/losses"), title: "Perdas" },
  { match: (p) => p.startsWith("/app/quality/incidents"), title: "Ocorrências" },
  { match: (p) => p.startsWith("/app/quality/rework"), title: "Retrabalho" },
  { match: (p) => p.startsWith("/app/quality/rejections"), title: "Reprovações" },
  { match: (p) => p.startsWith("/app/quality"), title: "Qualidade" },
  {
    match: (p) => p.startsWith("/app/traceability/") && p !== "/app/traceability",
    title: "Rastreio do lote",
  },
  { match: (p) => p.startsWith("/app/traceability"), title: "Rastreabilidade" },
  { match: (p) => p.startsWith("/app/reports"), title: "Relatórios" },
  { match: (p) => p.startsWith("/app/settings/equipment"), title: "Equipamentos · cadastro" },
  { match: (p) => p.startsWith("/app/settings/loss-reasons"), title: "Motivos de perda" },
  { match: (p) => p.startsWith("/app/settings/stations"), title: "Estações" },
  {
    match: (p) => p.startsWith("/app/settings/integrations"),
    title: "Integração · Desenvolvimento",
  },
  { match: (p) => p.startsWith("/app/settings/qa"), title: "QA · Cenários MVP" },
  { match: (p) => p.startsWith("/app/settings/users"), title: "Usuários" },
  { match: (p) => p.startsWith("/app/settings/roles"), title: "Papéis" },
  { match: (p) => p.startsWith("/app/settings"), title: "Configurações" },
  { match: (p) => p.startsWith("/app/floor"), title: "Chão de fábrica" },
];

export function resolveCockpitPageTitle(pathname: string): string {
  const hit = PAGE_TITLES.find((entry) => entry.match(pathname));
  return hit?.title ?? "Cockpit";
}

/** Título da topbar: sistema + página. */
export function formatCockpitTopbarTitle(pageTitle: string): string {
  return `KPS DC Pães - ${pageTitle}`;
}

export function cockpitTopbarSubtitle(): string {
  return `${COCKPIT_PLANT.unitLabel} · ${COCKPIT_PLANT.shiftLabel}`;
}
