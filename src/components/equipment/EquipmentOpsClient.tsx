"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import {
  CockpitEmpty,
  CockpitPageHeader,
  CockpitSegments,
} from "@/components/shared/CockpitUi";
import { getStation } from "@/domain/production/stations";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  equipmentStatusLabel,
  equipmentTypeLabel,
} from "@/lib/labels/equipment";
import { listOpenStepRuns } from "@/repositories/execution.repository";
import { listEquipment } from "@/repositories/equipment.repository";
import { listActiveLots } from "@/repositories/lots.repository";
import {
  releaseEquipment,
  stopEquipment,
} from "@/services/equipment-ops.service";
import type { Equipment, EquipmentStatus } from "@/types/equipment";

type Filter = "all" | "operating" | "stopped" | "available";

function stoppedMinutes(stoppedAt?: string): number | null {
  if (!stoppedAt) return null;
  return Math.max(
    0,
    Math.round((Date.now() - new Date(stoppedAt).getTime()) / 60_000),
  );
}

function statusTone(status: EquipmentStatus): string {
  switch (status) {
    case "OPERATING":
      return "text-dc-orange";
    case "STOPPED":
    case "MAINTENANCE":
    case "UNAVAILABLE":
      return "text-danger";
    case "AVAILABLE":
      return "text-success";
    default:
      return "text-dc-text-secondary";
  }
}

/**
 * Visão operacional Doc 02 §67 — status do chão, não cadastro.
 */
