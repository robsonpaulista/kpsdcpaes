"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  StatTile,
  StatusBadge,
  Textarea,
} from "@/components/ui";
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
            <Button href="/app/quality/losses" variant="secondary" size="sm">
              ← Fila de perdas
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

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Abertas"
          value={loading ? "…" : openCount}
          tone={!loading && openCount > 0 ? "warning" : "ink"}
        />
        <StatTile label="Total" value={loading ? "…" : incidents.length} />
      </div>

      {canManage ? (
        <form
          ref={formRef}
          className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <p className="dc-eyebrow">Novo registro</p>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
            Registrar ocorrência
          </h2>
          {relatedStepRunId ? (
            <Alert tone="warning">
              Vinculada à perda de{" "}
              <strong className="font-mono tabular-nums">
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
            </Alert>
          ) : null}
          <label className="block text-xs text-[var(--muted)]">
            Lote (código)
            <Input
              value={lotRef}
              onChange={(e) => setLotRef(e.target.value.toUpperCase())}
              placeholder="Ex.: PF26082701"
              className="mt-1 font-mono tabular-nums"
            />
          </label>
          <label className="block text-xs text-[var(--muted)]">
            Descrição
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o problema observado…"
              className="mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={blockLot}
              onChange={(e) => setBlockLot(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Bloquear lote agora (ação explícita)
          </label>
          <Button
            type="submit"
            disabled={busy || !lotRef.trim() || !description.trim()}
          >
            {busy ? "…" : "REGISTRAR"}
          </Button>
          {formMessage ? <Alert tone="good">{formMessage}</Alert> : null}
        </form>
      ) : null}

      {error ? <Alert tone="critical">{error}</Alert> : null}

      <section className="space-y-3">
        <p className="dc-eyebrow">Lista</p>
        {loading ? (
          <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
        ) : incidents.length === 0 ? (
          <EmptyState
            title="Nenhuma ocorrência ainda"
            detail="Registre a partir da fila de perdas ou crie manualmente acima."
            action={
              <Button href="/app/quality/losses">Ver fila de perdas →</Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <Card className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/app/cockpit/production/lots/${incident.lotId}`}
                        className="font-mono text-sm font-semibold tabular-nums text-[var(--ink)] hover:text-[var(--accent-strong)]"
                      >
                        {incident.lotCode}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--ink-2)]">
                        {productNames[incident.productId] ?? incident.productId}
                        {incident.stepType
                          ? ` · ${stepTypeLabel(incident.stepType as StepType)}`
                          : ""}
                        {incident.lossQuantity != null
                          ? ` · perda ${incident.lossQuantity.toLocaleString("pt-BR")} un.`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        incident.status === "OPEN"
                          ? incident.blocksLot
                            ? "critical"
                            : "warning"
                          : "good"
                      }
                    >
                      {incident.status === "OPEN" ? "Aberta" : "Resolvida"}
                      {incident.blocksLot ? " · Bloqueio" : ""}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink)]">
                    {incident.description}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {new Date(incident.createdAt).toLocaleString("pt-BR")}
                  </p>

                  {incident.status === "OPEN" && canManage ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void resolveIncident(incident.id)}
                      >
                        Marcar resolvida
                      </Button>
                    </div>
                  ) : null}

                  {incident.blocksLot &&
                  incident.status === "OPEN" &&
                  canManage ? (
                    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                      <label className="block text-xs text-[var(--muted)]">
                        Motivo da liberação do lote
                        <Input
                          value={releaseNotes[incident.lotId] ?? ""}
                          onChange={(e) =>
                            setReleaseNotes((prev) => ({
                              ...prev,
                              [incident.lotId]: e.target.value,
                            }))
                          }
                          className="mt-1"
                        />
                      </label>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void releaseLot(
                            incident.lotId,
                            releaseNotes[incident.lotId] ?? "",
                          )
                        }
                      >
                        Liberar lote
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
