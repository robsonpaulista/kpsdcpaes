"use client";

import { useFactoryConnection } from "@/hooks/useFactoryConnection";

/**
 * Indicador de conexão no Floor (Doc 07 §83, §85, §87).
 */
export function FloorConnectionBadge() {
  const { online } = useFactoryConnection();

  if (online) {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-success">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden />
        CONECTADO
      </span>
    );
  }

  return (
    <span
      className="inline-flex max-w-[12rem] shrink-0 flex-col items-end gap-0.5 rounded-[12px] bg-warning-soft px-2.5 py-1.5 text-right sm:max-w-none sm:flex-row sm:items-center sm:gap-2 sm:text-left"
      role="status"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-warning">
        <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden />
        SEM CONEXÃO
      </span>
      <span className="text-[10px] font-medium text-dc-text-muted">
        Tentando reconectar…
      </span>
    </span>
  );
}
