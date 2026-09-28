"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  cloneDefaultProcessRoute,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { FACTORY_STATIONS } from "@/domain/production/stations";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDateTimeBr } from "@/lib/format/date";
import { formatEquipmentCapacity } from "@/lib/labels/equipment";
import { listEquipment } from "@/repositories/equipment.repository";
import {
  loadFactoryStepTimes,
  saveFactoryStepTimes,
} from "@/services/process-settings.service";
import type { Equipment } from "@/types/equipment";
import type { ProcessRouteStep, StepType } from "@/types/production";

type TimeField = "standardDurationMinutes" | "lateToleranceMinutes";

const timeInputClass =
  "mt-1 h-10 w-24 rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm tabular-nums text-dc-text outline-none focus:border-dc-orange";

function sameTimes(a: ProcessRouteStep[], b: ProcessRouteStep[]): boolean {
  return a.every((step) => {
    const other = b.find((s) => s.stepType === step.stepType);
    return (
      other?.standardDurationMinutes === step.standardDurationMinutes &&
      other.lateToleranceMinutes === step.lateToleranceMinutes
    );
  });
}

/**
 * Estações (Doc 07) + tempo padrão/tolerância por etapa.
 * Tempos valem como padrão da fábrica; produto com rota própria sobrescreve.
 */
export function StationsSettingsClient() {
  const { can, profile } = useFactoryRole();
  const canManage = can("manageEquipment");
  const [saved, setSaved] = useState<ProcessRouteStep[]>(() =>
    cloneDefaultProcessRoute(),
  );
  const [draft, setDraft] = useState<ProcessRouteStep[]>(() =>
    cloneDefaultProcessRoute(),
  );
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [times, allEquipment] = await Promise.all([
        loadFactoryStepTimes(db),
        listEquipment(db),
      ]);
      setSaved(times.steps);
      setUpdatedAt(times.updatedAt);
      setEquipment(allEquipment);
      if (!opts?.silent) setDraft(times.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  const dirty = useMemo(() => !sameTimes(draft, saved), [draft, saved]);
  const matchesDefault = useMemo(
    () => sameTimes(draft, cloneDefaultProcessRoute()),
    [draft],
  );

  function updateTime(stepType: StepType, field: TimeField, raw: string) {
    const parsed = Number(raw);
    setDraft((prev) =>
      prev.map((step) =>
        step.stepType === stepType
          ? { ...step, [field]: Number.isFinite(parsed) ? parsed : 0 }
          : step,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const normalized = await saveFactoryStepTimes(
        getFirestoreDb(),
        draft,
        profile?.email ?? profile?.uid,
      );
      setSaved(normalized);
      setDraft(normalized);
      setUpdatedAt(new Date().toISOString());
      setMessage(
        "Tempos salvos. Novos lotes de produtos sem rota própria usam estes tempos.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar tempos");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Estações"
        description="Estação = contexto operacional do tablet. Aqui ficam o tempo padrão e a tolerância de cada etapa, usados como padrão da fábrica."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link
              href="/app/settings/equipment"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Equipamentos →
            </Link>
          </div>
        }
      />

      {!canManage ? <AccessDeniedNote action="alterar tempos das etapas" /> : null}

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
      ) : (
        <section className="dc-panel overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-dc-border/70 px-5 py-4">
            <div>
              <p className="text-sm font-semibold tracking-tight text-dc-text">
                Tempo por etapa
              </p>
              <p className="mt-0.5 text-xs text-dc-text-muted">
                {updatedAt
                  ? `Última alteração: ${formatDateTimeBr(updatedAt)}`
                  : "Usando os tempos padrão do sistema."}
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || matchesDefault}
                  onClick={() => setDraft(cloneDefaultProcessRoute())}
                  className="dc-btn-secondary h-10 px-3 text-xs disabled:opacity-50"
                >
                  Restaurar padrão do sistema
                </button>
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => setDraft(saved)}
                  className="dc-btn-secondary h-10 px-3 text-xs disabled:opacity-50"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => void handleSave()}
                  className="dc-btn-primary h-10 px-4 text-xs disabled:opacity-50"
                >
                  {saving ? "Salvando…" : "Salvar tempos"}
                </button>
              </div>
            ) : null}
          </div>

          <ul className="divide-y divide-dc-border/70">
            {draft.map((step) => {
              const stations = FACTORY_STATIONS.filter(
                (s) => s.stepType === step.stepType,
              );
              const stepEquipment = equipment.filter(
                (eq) => eq.active && eq.applicableStepTypes.includes(step.stepType),
              );
              const savedStep = saved.find((s) => s.stepType === step.stepType);
              const changed =
                savedStep?.standardDurationMinutes !== step.standardDurationMinutes ||
                savedStep?.lateToleranceMinutes !== step.lateToleranceMinutes;

              return (
                <li
                  key={step.stepType}
                  className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight text-dc-text">
                      <span className="mr-2 tabular-nums text-dc-text-muted">
                        {step.sequence}.
                      </span>
                      {stepTypeLabel(step.stepType)}
                      {changed ? (
                        <span className="ml-2 rounded-full bg-dc-orange/10 px-2 py-0.5 text-[11px] font-medium text-dc-orange">
                          alterado
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-dc-text-muted">
                      Estação:{" "}
                      {stations.length > 0
                        ? stations.map((s) => s.label).join(" · ")
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-dc-text-muted">
                      Equipamentos:{" "}
                      {stepEquipment.length > 0
                        ? stepEquipment
                            .map((eq) => {
                              const capacity = formatEquipmentCapacity(eq);
                              return capacity ? `${eq.code} (${capacity})` : eq.code;
                            })
                            .join(" · ")
                        : "nenhum vinculado"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    {canManage ? (
                      <>
                        <label className="text-xs text-dc-text-muted">
                          Tempo padrão (min)
                          <input
                            type="number"
                            min={1}
                            value={step.standardDurationMinutes}
                            onChange={(e) =>
                              updateTime(
                                step.stepType,
                                "standardDurationMinutes",
                                e.target.value,
                              )
                            }
                            className={`${timeInputClass} block`}
                          />
                        </label>
                        <label className="text-xs text-dc-text-muted">
                          Tolerância (min)
                          <input
                            type="number"
                            min={0}
                            value={step.lateToleranceMinutes}
                            onChange={(e) =>
                              updateTime(
                                step.stepType,
                                "lateToleranceMinutes",
                                e.target.value,
                              )
                            }
                            className={`${timeInputClass} block`}
                          />
                        </label>
                      </>
                    ) : (
                      <p className="text-sm tabular-nums text-dc-text-secondary">
                        {step.standardDurationMinutes} min · +
                        {step.lateToleranceMinutes} min
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs text-dc-text-muted">
        O tempo é copiado para o lote na liberação da OP — alterações aqui não
        mudam lotes já liberados. Produtos com rota própria (Produtos › Tempos)
        continuam usando os tempos do produto.
      </p>
    </div>
  );
}
