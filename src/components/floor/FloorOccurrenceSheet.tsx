"use client";

import { useState } from "react";
import { getFirestoreDb } from "@/lib/firebase/client";
import { createQualityIncident } from "@/services/quality.service";
import type { StepType } from "@/types/production";

/** Categorias propostas no Doc 07 §39 — ainda a validar com a fábrica. */
const OCCURRENCE_CATEGORIES = [
  "EQUIPAMENTO",
  "PRODUTO",
  "PROCESSO",
  "QUALIDADE",
  "OUTRO",
] as const;

type OccurrenceCategory = (typeof OCCURRENCE_CATEGORIES)[number];

type FloorOccurrenceSheetProps = {
  open: boolean;
  onClose: () => void;
  lotCode: string;
  lotId: string;
  stepType?: StepType;
  stationId?: string;
  online: boolean;
  onRegistered: (result: { blocked: boolean; message: string }) => void;
};

/**
 * Ocorrência no Floor (Doc 07 §38–43).
 * Sem catálogo oficial de motivos; texto livre só quando necessário.
 * Bloqueio só se pedido explicitamente (ocorrência ≠ bloqueio automático).
 */
export function FloorOccurrenceSheet({
  open,
  onClose,
  lotCode,
  lotId,
  stepType,
  stationId,
  online,
  onRegistered,
}: FloorOccurrenceSheetProps) {
  const [category, setCategory] = useState<OccurrenceCategory | null>(null);
  const [notes, setNotes] = useState("");
  const [blockLot, setBlockLot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function resetAndClose() {
    setCategory(null);
    setNotes("");
    setBlockLot(false);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!category) {
      setError("Selecione o que aconteceu.");
      return;
    }
    if (!online) {
      setError("Sem conexão. Tente novamente ao reconectar.");
      return;
    }
    if (category === "OUTRO" && !notes.trim()) {
      setError("Descreva o que aconteceu.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const description = notes.trim()
        ? `[${category}] ${notes.trim()}`
        : `[${category}]`;
      const db = getFirestoreDb();
      const result = await createQualityIncident(db, {
        lotCodeOrId: lotId,
        description,
        blockLot,
        stepType,
        stationId,
      });
      onRegistered({
        blocked: result.lotBlocked,
        message: result.lotBlocked
          ? "✓ OCORRÊNCIA REGISTRADA · PROCESSO BLOQUEADO"
          : "✓ OCORRÊNCIA REGISTRADA",
      });
      setCategory(null);
      setNotes("");
      setBlockLot(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-dc-text/40"
        onClick={resetAndClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="floor-occurrence-title"
        className="relative z-10 w-full max-w-lg rounded-t-[20px] border border-dc-border bg-dc-surface px-5 pb-8 pt-4 shadow-lg"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-dc-border" />
        <h2
          id="floor-occurrence-title"
          className="text-sm font-semibold text-dc-text"
        >
          REGISTRAR OCORRÊNCIA
        </h2>
        <p className="mt-1 text-xs tabular-nums text-dc-text-secondary">
          {lotCode}
        </p>

        <p className="mt-4 text-xs font-medium text-dc-text-muted">
          O que aconteceu?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {OCCURRENCE_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={
                category === item
                  ? "rounded-xl bg-dc-orange px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-xl border border-dc-border bg-dc-bg px-3 py-2 text-sm font-medium text-dc-text-secondary"
              }
            >
              {item}
            </button>
          ))}
        </div>

        {category ? (
          <label className="mt-4 block text-xs text-dc-text-muted">
            {category === "OUTRO"
              ? "Descreva (obrigatório)"
              : "Detalhe (opcional)"}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                category === "OUTRO"
                  ? "O que aconteceu?"
                  : "Só se precisar complementar"
              }
              className="mt-1 w-full rounded-xl border border-dc-border bg-dc-bg px-3 py-2 text-sm outline-none focus:border-dc-orange"
            />
          </label>
        ) : null}

        <label className="mt-4 flex items-center gap-2 text-sm text-dc-text">
          <input
            type="checkbox"
            checked={blockLot}
            onChange={(e) => setBlockLot(e.target.checked)}
            className="h-4 w-4"
          />
          Bloquear lote agora (ação explícita)
        </label>

        {error ? (
          <p className="mt-3 text-sm text-danger">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || !category || !online}
            onClick={() => void handleConfirm()}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-dc-orange text-base font-semibold text-white disabled:opacity-50"
          >
            {busy ? "REGISTRANDO…" : "CONFIRMAR"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={resetAndClose}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-dc-border text-sm font-semibold text-dc-text-secondary"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
