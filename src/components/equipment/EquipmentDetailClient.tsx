"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import { getStation } from "@/domain/production/stations";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  equipmentStatusLabel,
  equipmentTypeLabel,
} from "@/lib/labels/equipment";
import { listOpenStepRuns } from "@/repositories/execution.repository";
import { getEquipmentById } from "@/repositories/equipment.repository";
import { getLotById } from "@/repositories/lots.repository";
import {
  releaseEquipment,
  stopEquipment,
} from "@/services/equipment-ops.service";
import type { Equipment } from "@/types/equipment";
import type { ProductionLot } from "@/types/production";

/**
 * Detalhe operacional Doc 02 §68 — sem inventar % de utilização.
 */
export function EquipmentDetailClient({ equipmentId }: { equipmentId: string }) {
  const { can } = useFactoryRole();
  const canManage = can("manageEquipment");
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [currentLot, setCurrentLot] = useState<ProductionLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopReason, setStopReason] = useState("");

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
        const db = getFirestoreDb();
        const found = await getEquipmentById(db, equipmentId);
        if (!found) {
          setEquipment(null);
          setCurrentLot(null);
          setError("Equipamento não encontrado.");
          return;
        }
        setEquipment(found);
        const steps = await listOpenStepRuns(db);
        const active = steps.find(
          (s) =>
            s.equipmentId === found.id && s.status === "IN_PROGRESS",
        );
        setCurrentLot(
          active ? await getLotById(db, active.lotId) : null,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    },
    [equipmentId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  async function handleStop() {
    if (!equipment) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await stopEquipment(getFirestoreDb(), equipment.id, stopReason);
      setMessage("Equipamento parado.");
      setStopReason("");
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao parar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (!equipment) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await releaseEquipment(getFirestoreDb(), equipment.id);
      setMessage("Equipamento liberado.");
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-dc-text-secondary">Carregando…</p>;
  }

  if (!equipment) {
    return (
      <div className="space-y-4">
        <CockpitPageHeader
          eyebrow="Chão"
          title="Equipamento"
          actions={
            <Link href="/app/equipment" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Equipamentos
            </Link>
          }
        />
        <CockpitEmpty
          title={error ?? "Não encontrado"}
          detail="Volte à lista operacional ou ao cadastro."
          action={
            <Link href="/app/equipment" className="dc-btn-primary">
              Ver equipamentos
            </Link>
          }
        />
      </div>
    );
  }

  const station = equipment.stationId
    ? getStation(equipment.stationId)
    : undefined;
  const canStop =
    canManage &&
    equipment.status !== "STOPPED" &&
    equipment.status !== "OPERATING" &&
    equipment.status !== "MAINTENANCE" &&
    equipment.status !== "UNAVAILABLE";
  const canRelease =
    canManage &&
    (equipment.status === "STOPPED" ||
      equipment.status === "MAINTENANCE" ||
      equipment.status === "UNAVAILABLE");

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Chão"
        title={`${equipment.code} · ${equipment.name}`}
        description={`${equipmentTypeLabel(equipment.type)}${
          station ? ` · ${station.label}` : ""
        } · ${equipmentStatusLabel(equipment.status)}`}
        actions={
          <Link href="/app/equipment" className="dc-btn-secondary h-10 px-3 text-sm">
            ← Equipamentos
          </Link>
        }
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

      <section className="dc-panel px-5 py-5">
        <p className="dc-eyebrow">Agora</p>
        {currentLot ? (
          <p className="mt-3 text-sm text-dc-text-secondary">
            Lote{" "}
            <Link
              href={`/app/cockpit/production/lots/${encodeURIComponent(currentLot.id)}`}
              className="font-semibold tabular-nums text-dc-orange"
            >
              {currentLot.lotCode}
            </Link>
            {currentLot.currentStep
              ? ` · ${stepTypeLabel(currentLot.currentStep)}`
              : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-dc-text-secondary">
            Nenhum lote em execução neste equipamento.
          </p>
        )}
        {equipment.stoppedAt ? (
          <p className="mt-2 text-xs text-dc-text-muted">
            Parado desde {equipment.stoppedAt.replace("T", " ").slice(0, 16)}
            {equipment.stopReason ? ` · ${equipment.stopReason}` : ""}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-dc-text-muted">
          Etapas aplicáveis:{" "}
          {equipment.applicableStepTypes.map(stepTypeLabel).join(" · ")}
        </p>
      </section>

      <section className="dc-panel px-5 py-5">
        <p className="dc-eyebrow">Ações</p>
        {!canManage ? (
          <div className="mt-3">
            <AccessDeniedNote action="parar/liberar" />
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canStop ? (
              <>
                <input
                  type="text"
                  placeholder="Motivo da parada (opcional)"
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  className="h-10 min-w-[12rem] flex-1 rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm outline-none focus:border-dc-orange"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStop()}
                  className="h-10 rounded-[12px] border border-danger/40 px-4 text-sm font-semibold text-danger disabled:opacity-50"
                >
                  Parar
                </button>
              </>
            ) : null}
            {canRelease ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRelease()}
                className="dc-btn-primary h-10 disabled:opacity-50"
              >
                Liberar
              </button>
            ) : null}
            {equipment.status === "OPERATING" ? (
              <p className="text-xs text-dc-text-muted">
                Em uso — finalize a etapa no Floor antes de registrar parada.
              </p>
            ) : null}
          </div>
        )}
        <p className="mt-4 text-xs text-dc-text-muted">
          Utilização % / histórico de turno: quando houver métricas agregadas
          reais — não inventadas aqui.
        </p>
        <Link
          href="/app/settings/equipment"
          className="mt-3 inline-block text-sm font-medium text-dc-orange"
        >
          Cadastro (settings) →
        </Link>
      </section>
    </div>
  );
}
