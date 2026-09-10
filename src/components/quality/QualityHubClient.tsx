"use client";

import Link from "next/link";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { useQualityBoard } from "@/hooks/useQualityBoard";

/**
 * Hub Qualidade (Doc 02 §69) — resumo + atalhos para subrotas.
 */
export function QualityHubClient() {
  const { can } = useFactoryRole();
  const canManage = can("manageQuality");
  const {
    pendingSignals,
    openCount,
    blockedOpen,
    loading,
    error,
  } = useQualityBoard();

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Qualidade"
        title="Visão geral"
        description="Perdas do chão entram na fila. A ocorrência é o registro do setor."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/settings/loss-reasons"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Motivos de perda →
            </Link>
            <Link
              href="/app/settings/qa"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              QA →
            </Link>
          </div>
        }
      />
      {!canManage ? (
        <AccessDeniedNote action="registrar/liberar ocorrências" />
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dc-panel px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Perdas sem ocorrência
          </p>
          <p className="dc-metric mt-2 text-dc-text">
            {loading ? "…" : pendingSignals.length}
          </p>
          <Link
            href="/app/quality/losses"
            className="mt-3 inline-block text-sm font-semibold text-dc-orange"
          >
            Abrir fila →
          </Link>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Ocorrências abertas
          </p>
          <p className="dc-metric mt-2 text-dc-text">
            {loading ? "…" : openCount}
          </p>
          <Link
            href="/app/quality/incidents"
            className="mt-3 inline-block text-sm font-semibold text-dc-orange"
          >
            Ver ocorrências →
          </Link>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Lotes com bloqueio
          </p>
          <p className="dc-metric mt-2 text-dc-text">
            {loading ? "…" : blockedOpen}
          </p>
          <Link
            href="/app/quality/incidents"
            className="mt-3 inline-block text-sm font-semibold text-dc-orange"
          >
            Liberar / resolver →
          </Link>
        </div>
      </div>

      <div className="dc-panel border-dashed bg-dc-surface-secondary/40 px-4 py-4">
        <p className="text-sm font-semibold text-dc-text">
          Disponível após validação da fábrica
        </p>
        <p className="mt-1 text-xs text-dc-text-secondary">
          Retrabalho e reprovações entram quando os critérios oficiais forem
          definidos. Até lá, use perdas e ocorrências.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/app/quality/rework" className="font-semibold text-dc-orange">
            Retrabalho →
          </Link>
          <Link
            href="/app/quality/rejections"
            className="font-semibold text-dc-orange"
          >
            Reprovações →
          </Link>
        </div>
      </div>
    </div>
  );
}
