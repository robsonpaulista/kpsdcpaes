"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { DowntimeList } from "@/components/equipment/DowntimeList";
import { EquipmentPeriodPicker } from "@/components/equipment/EquipmentPeriodPicker";
import { EquipmentSubnav } from "@/components/equipment/EquipmentSubnav";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  StatTile,
} from "@/components/ui";
import { useEquipmentManagementData } from "@/hooks/useEquipmentManagementData";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  DOWNTIME_CATEGORIES,
  downtimeCategoryLabel,
  formatDurationMinutes,
} from "@/lib/labels/maintenance";
import {
  computeEquipmentMetrics,
  equipmentPeriodPreset,
  type EquipmentPeriod,
} from "@/services/equipment-management.service";
import { registerPastDowntime } from "@/services/equipment-ops.service";
import type { DowntimeCategory } from "@/types/equipment";

type PastDraft = {
  equipmentId: string;
  category: DowntimeCategory;
  reason: string;
  resolutionNote: string;
  startedAt: string;
  endedAt: string;
};

const EMPTY_PAST: PastDraft = {
  equipmentId: "",
  category: "MECHANICAL_FAILURE",
  reason: "",
  resolutionNote: "",
  startedAt: "",
  endedAt: "",
};

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]";

export function DowntimeClient() {
  const { can, profile } = useFactoryRole();
  const canManage = can("manageEquipment");
  const actor = profile?.email ?? profile?.uid;
  const { data, loading, error, reload } = useEquipmentManagementData();

  const [period, setPeriod] = useState<EquipmentPeriod>(() => equipmentPeriodPreset(30));
  const [equipmentFilter, setEquipmentFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<DowntimeCategory | "">("");
  const [showPastForm, setShowPastForm] = useState<boolean>(false);
  const [past, setPast] = useState<PastDraft>(EMPTY_PAST);
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const metrics = useMemo(
    () => computeEquipmentMetrics(data, period, equipmentFilter || undefined),
    [data, period, equipmentFilter],
  );

  const visible = useMemo(
    () =>
      metrics.periodDowntimes.filter(
        (d) => !categoryFilter || d.category === categoryFilter,
      ),
    [metrics.periodDowntimes, categoryFilter],
  );

  function notify(text: string) {
    setActionError(null);
    setMessage(text);
    void reload({ silent: true });
  }

  function fail(text: string) {
    setMessage(null);
    setActionError(text);
  }

  async function handlePastSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await registerPastDowntime(getFirestoreDb(), {
        ...past,
        actor,
      });
      setPast(EMPTY_PAST);
      setShowPastForm(false);
      notify(
        `Parada de ${saved.equipmentCode} registrada (${formatDurationMinutes(saved.durationMinutes)}).`,
      );
    } catch (err) {
      fail(err instanceof Error ? err.message : "Falha ao registrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Equipamentos"
        title="Paradas"
        description="Histórico de paradas por equipamento e categoria, com tempo parado e tempo médio de reparo."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setShowPastForm((v) => !v)}>
              {showPastForm ? "Fechar registro" : "+ Registrar parada retroativa"}
            </Button>
          ) : null
        }
      />

      <EquipmentSubnav />

      {!canManage ? <AccessDeniedNote action="gerir paradas" /> : null}

      {showPastForm ? (
        <Card className="px-5 py-5">
          <p className="text-sm font-semibold tracking-tight text-[var(--ink)]">
            Registrar parada já encerrada
          </p>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Para paradas que aconteceram sem registro no sistema (ex.: durante a
            noite). Não altera o status atual do equipamento.
          </p>
          <form onSubmit={handlePastSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>
              Equipamento *
              <Select
                className="mt-1.5"
                value={past.equipmentId}
                onChange={(e) => setPast((p) => ({ ...p, equipmentId: e.target.value }))}
                required
              >
                <option value="">Selecione</option>
                {data.equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.code} · {eq.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className={labelClass}>
              Categoria *
              <Select
                className="mt-1.5"
                value={past.category}
                onChange={(e) =>
                  setPast((p) => ({ ...p, category: e.target.value as DowntimeCategory }))
                }
              >
                {DOWNTIME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {downtimeCategoryLabel(c)}
                  </option>
                ))}
              </Select>
            </label>
            <label className={labelClass}>
              Início *
              <Input
                type="datetime-local"
                className="mt-1.5"
                value={past.startedAt}
                onChange={(e) => setPast((p) => ({ ...p, startedAt: e.target.value }))}
                required
              />
            </label>
            <label className={labelClass}>
              Fim *
              <Input
                type="datetime-local"
                className="mt-1.5"
                value={past.endedAt}
                onChange={(e) => setPast((p) => ({ ...p, endedAt: e.target.value }))}
                required
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Motivo
              <Input
                className="mt-1.5"
                value={past.reason}
                onChange={(e) => setPast((p) => ({ ...p, reason: e.target.value }))}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Solução
              <Input
                className="mt-1.5"
                value={past.resolutionNote}
                onChange={(e) => setPast((p) => ({ ...p, resolutionNote: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button variant="secondary" disabled={busy} onClick={() => setShowPastForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando…" : "Registrar parada"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <EquipmentPeriodPicker period={period} onChange={setPeriod} onInvalid={fail} />

      <div className="flex flex-wrap gap-2">
        <Select
          className="w-auto min-w-[12rem]"
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
          aria-label="Filtrar equipamento"
        >
          <option value="">Todos os equipamentos</option>
          {data.equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.code} · {eq.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto min-w-[12rem]"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as DowntimeCategory | "")}
          aria-label="Filtrar categoria"
        >
          <option value="">Todas as categorias</option>
          {DOWNTIME_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {downtimeCategoryLabel(c)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Paradas no período" value={metrics.downtimeCount} />
        <StatTile
          label="Tempo parado"
          value={formatDurationMinutes(metrics.downtimeMinutes)}
          tone={metrics.downtimeMinutes > 0 ? "warning" : "ink"}
        />
        <StatTile
          label="Tempo médio de reparo"
          value={formatDurationMinutes(metrics.mttrMinutes)}
          detail="MTTR · paradas encerradas no período"
        />
        <StatTile
          label="Em aberto agora"
          value={metrics.openDowntimes}
          tone={metrics.openDowntimes > 0 ? "critical" : "ink"}
        />
      </div>

      {message ? <Alert tone="good">{message}</Alert> : null}
      {error || actionError ? (
        <Alert tone="critical">{actionError ?? error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
      ) : (
        <DowntimeList
          downtimes={visible}
          canManage={canManage}
          actor={actor}
          onDone={notify}
          onError={fail}
        />
      )}
    </div>
  );
}
