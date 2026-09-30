"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Button,
  EmptyState,
  Input,
  Select,
  StatusBadge,
} from "@/components/ui";
import { getFirestoreDb } from "@/lib/firebase/client";
import { formatDateTimeBr } from "@/lib/format/date";
import {
  DOWNTIME_CATEGORIES,
  downtimeCategoryLabel,
  formatDurationMinutes,
} from "@/lib/labels/maintenance";
import {
  releaseEquipment,
  updateDowntimeDetails,
} from "@/services/equipment-ops.service";
import type { DowntimeCategory, EquipmentDowntime } from "@/types/equipment";

type EditDraft = {
  category: DowntimeCategory;
  reason: string;
  resolutionNote: string;
};

function liveMinutes(startedAt: string): number {
  return Math.max(0, (Date.now() - new Date(startedAt).getTime()) / 60_000);
}

/** Histórico de paradas com encerrar (abertas) e reclassificar. */
export function DowntimeList({
  downtimes,
  canManage,
  actor,
  showEquipment = true,
  onDone,
  onError,
}: {
  downtimes: EquipmentDowntime[];
  canManage: boolean;
  actor?: string;
  showEquipment?: boolean;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    category: "OTHER",
    reason: "",
    resolutionNote: "",
  });
  const [closeNote, setCloseNote] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  function startEdit(d: EquipmentDowntime) {
    setClosingId(null);
    setEditingId(d.id);
    setDraft({
      category: d.category,
      reason: d.reason ?? "",
      resolutionNote: d.resolutionNote ?? "",
    });
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      setEditingId(null);
      setClosingId(null);
      setCloseNote("");
      onDone(message);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Falha na operação");
    } finally {
      setBusy(false);
    }
  }

  if (downtimes.length === 0) {
    return (
      <EmptyState
        title="Nenhuma parada no período"
        detail="Paradas registradas no Painel, manutenções iniciadas e registros retroativos aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
      {downtimes.map((d) => {
        const open = !d.endedAt;
        const minutes = open ? liveMinutes(d.startedAt) : d.durationMinutes;
        return (
          <li key={d.id} className="px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {showEquipment ? (
                    <Link
                      href={`/app/equipment/${encodeURIComponent(d.equipmentId)}`}
                      className="font-mono hover:text-[var(--accent-strong)]"
                    >
                      {d.equipmentCode}
                    </Link>
                  ) : null}
                  {showEquipment ? " · " : ""}
                  {downtimeCategoryLabel(d.category)}
                </p>
                {d.reason ? (
                  <p className="mt-0.5 text-sm text-[var(--ink-2)]">{d.reason}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDateTimeBr(d.startedAt)} →{" "}
                  {open ? "em aberto" : formatDateTimeBr(d.endedAt)}
                  {d.startedBy ? ` · aberta por ${d.startedBy}` : ""}
                </p>
                {d.resolutionNote ? (
                  <p className="mt-1 text-xs text-[var(--ink-2)]">
                    <span className="font-semibold">Solução:</span> {d.resolutionNote}
                  </p>
                ) : null}
                {d.maintenanceId ? (
                  <Link
                    href="/app/equipment/maintenance"
                    className="mt-1 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Vinculada a manutenção →
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={open ? "critical" : "neutral"}>
                  {open ? "Em aberto" : "Encerrada"}
                </StatusBadge>
                <p className="font-mono text-sm font-semibold tabular-nums text-[var(--ink)]">
                  {formatDurationMinutes(minutes)}
                </p>
              </div>
            </div>

            {canManage && editingId !== d.id && closingId !== d.id ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {open && !d.maintenanceId ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(null);
                      setClosingId(d.id);
                    }}
                  >
                    Encerrar e liberar
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => startEdit(d)}
                >
                  Reclassificar
                </Button>
              </div>
            ) : null}

            {closingId === d.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  className="min-w-[14rem] flex-1"
                  placeholder="O que foi feito para resolver (opcional)"
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                />
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setClosingId(null)}>
                  Voltar
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        releaseEquipment(getFirestoreDb(), d.equipmentId, {
                          resolutionNote: closeNote,
                          actor,
                        }),
                      `${d.equipmentCode} liberado — parada encerrada.`,
                    )
                  }
                >
                  Confirmar
                </Button>
              </div>
            ) : null}

            {editingId === d.id ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
                <Select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      category: e.target.value as DowntimeCategory,
                    }))
                  }
                  className="w-auto"
                >
                  {DOWNTIME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {downtimeCategoryLabel(c)}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Motivo"
                  value={draft.reason}
                  onChange={(e) => setDraft((prev) => ({ ...prev, reason: e.target.value }))}
                />
                <Input
                  placeholder="Solução"
                  value={draft.resolutionNote}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, resolutionNote: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => setEditingId(null)}>
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => updateDowntimeDetails(getFirestoreDb(), d.id, draft),
                        "Parada atualizada.",
                      )
                    }
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
