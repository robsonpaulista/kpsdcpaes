"use client";

import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { Alert, Button, Card, StatTile } from "@/components/ui";
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
        title="Qualidade"
        description="Perdas do chão entram na fila. A ocorrência é o registro do setor."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/app/settings/loss-reasons" variant="secondary" size="sm">
              Motivos de perda →
            </Button>
            <Button href="/app/settings/qa" variant="secondary" size="sm">
              QA →
            </Button>
          </div>
        }
      />
      {!canManage ? (
        <AccessDeniedNote action="registrar/liberar ocorrências" />
      ) : null}

      {error ? <Alert tone="critical">{error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="px-4 py-4">
          <StatTile
            label="Perdas sem ocorrência"
            value={loading ? "…" : pendingSignals.length}
            tone={
              !loading && pendingSignals.length > 0 ? "warning" : "ink"
            }
            className="border-0 p-0"
          />
          <Button href="/app/quality/losses" variant="ghost" size="sm" className="mt-3 px-0">
            Abrir fila →
          </Button>
        </Card>
        <Card className="px-4 py-4">
          <StatTile
            label="Ocorrências abertas"
            value={loading ? "…" : openCount}
            className="border-0 p-0"
          />
          <Button href="/app/quality/incidents" variant="ghost" size="sm" className="mt-3 px-0">
            Ver ocorrências →
          </Button>
        </Card>
        <Card className="px-4 py-4">
          <StatTile
            label="Lotes com bloqueio"
            value={loading ? "…" : blockedOpen}
            tone={!loading && blockedOpen > 0 ? "critical" : "ink"}
            className="border-0 p-0"
          />
          <Button href="/app/quality/incidents" variant="ghost" size="sm" className="mt-3 px-0">
            Liberar / resolver →
          </Button>
        </Card>
      </div>

      <Card className="border-dashed bg-[var(--surface-2)] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Disponível após validação da fábrica
        </p>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          Retrabalho e reprovações entram quando os critérios oficiais forem
          definidos. Até lá, use perdas e ocorrências.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button href="/app/quality/rework" variant="ghost" size="sm" className="px-0">
            Retrabalho →
          </Button>
          <Button href="/app/quality/rejections" variant="ghost" size="sm" className="px-0">
            Reprovações →
          </Button>
        </div>
      </Card>
    </div>
  );
}
