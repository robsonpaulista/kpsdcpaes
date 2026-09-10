"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import {
  DEFAULT_PROCESS_ROUTE,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { listLossReasons } from "@/repositories/loss-reason.repository";
import {
  createLossReason,
  seedLossReasons,
  setLossReasonActive,
} from "@/services/loss-reason.service";
import type { LossReason } from "@/types/loss-reason";
import type { StepType } from "@/types/production";

const ALL_STEPS = DEFAULT_PROCESS_ROUTE.map((s) => s.stepType);

export function LossReasonsSettingsClient() {
  const { can } = useFactoryRole();
  const canManage = can("manageLossReasons");
  const [items, setItems] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [requiresNotes, setRequiresNotes] = useState(false);
  const [allSteps, setAllSteps] = useState(true);
  const [selectedSteps, setSelectedSteps] = useState<StepType[]>([]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      setItems(await listLossReasons(db));
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
    const active = items.filter((r) => r.active).length;
    const provisional = items.filter((r) => r.provisional).length;
    return { total: items.length, active, provisional };
  }, [items]);

  async function handleSeed() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await seedLossReasons(getFirestoreDb());
      setItems(result.reasons);
      setMessage(
        result.created > 0
          ? `${result.created} motivo(s) base criado(s).`
          : "Motivo base (Outro) já existia.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao semear");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await createLossReason(getFirestoreDb(), {
        code,
        label,
        stepTypes: allSteps ? [] : selectedSteps,
        requiresNotes,
      });
      setCode("");
      setLabel("");
      setRequiresNotes(false);
      setAllSteps(true);
      setSelectedSteps([]);
      setMessage("Motivo cadastrado (provisório até validação operacional).");
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(reason: LossReason) {
    setBusy(true);
    setError(null);
    try {
      await setLossReasonActive(getFirestoreDb(), reason.id, !reason.active);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar");
    } finally {
      setBusy(false);
    }
  }

  function toggleStep(step: StepType) {
    setSelectedSteps((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step],
    );
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Motivos de perda"
        description="Catálogo configurável (Doc 10). Não inventamos motivos oficiais — cadastre os validados pela operação."
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
            {canManage ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSeed()}
                className="dc-btn-secondary h-10 disabled:opacity-50"
              >
                Semear “Outro”
              </button>
            ) : null}
          </div>
        }
      />

      {!canManage ? (
        <AccessDeniedNote action="alterar motivos de perda" />
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
            <p className="dc-eyebrow">Provisórios</p>
            <p className="dc-metric mt-2 text-dc-orange">{counts.provisional}</p>
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

      {canManage ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="dc-panel space-y-4 px-5 py-5"
        >
          <div>
            <p className="dc-eyebrow">Cadastro</p>
            <h2 className="mt-1 text-sm font-semibold tracking-tight text-dc-text">
              Novo motivo
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-dc-text-muted">
              Código
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: QUEBRA"
                className="mt-1 h-11 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm outline-none focus:border-dc-orange"
                required
              />
            </label>
            <label className="block text-xs text-dc-text-muted">
              Rótulo
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Texto no chão de fábrica"
                className="mt-1 h-11 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm outline-none focus:border-dc-orange"
                required
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-dc-text">
              <input
                type="checkbox"
                checked={requiresNotes}
                onChange={(e) => setRequiresNotes(e.target.checked)}
                className="accent-dc-orange"
              />
              Exige descrição livre
            </label>
            <label className="flex items-center gap-2 text-sm text-dc-text">
              <input
                type="checkbox"
                checked={allSteps}
                onChange={(e) => setAllSteps(e.target.checked)}
                className="accent-dc-orange"
              />
              Todas as etapas
            </label>
          </div>
          {!allSteps ? (
            <div className="flex flex-wrap gap-2">
              {ALL_STEPS.map((step) => {
                const on = selectedSteps.includes(step);
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => toggleStep(step)}
                    className={
                      on
                        ? "rounded-[10px] bg-dc-orange px-2.5 py-1.5 text-xs font-semibold text-white"
                        : "rounded-[10px] border border-dc-border px-2.5 py-1.5 text-xs font-medium text-dc-text-secondary hover:border-dc-orange/40"
                    }
                  >
                    {stepTypeLabel(step)}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="dc-btn-primary disabled:opacity-50"
          >
            Cadastrar motivo
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : items.length === 0 ? (
        <CockpitEmpty
          title="Nenhum motivo cadastrado"
          detail="Semee “Outro” ou cadastre os motivos validados pela operação."
          action={
            canManage ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSeed()}
                className="dc-btn-primary"
              >
                Semear “Outro”
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((reason) => (
            <li key={reason.id} className="dc-panel px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-dc-text">
                    {reason.label}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-dc-text-muted">
                    {reason.code}
                    {reason.provisional ? " · provisório" : ""}
                    {reason.requiresNotes ? " · exige texto" : ""}
                  </p>
                  <p className="mt-1 text-xs text-dc-text-secondary">
                    {reason.stepTypes.length === 0
                      ? "Todas as etapas"
                      : reason.stepTypes.map(stepTypeLabel).join(" · ")}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleActive(reason)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide disabled:opacity-50 ${
                      reason.active
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-dc-border bg-dc-surface-secondary text-dc-text-muted"
                    }`}
                  >
                    {reason.active ? "Ativo" : "Inativo"}
                  </button>
                ) : (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      reason.active
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-dc-border bg-dc-surface-secondary text-dc-text-muted"
                    }`}
                  >
                    {reason.active ? "Ativo" : "Inativo"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