export function EquipmentOpsClient() {
  const { can } = useFactoryRole();
  const canManage = can("manageEquipment");
  const [items, setItems] = useState<Equipment[]>([]);
  const [lotByEquipment, setLotByEquipment] = useState<
    Record<string, { lotId: string; lotCode: string }>
  >({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stopReasonDraft, setStopReasonDraft] = useState<Record<string, string>>(
    {},
  );
  const [tick, setTick] = useState(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [equipment, steps, lots] = await Promise.all([
        listEquipment(db),
        listOpenStepRuns(db),
        listActiveLots(db),
      ]);
      setItems(equipment.filter((e) => e.active));
      const lotCodeById: Record<string, string> = {};
      for (const lot of lots) lotCodeById[lot.id] = lot.lotCode;
      const map: Record<string, { lotId: string; lotCode: string }> = {};
      for (const step of steps) {
        if (step.status !== "IN_PROGRESS" || !step.equipmentId) continue;
        map[step.equipmentId] = {
          lotId: step.lotId,
          lotCode: lotCodeById[step.lotId] ?? step.lotId,
        };
      }
      setLotByEquipment(map);
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

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  void tick;

  const counts = useMemo(() => {
    const operating = items.filter((e) => e.status === "OPERATING").length;
    const stopped = items.filter(
      (e) =>
        e.status === "STOPPED" ||
        e.status === "MAINTENANCE" ||
        e.status === "UNAVAILABLE",
    ).length;
    const available = items.filter((e) => e.status === "AVAILABLE").length;
    return { operating, stopped, available, total: items.length };
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "operating") {
      return items.filter((e) => e.status === "OPERATING");
    }
    if (filter === "stopped") {
      return items.filter(
        (e) =>
          e.status === "STOPPED" ||
          e.status === "MAINTENANCE" ||
          e.status === "UNAVAILABLE",
      );
    }
    if (filter === "available") {
      return items.filter((e) => e.status === "AVAILABLE");
    }
    return items;
  }, [items, filter]);

  async function handleStop(eq: Equipment) {
    setBusyId(eq.id);
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
      setBusyId(null);
    }
  }

  async function handleRelease(eq: Equipment) {
    setBusyId(eq.id);
    setMessage(null);
    setError(null);
    try {
      await releaseEquipment(getFirestoreDb(), eq.id);
      setMessage(`${eq.code} liberado (DISPONÍVEL).`);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Chão"
        title="Equipamentos"
        description="Status operacional · parada tira o recurso da fila do Floor."
        actions={
          <Link
            href="/app/settings/equipment"
            className="dc-btn-secondary h-10 px-3 text-sm"
          >
            Cadastro / semear →
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Operando</p>
          <p className="dc-metric mt-2 text-dc-orange">{counts.operating}</p>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Parados</p>
          <p className="dc-metric mt-2 text-danger">{counts.stopped}</p>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Disponíveis</p>
          <p className="dc-metric mt-2 text-success">{counts.available}</p>
        </div>
      </div>

      <CockpitSegments
        activeId={filter}
        onSelect={(id) => setFilter(id as Filter)}
        items={[
          { id: "all", label: "Todos", count: counts.total },
          { id: "operating", label: "Operando", count: counts.operating },
          { id: "stopped", label: "Parados", count: counts.stopped },
          { id: "available", label: "Disponíveis", count: counts.available },
        ]}
      />

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
      {!canManage ? (
        <AccessDeniedNote action="parar/liberar equipamentos" />
      ) : null}

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : visible.length === 0 ? (
        <CockpitEmpty
          title="Nenhum equipamento neste filtro"
          detail="Semee o catálogo ou mude o filtro."
          action={
            <Link href="/app/settings/equipment" className="dc-btn-primary">
              Semear catálogo →
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((eq) => {
            const station = eq.stationId
              ? getStation(eq.stationId)
              : undefined;
            const currentLot = lotByEquipment[eq.id];
            const mins = stoppedMinutes(eq.stoppedAt);
            const canStop =
              canManage &&
              eq.status !== "STOPPED" &&
              eq.status !== "OPERATING" &&
              eq.status !== "MAINTENANCE" &&
              eq.status !== "UNAVAILABLE";
            const canRelease =
              canManage &&
              (eq.status === "STOPPED" ||
                eq.status === "MAINTENANCE" ||
                eq.status === "UNAVAILABLE");
            const stopped =
              eq.status === "STOPPED" ||
              eq.status === "MAINTENANCE" ||
              eq.status === "UNAVAILABLE";

            return (
              <li
                key={eq.id}
                className={`dc-panel px-5 py-4 ${
                  stopped ? "border-danger/25 bg-danger/5" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/app/equipment/${encodeURIComponent(eq.id)}`}
                      className="text-sm font-semibold tabular-nums tracking-tight text-dc-orange"
                    >
                      {eq.code}
                    </Link>
                    <p className="mt-0.5 text-sm text-dc-text">{eq.name}</p>
                    <p className="mt-0.5 text-xs text-dc-text-muted">
                      {equipmentTypeLabel(eq.type)}
                      {station ? ` · ${station.label}` : ""}
                    </p>
                  </div>
                  <p
                    className={`text-xs font-semibold ${statusTone(eq.status)}`}
                  >
                    {equipmentStatusLabel(eq.status)}
                    {mins != null && eq.status === "STOPPED"
                      ? ` · ${mins} min`
                      : ""}
                  </p>
                </div>

                {currentLot ? (
                  <p className="mt-2 text-xs text-dc-text-secondary">
                    Lote atual{" "}
                    <Link
                      href={`/app/cockpit/production/lots/${encodeURIComponent(currentLot.lotId)}`}
                      className="font-semibold tabular-nums text-dc-orange"
                    >
                      {currentLot.lotCode}
                    </Link>
                  </p>
                ) : null}

                {eq.stopReason ? (
                  <p className="mt-1 text-xs text-dc-text-muted">
                    Motivo: {eq.stopReason}
                  </p>
                ) : null}

                {canManage ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dc-border/60 pt-4">
                    {canStop ? (
                      <>
                        <input
                          type="text"
                          placeholder="Motivo (opcional)"
                          value={stopReasonDraft[eq.id] ?? ""}
                          onChange={(e) =>
                            setStopReasonDraft((prev) => ({
                              ...prev,
                              [eq.id]: e.target.value,
                            }))
                          }
                          className="h-10 min-w-[10rem] flex-1 rounded-[12px] border border-dc-border bg-dc-bg px-3 text-xs outline-none focus:border-dc-orange"
                        />
                        <button
                          type="button"
                          disabled={busyId === eq.id}
                          onClick={() => void handleStop(eq)}
                          className="h-10 rounded-[12px] border border-danger/40 px-3 text-xs font-semibold text-danger disabled:opacity-50"
                        >
                          Parar
                        </button>
                      </>
                    ) : null}
                    {canRelease ? (
                      <button
                        type="button"
                        disabled={busyId === eq.id}
                        onClick={() => void handleRelease(eq)}
                        className="dc-btn-primary h-10 px-3 text-xs disabled:opacity-50"
                      >
                        Liberar
                      </button>
                    ) : null}
                    {eq.status === "OPERATING" ? (
                      <p className="text-[11px] text-dc-text-muted">
                        Em uso — finalize a etapa no Floor para parar.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
