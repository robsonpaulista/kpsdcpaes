"use client";

import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  StatTile,
  StatusBadge,
} from "@/components/ui";
import { stepTypeLabel } from "@/domain/production/process-route";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { useQualityBoard } from "@/hooks/useQualityBoard";
import type { StepType } from "@/types/production";
import type { QualityLossSignal } from "@/types/quality";

function incidentHrefFromLoss(signal: QualityLossSignal): string {
  const params = new URLSearchParams({
    lot: signal.lotCode,
    stepRun: signal.stepRunId,
    qty: String(signal.lossQuantity),
    step: signal.stepType,
  });
  if (signal.lossReason) params.set("reason", signal.lossReason);
  return `/app/quality/incidents?${params.toString()}`;
}

/** Fila de perdas (Doc 02 §70 / `/app/quality/losses`). */
export function QualityLossesClient() {
  const { can } = useFactoryRole();
  const canManage = can("manageQuality");
  const { signals, pendingSignals, productNames, loading, error, load } =
    useQualityBoard();

  const withIncident = signals.filter((s) => s.hasIncident).length;

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Qualidade"
        title="Perdas"
        description="Apontadas nas estações ao finalizar etapa. Ainda não são ocorrência — registre aqui para fechar o ciclo."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Atualizar
            </Button>
            <Button href="/app/quality/incidents" variant="secondary" size="sm">
              Ocorrências →
            </Button>
            <Button href="/app/settings/loss-reasons" variant="secondary" size="sm">
              Motivos →
            </Button>
          </div>
        }
      />

      {!canManage ? (
        <AccessDeniedNote action="registrar ocorrência a partir da perda" />
      ) : null}

      {error ? <Alert tone="critical">{error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Pendentes"
          value={loading ? "…" : pendingSignals.length}
          tone={!loading && pendingSignals.length > 0 ? "warning" : "ink"}
        />
        <StatTile
          label="Com ocorrência"
          value={loading ? "…" : withIncident}
        />
      </div>

      <Card className="border-dashed bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-2)]">
        <p className="font-semibold text-[var(--ink)]">QA · caso de borda</p>
        <p className="mt-1">
          No Floor, finalize uma etapa com perda + motivo. A linha aparece aqui;
          em seguida registre a ocorrência.
        </p>
        <Button href="/app/floor" variant="ghost" size="sm" className="mt-2 px-0">
          Abrir Floor →
        </Button>
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
      ) : pendingSignals.length === 0 ? (
        <EmptyState
          title="Nenhuma perda pendente"
          detail="Quando o chão apontar perda na finalização, a fila aparece aqui."
          action={<Button href="/app/floor">Ir ao Floor →</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {pendingSignals.map((signal) => (
            <li key={signal.stepRunId}>
              <Card className="px-5 py-4" tone="warning">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-[var(--ink)]">
                      {productNames[signal.productId] ?? signal.productId}
                    </p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-[var(--ink-2)]">
                      {signal.lotCode} ·{" "}
                      {stepTypeLabel(signal.stepType as StepType)} · perda{" "}
                      <strong className="text-[var(--ink)]">
                        {signal.lossQuantity.toLocaleString("pt-BR")} un.
                      </strong>
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      Motivo: {signal.lossReason ?? "Não informado"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {new Date(signal.finishedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="warning">Pendente</StatusBadge>
                    <Button
                      href={`/app/cockpit/production/lots/${signal.lotId}`}
                      variant="secondary"
                      size="sm"
                    >
                      Lote
                    </Button>
                    <Button
                      href={incidentHrefFromLoss(signal)}
                      size="sm"
                      disabled={!canManage}
                    >
                      Registrar ocorrência
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {!loading && withIncident > 0 ? (
        <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
            Perdas já com ocorrência ({withIncident})
          </summary>
          <ul className="mt-3 space-y-1.5 text-xs text-[var(--ink-2)]">
            {signals
              .filter((s) => s.hasIncident)
              .map((s) => (
                <li key={s.stepRunId} className="font-mono tabular-nums">
                  {s.lotCode} · {stepTypeLabel(s.stepType as StepType)} ·{" "}
                  {s.lossQuantity.toLocaleString("pt-BR")} un.
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
