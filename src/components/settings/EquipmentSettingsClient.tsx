"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { getStation } from "@/domain/production/stations";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  equipmentStatusLabel,
  equipmentTypeLabel,
} from "@/lib/labels/equipment";
import { listEquipment } from "@/repositories/equipment.repository";
import {
  releaseEquipment,
  stopEquipment,
} from "@/services/equipment-ops.service";
import { seedFactoryEquipment } from "@/services/seed-equipment.service";
import type { Equipment } from "@/types/equipment";

function statusClass(status: Equipment["status"]): string {
  if (status === "STOPPED") return "text-danger";
  if (status === "OPERATING") return "text-dc-orange";
  if (status === "AVAILABLE") return "text-success";
  return "text-dc-text-muted";
}

export function EquipmentSettingsClient() {
  const { can } = useFactoryRole();
  const canManage = can("manageEquipment");
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopReasonDraft, setStopReasonDraft] = useState<Record<string, string>>(
    {},
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      setItems(await listEquipment(db));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  const counts = useMemo(() => {
    const active = items.filter((e) => e.active).length;
    const stopped = items.filter((e) => e.status === "STOPPED").length;
    return { total: items.length, active, stopped };
  }, [items]);

  async function handleSeed() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const db = getFirestoreDb();
      const result = await seedFactoryEquipment(db);
      setItems(result.equipment);
      setMessage(
        result.created > 0
          ? `${result.created} equipamento(s) criado(s)${
              result.skipped > 0 ? ` · ${result.skipped} já existia(m)` : ""
            }.`
          : "Catálogo já estava semeado — nenhum novo.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao semear");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop(eq: Equipment) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await stopEquipment(getFirestoreDb(), eq.id, stopReasonDraft[eq.id]);
      setMessage(`${eq.code} marcado como PARADO.`);
      setStopReasonDraft((prev) => ({ ...prev, [eq.id]: "" }));
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao parar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(eq: Equipment) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await releaseEquipment(getFirestoreDb(), eq.id);
      setMessage(`${eq.code} liberado (DISPONÍVEL).`);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Equipamentos · cadastro"
        description="Semear catálogo e manter recursos. Parada operacional também na visão do chão."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link href="/app/equipment" className="dc-btn-secondary h-10 px-3 text-sm">
              Visão operacional →
            </Link>
            {canManage ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSeed()}
                className="dc-btn-primary h-10 disabled:opacity-50"
              >
                {busy ? "Semeando…" : "Semear catálogo V1"}
              </button>
            ) : null}
          </div>
        }
      />

      {!canManage ? <AccessDeniedNote action="alterar equipamentos" /> : null}

      {!loading && items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="dc-panel px-4 py-4">
            <p className="dc-eyebrow">Total</p>
            <p className="dc-metric mt-2 text-dc-text">{counts.total}</p>
          </div>
          <div className="dc-panel px-4 py-4">
            <p className="dc-eyebrow">Ativos</p>
            <p className="dc-metric mt-2 text-success">{counts.active}</p>
          </div>
          <div className="dc-panel px-4 py-4">
            <p className="dc-eyebrow">Parados</p>
            <p className="dc-metric mt-2 text-danger">{counts.stopped}</p>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-[12px] border border-success/25 bg-success-soft px-4 py-2.5 text-sm text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : items.length === 0 ? (
        <CockpitEmpty
          title="Nenhum equipamento"
          detail="Use Semear catálogo V1 para criar AM01–EM01 no Firestore."
          action={
            canManage ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSeed()}
                className="dc-btn-primary"
              >
                Semear catálogo V1
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((eq) => {
            const station = eq.stationId
              ? getStation(eq.stationId)
              : undefined;
            const canStop =
              canManage &&
              eq.active &&
              eq.status !== "STOPPED" &&
              eq.status !== "OPERATING" &&
              eq.status !== "MAINTENANCE" &&
              eq.status !== "UNAVAILABLE";
            const canRelease =
              canManage &&
              (eq.status === "STOPPED" ||
                eq.status === "MAINTENANCE" ||
                eq.status === "UNAVAILABLE");

            return (
              <li
                key={eq.id}
                className={`dc-panel px-5 py-4 ${
                  eq.status === "STOPPED" ? "border-danger/30 bg-danger/5" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular-nums tracking-tight text-dc-text">
                      {eq.code}
                    </p>
                    <p className="mt-0.5 text-sm text-dc-text-secondary">
                      {eq.name}
                    </p>
                    <p className="mt-2 text-xs text-dc-text-muted">
                      {equipmentTypeLabel(eq.type)}
                      {station ? ` · ${station.label}` : null}
                      {" · "}
                      {eq.applicableStepTypes.join(", ")}
                    </p>
                    {eq.status === "STOPPED" && eq.stopReason ? (
                      <p className="mt-1 text-xs text-dc-text-secondary">
                        Motivo: {eq.stopReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs">
                    <p className={`font-semibold ${statusClass(eq.status)}`}>
                      {equipmentStatusLabel(eq.status)}
                    </p>
                    <p className="mt-1 text-dc-text-muted">
                      {eq.active ? "Cadastro ativo" : "Inativo"}
                    </p>
                  </div>
                </div>

                {canStop ? (
                  <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-dc-border/60 pt-4">
                    <label className="min-w-[12rem] flex-1 text-xs text-dc-text-muted">
                      Motivo da parada (opcional)
                      <input
                        value={stopReasonDraft[eq.id] ?? ""}
                        onChange={(e) =>
                          setStopReasonDraft((prev) => ({
                            ...prev,
                            [eq.id]: e.target.value,
                          }))
                        }
                        placeholder="Ex.: falha registrada"
                        className="mt-1 h-10 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm outline-none focus:border-dc-orange"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleStop(eq)}
                      className="h-10 rounded-[12px] border border-danger/40 px-3 text-xs font-semibold text-danger disabled:opacity-50"
                    >
                      Registrar parada
                    </button>
                  </div>
                ) : null}

                {canRelease ? (
                  <div className="mt-4 border-t border-dc-border/60 pt-4">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRelease(eq)}
                      className="dc-btn-primary h-10 px-3 text-xs disabled:opacity-50"
                    >
                      Liberar equipamento
                    </button>
                  </div>
                ) : null}

                {eq.status === "OPERATING" ? (
                  <p className="mt-3 text-xs text-dc-text-muted">
                    Em uso no Floor — finalize a etapa antes de registrar parada.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-dc-text-muted">
        Motivos de perda do Floor:{" "}
        <Link
          href="/app/settings/loss-reasons"
          className="font-medium text-dc-orange"
        >
          Configurações → Motivos →
        </Link>
      </p>
    </div>
  );
}
