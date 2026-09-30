"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { EquipmentProfileForm } from "@/components/settings/EquipmentProfileForm";
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
  formatEquipmentCapacity,
} from "@/lib/labels/equipment";
import { listEquipment } from "@/repositories/equipment.repository";
import {
  saveEquipmentProfile,
  type EquipmentProfileInput,
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
  /** "new" = cadastro novo; id = edição inline daquele equipamento. */
  const [editingId, setEditingId] = useState<string | null>(null);

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

  async function handleSaveProfile(
    input: EquipmentProfileInput,
    equipmentId?: string,
  ) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await saveEquipmentProfile(
        getFirestoreDb(),
        input,
        equipmentId,
      );
      setMessage(
        equipmentId
          ? `${saved.code} atualizado.`
          : `${saved.code} cadastrado.`,
      );
      setEditingId(null);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Equipamentos · cadastro"
        description="Cadastro com capacidade e informações gerais. Paradas e manutenções ficam em Equipamentos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link href="/app/equipment" className="dc-btn-secondary h-10 px-3 text-sm">
              Visão operacional →
            </Link>
            {canManage && items.length === 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSeed()}
                className="dc-btn-secondary h-10 px-3 text-sm disabled:opacity-50"
              >
                {busy ? "Semeando…" : "Semear catálogo V1"}
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                disabled={busy || editingId === "new"}
                onClick={() => setEditingId("new")}
                className="dc-btn-primary h-10 disabled:opacity-50"
              >
                + Novo equipamento
              </button>
            ) : null}
          </div>
        }
      />

      {!canManage ? <AccessDeniedNote action="alterar equipamentos" /> : null}

      {canManage && editingId === "new" ? (
        <section className="dc-panel px-5 py-5">
          <p className="text-sm font-semibold tracking-tight text-dc-text">
            Novo equipamento
          </p>
          <div className="mt-4">
            <EquipmentProfileForm
              busy={busy}
              onSubmit={(input) => handleSaveProfile(input)}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </section>
      ) : null}

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
          detail="Use Semear catálogo V1 para criar AM01–EM01 ou cadastre um novo equipamento."
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
            const capacityLabel = formatEquipmentCapacity(eq);
            const generalInfo: Array<{ label: string; value: string }> = [
              capacityLabel ? { label: "Capacidade", value: capacityLabel } : null,
              eq.powerKw != null
                ? {
                    label: "Potência",
                    value: `${eq.powerKw.toLocaleString("pt-BR")} kW`,
                  }
                : null,
              eq.manufacturer ? { label: "Fabricante", value: eq.manufacturer } : null,
              eq.model ? { label: "Modelo", value: eq.model } : null,
              eq.serialNumber ? { label: "Nº série", value: eq.serialNumber } : null,
              eq.installedAt
                ? {
                    label: "Instalação",
                    value: eq.installedAt.split("-").reverse().join("/"),
                  }
                : null,
              eq.location ? { label: "Local", value: eq.location } : null,
            ].filter((row): row is { label: string; value: string } => row !== null);

            if (editingId === eq.id) {
              return (
                <li key={eq.id} className="dc-panel px-5 py-5">
                  <p className="text-sm font-semibold tracking-tight text-dc-text">
                    Editar {eq.code}
                  </p>
                  <div className="mt-4">
                    <EquipmentProfileForm
                      equipment={eq}
                      busy={busy}
                      onSubmit={(input) => handleSaveProfile(input, eq.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                </li>
              );
            }

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
                      {eq.applicableStepTypes.map(stepTypeLabel).join(", ")}
                    </p>
                    {eq.status === "STOPPED" && eq.stopReason ? (
                      <p className="mt-1 text-xs text-dc-text-secondary">
                        Motivo: {eq.stopReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right text-xs">
                      <p className={`font-semibold ${statusClass(eq.status)}`}>
                        {equipmentStatusLabel(eq.status)}
                      </p>
                      <p className="mt-1 text-dc-text-muted">
                        {eq.active ? "Cadastro ativo" : "Inativo"}
                      </p>
                    </div>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(eq.id)}
                        className="dc-btn-secondary h-9 px-3 text-xs disabled:opacity-50"
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                </div>

                {generalInfo.length > 0 || eq.notes ? (
                  <div className="mt-3 border-t border-dc-border/60 pt-3">
                    {generalInfo.length > 0 ? (
                      <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        {generalInfo.map((row) => (
                          <div key={row.label} className="min-w-0">
                            <dt className="text-dc-text-muted">{row.label}</dt>
                            <dd className="truncate font-medium text-dc-text">
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {eq.notes ? (
                      <p className="mt-2 whitespace-pre-line text-xs text-dc-text-secondary">
                        {eq.notes}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-dc-text-muted">
                    Capacidade e informações gerais não cadastradas.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <Link
                    href={`/app/equipment/${encodeURIComponent(eq.id)}`}
                    className="font-medium text-dc-orange"
                  >
                    Paradas e manutenções →
                  </Link>
                </div>
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
