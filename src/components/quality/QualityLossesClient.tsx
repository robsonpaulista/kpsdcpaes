"use client";

import Link from "next/link";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
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
            <button
              type="button"
              onClick={() => void load()}
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Atualizar
            </button>
            <Link
              href="/app/quality/incidents"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Ocorrências →
            </Link>
            <Link
              href="/app/settings/loss-reasons"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Motivos →
            </Link>
          </div>
        }
      />

      {!canManage ? (
        <AccessDeniedNote action="registrar ocorrência a partir da perda" />
      ) : null}

      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Pendentes</p>
          <p className="dc-metric mt-2 text-dc-orange">
            {loading ? "…" : pendingSignals.length}
          </p>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Com ocorrência</p>
          <p className="dc-metric mt-2 text-success">
            {loading ? "…" : withIncident}
          </p>
        </div>
      </div>

      <div className="dc-panel border-dc-orange/20 bg-dc-orange/[0.04] px-4 py-3 text-sm text-dc-text-secondary">
        <p className="font-semibold text-dc-text">QA · caso de borda</p>
        <p className="mt-1">
          No Floor, finalize uma etapa com perda + motivo. A linha aparece aqui;
          em seguida registre a ocorrência.
        </p>
        <Link
          href="/app/floor"
          className="mt-2 inline-block text-sm font-semibold text-dc-orange"
        >
          Abrir Floor →
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : pendingSignals.length === 0 ? (
        <CockpitEmpty
          title="Nenhuma perda pendente"
          detail="Quando o chão apontar perda na finalização, a fila aparece aqui."
          action={
            <Link href="/app/floor" className="dc-btn-primary">
              Ir ao Floor →
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {pendingSignals.map((signal) => (
            <li
              key={signal.stepRunId}
              className="dc-panel border-warning/30 bg-warning-soft/40 px-5 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-dc-text">
                    {productNames[signal.productId] ?? signal.productId}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-dc-text-secondary">
                    {signal.lotCode} ·{" "}
                    {stepTypeLabel(signal.stepType as StepType)} · perda{" "}
                    <strong className="text-dc-text">
                      {signal.lossQuantity.toLocaleString("pt-BR")} un.
                    </strong>
                  </p>
                  <p className="mt-1 text-[11px] text-dc-text-muted">
                    Motivo: {signal.lossReason ?? "Não informado"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-dc-text-muted">
                    {new Date(signal.finishedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/cockpit/production/lots/${signal.lotId}`}
                    className="dc-btn-secondary h-9 px-3 text-xs"
                  >
                    Lote
                  </Link>
                  {canManage ? (
                    <Link
                      href={incidentHrefFromLoss(signal)}
                      className="dc-btn-primary h-9 px-3 text-xs"
                    >
                      Registrar ocorrência
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="dc-btn-primary h-9 px-3 text-xs opacity-40"
                    >
                      Registrar ocorrência
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && withIncident > 0 ? (
        <details className="dc-panel-muted px-5 py-4">
          <summary className="cursor-pointer text-xs font-semibold text-dc-text-muted">
            Perdas já com ocorrência ({withIncident})
          </summary>
          <ul className="mt-3 space-y-1.5 text-xs text-dc-text-secondary">
            {signals
              .filter((s) => s.hasIncident)
              .map((s) => (
                <li key={s.stepRunId} className="tabular-nums">
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
