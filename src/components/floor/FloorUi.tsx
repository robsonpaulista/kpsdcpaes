"use client";

import type { ReactNode } from "react";

/** Cabeçalho padrão dos monitores por estação. */
export function FloorMonitorHeader({
  eyebrow,
  title,
  subtitle,
  onRefresh,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="floor-eyebrow">{eyebrow}</p>
        <h1 className="floor-title mt-1.5">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-dc-text-secondary">{subtitle}</p>
        ) : null}
      </div>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="h-10 rounded-[12px] border border-dc-border bg-dc-surface px-3 text-xs font-semibold text-dc-orange transition hover:bg-dc-orange-soft"
        >
          Atualizar
        </button>
      ) : null}
    </div>
  );
}

export function FloorEmptyState({
  title = "TUDO CERTO POR AQUI",
  detail,
  action,
}: {
  title?: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="floor-empty mt-6">
      <p className="text-lg font-semibold tracking-tight text-dc-text">{title}</p>
      <p className="mt-1.5 text-sm leading-snug text-dc-text-secondary">
        {detail}
      </p>
      {action ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
