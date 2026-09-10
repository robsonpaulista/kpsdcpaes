"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { useQualityBoard } from "@/hooks/useQualityBoard";
import type { StepType } from "@/types/production";

/** Ocorrências (Doc 02 `/app/quality/incidents`). Prefill via query da fila de perdas. */
export function QualityIncidentsClient() {
  const searchParams = useSearchParams();
  const { can } = useFactoryRole();
  const canManage = can("manageQuality");
  const formRef = useRef<HTMLFormElement>(null);
  const {
    incidents,
    productNames,
    loading,
    error,
    setError,
    busy,
    createIncident,
    resolveIncident,
    releaseLot,
  } = useQualityBoard();

  const [lotRef, setLotRef] = useState("");
  const [description, setDescription] = useState("");
  const [blockLot, setBlockLot] = useState(false);
  const [relatedStepRunId, setRelatedStepRunId] = useState<string | undefined>();
  const [relatedLossQty, setRelatedLossQty] = useState<number | undefined>();
  const [relatedLossReason, setRelatedLossReason] = useState<string | undefined>();
  const [relatedStepType, setRelatedStepType] = useState<StepType | undefined>();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<Record<string, string>>({});
  const [prefillDone, setPrefillDone] = useState(false);

  useEffect(() => {
    if (prefillDone) return;
    const lot = searchParams.get("lot");
    if (!lot) {
      setPrefillDone(true);
      return;
    }
    const stepRun = searchParams.get("stepRun") ?? undefined;
    const qtyRaw = searchParams.get("qty");
    const qty = qtyRaw != null ? Number(qtyRaw) : undefined;
    const reason = searchParams.get("reason") ?? undefined;
    const step = (searchParams.get("step") as StepType | null) ?? undefined;

    setLotRef(lot.toUpperCase());
    setRelatedStepRunId(stepRun);
    setRelatedLossQty(
      qty != null && Number.isFinite(qty) ? qty : undefined,
    );
    setRelatedLossReason(reason);
    setRelatedStepType(step);
    const reasonBit = reason ? ` Motivo apontado: ${reason}.` : "";
    const qtyBit =
      qty != null && Number.isFinite(qty)
        ? `Perda de ${qty.toLocaleString("pt-BR")} un.`
        : "Perda apontada no chão.";
    const stepBit = step ? ` em ${stepTypeLabel(step)}.` : ".";
    setDescription(`${qtyBit}${stepBit}${reasonBit} `);
    setPrefillDone(true);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams, prefillDone]);

  function clearLossLink() {
    setRelatedStepRunId(undefined);
    setRelatedLossQty(undefined);
    setRelatedLossReason(undefined);
    setRelatedStepType(undefined);
  }

  async function handleCreate() {
    setFormMessage(null);
    setError(null);
    try {
      const result = await createIncident({
        lotCodeOrId: lotRef,
        description,
        blockLot,
        relatedStepRunId,
        lossQuantity: relatedLossQty,
        lossReason: relatedLossReason,
        stepType: relatedStepType,
      });
      setFormMessage(
        result.lotBlocked
          ? `Ocorrência registrada e lote ${result.incident.lotCode} bloqueado.`
          : `Ocorrência registrada em ${result.incident.lotCode}.`,
      );
      setLotRef("");
      setDescription("");
      setBlockLot(false);
      clearLossLink();
    } catch {
      /* error already set in hook */
    }
  }

  const openCount = incidents.filter((i) => i.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Qualidade"
        title="Ocorrências"
        description="Registro do setor de qualidade. Bloqueio de lote é ação explícita."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/quality/losses"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              ← Fila de perdas
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Abertas</p>
          <p className="dc-metric mt-2 text-warning">
            {loading ? "…" : openCount}
          </p>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Total</p>
          <p className="dc-metric mt-2 text-dc-text">
            {loading ? "…" : incidents.length}
          </p>
        </div>
      </div>

      {canManage ? (
        <form
          ref={formRef}
          className="dc-panel space-y-3 px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <p className="dc-eyebrow">Novo registro</p>
          <h2 className="text-sm font-semibold tracking-tight text-dc-text">
            Registrar ocorrência
          </h2>
          {relatedStepRunId ? (
            <p className="rounded-[12px] border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-dc-text">
              Vinculada à perda de{" "}
              <strong className="tabular-nums">
                {relatedLossQty?.toLocaleString("pt-BR")} un.
              </strong>
              {relatedStepType
                ? ` em ${stepTypeLabel(relatedStepType)}`
                : ""}
              .{" "}
              <button
                type="button"
                onClick={clearLossLink}
                className="font-semibold underline"
              >
                Remover vínculo
              </button>
            </p>
          ) : null}
          <label className="block text-xs text-dc-text-muted">
            Lote (código)
            <input
              value={lotRef}
              onChange={(e) => setLotRef(e.target.value.toUpperCase())}
              placeholder="Ex.: PF26082701"
              className="mt-1 h-11 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm tabular-nums outline-none focus:border-dc-orange"
            />
          </label>
          <label className="block text-xs text-dc-text-muted">
            Descrição
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o problema observado…"
              className="mt-1 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 py-2 text-sm outline-none focus:border-dc-orange"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-dc-text">
            <input
              type="checkbox"
              checked={blockLot}
              onChange={(e) => setBlockLot(e.target.checked)}
              className="h-4 w-4 accent-dc-orange"
            />
            Bloquear lote agora (ação explícita)
          </label>
          <button
            type="submit"
            disabled={busy || !lotRef.trim() || !description.trim()}
            className="dc-btn-primary disabled:opacity-40"
          >
            {busy ? "…" : "REGISTRAR"}
          </button>
          {formMessage ? (
            <p className="rounded-[12px] border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
              {formMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <p className="dc-eyebrow">Lista</p>
        {loading ? (
          <p className="text-sm text-dc-text-secondary">Carregando…</p>
        ) : incidents.length === 0 ? (
          <CockpitEmpty
            title="Nenhuma ocorrência ainda"
            detail="Registre a partir da fila de perdas ou crie manualmente acima."
            action={
              <Link href="/app/quality/losses" className="dc-btn-primary">
                Ver fila de perdas →
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <li key={incident.id} className="dc-panel px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/app/cockpit/production/lots/${incident.lotId}`}
                      className="text-sm font-semibold tabular-nums text-dc-orange"
                    >
                      {incident.lotCode}
                    </Link>
                    <p className="mt-0.5 text-xs text-dc-text-secondary">
                      {productNames[incident.productId] ?? incident.productId}
                      {incident.stepType
                        ? ` · ${stepTypeLabel(incident.stepType as StepType)}`
                        : ""}
                      {incident.lossQuantity != null
                        ? ` · perda ${incident.lossQuantity.toLocaleString("pt-BR")} un.`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      incident.status === "OPEN"
                        ? "border-warning/30 bg-warning-soft text-warning"
                        : "border-success/30 bg-success-soft text-success"
                    }`}
                  >
                    {incident.status === "OPEN" ? "Aberta" : "Resolvida"}
                    {incident.blocksLot ? " · Bloqueio" : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-dc-text">{incident.description}</p>
                <p className="mt-1 text-[11px] text-dc-text-muted">
                  {new Date(incident.createdAt).toLocaleString("pt-BR")}
                </p>

                {incident.status === "OPEN" && canManage ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-dc-border/60 pt-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void resolveIncident(incident.id)}
                      className="dc-btn-secondary h-9 px-3 text-xs"
                    >
                      Marcar resolvida
                    </button>
                  </div>
                ) : null}

                {incident.blocksLot &&
                incident.status === "OPEN" &&
                canManage ? (
                  <div className="mt-3 space-y-2 border-t border-dc-border/60 pt-3">
                    <label className="block text-xs text-dc-text-muted">
                      Motivo da liberação do lote
                      <input
                        value={releaseNotes[incident.lotId] ?? ""}
                        onChange={(e) =>
                          setReleaseNotes((prev) => ({
                            ...prev,
                            [incident.lotId]: e.target.value,
                          }))
                        }
                        className="mt-1 h-10 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm outline-none focus:border-dc-orange"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void releaseLot(
                          incident.lotId,
                          releaseNotes[incident.lotId] ?? "",
                        )
                      }
                      className="dc-btn-primary h-9 px-3 text-xs"
                    >
                      Liberar lote
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
