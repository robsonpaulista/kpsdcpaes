"use client";

import { useFactoryConnection } from "@/hooks/useFactoryConnection";

type ConnectionBadgeProps = {
  /** Floor usa tom mais operacional; Cockpit/Display mais compacto. */
  dense?: boolean;
  /** Display em fundo escuro. */
  onDark?: boolean;
};

/**
 * Indicador de conexão (Doc 07 §83–87).
 * Sem menção a Firebase na UX.
 */
export function ConnectionBadge({ dense, onDark }: ConnectionBadgeProps) {
  const { online } = useFactoryConnection();

  if (online) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          onDark ? "text-white/60" : "text-dc-text-secondary"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        Conectado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        onDark ? "text-warning" : "text-warning"
      }`}
      role="status"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
      {dense ? (
        "Sem conexão"
      ) : (
        <span>
          Sem conexão
          <span
            className={`ml-1 font-normal ${onDark ? "text-white/45" : "text-dc-text-muted"}`}
          >
            · Tentando reconectar…
          </span>
        </span>
      )}
    </span>
  );
}
