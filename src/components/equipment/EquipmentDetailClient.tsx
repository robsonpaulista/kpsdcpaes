"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { DowntimeList } from "@/components/equipment/DowntimeList";
import { MaintenanceDetailPanel } from "@/components/equipment/MaintenanceDetailPanel";
import { MaintenanceForm } from "@/components/equipment/MaintenanceForm";
import { MaintenanceList } from "@/components/equipment/MaintenanceList";
import { StopEquipmentForm } from "@/components/equipment/StopEquipmentForm";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  Card,
  SegmentedControl,
  StatTile,
} from "@/components/ui";
import { stepTypeLabel } from "@/domain/production/process-route";
import { getStation } from "@/domain/production/stations";
import { useEquipmentManagementData } from "@/hooks/useEquipmentManagementData";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  equipmentStatusLabel,
  equipmentTypeLabel,
  formatEquipmentCapacity,
} from "@/lib/labels/equipment";
import { formatDateBr, formatDateTimeBr } from "@/lib/format/date";
import {
  downtimeCategoryLabel,
  formatDurationMinutes,
  isMaintenanceOverdue,
} from "@/lib/labels/maintenance";
import { listOpenStepRuns } from "@/repositories/execution.repository";
import { getEquipmentById } from "@/repositories/equipment.repository";
import { getLotById } from "@/repositories/lots.repository";
import {
  scheduleMaintenance,
  startMaintenance,
  updateMaintenance,
  type MaintenanceInput,
} from "@/services/equipment-maintenance.service";
import {
  computeEquipmentMetrics,
  equipmentPeriodPreset,
  nextMaintenanceByEquipment,
} from "@/services/equipment-management.service";
import {
  releaseEquipment,
  stopEquipment,
  type StopEquipmentInput,
} from "@/services/equipment-ops.service";
import type { Equipment } from "@/types/equipment";
import type { ProductionLot } from "@/types/production";

type Tab = "geral" | "maintenance" | "downtime";

type FormState =
  | { kind: "new"; corrective?: boolean }
  | { kind: "edit"; id: string }
  | null;

function formatPct(n: number | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/**
 * Detalhe do equipamento: status, cadastro, manutenções e paradas.
 */
export function EquipmentDetailClient({ equipmentId }: { equipmentId: string }) {
  const { can, profile } = useFactoryRole();
  const canManage = can("manageEquipment");
  const actor = profile?.email ?? profile?.uid;
  const { data, reload: reloadHistory } = useEquipmentManagementData();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [currentLot, setCurrentLot] = useState<ProductionLot | null>(null);
  const [tab, setTab] = useState<Tab>("geral");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [releaseNote, setReleaseNote] = useState<string>("");
  const [form, setForm] = useState<FormState>(null);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);

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
          (s) => s.equipmentId === found.id && s.status === "IN_PROGRESS",
        );
        setCurrentLot(active ? await getLotById(db, active.lotId) : null);
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

  const maintenance = useMemo(
    () => data.maintenance.filter((m) => m.equipmentId === equipmentId),
    [data.maintenance, equipmentId],
  );
  const downtimes = useMemo(
    () => data.downtimes.filter((d) => d.equipmentId === equipmentId),
    [data.downtimes, equipmentId],
  );
  const metrics30 = useMemo(
    () => computeEquipmentMetrics(data, equipmentPeriodPreset(30), equipmentId),
    [data, equipmentId],
  );
  const upcoming = useMemo(
    () => nextMaintenanceByEquipment(maintenance).get(equipmentId),
    [maintenance, equipmentId],
  );
  const selectedMaintenance = selectedMaintenanceId
    ? maintenance.find((m) => m.id === selectedMaintenanceId) ?? null
    : null;
  const editingMaintenance =
    form?.kind === "edit" ? maintenance.find((m) => m.id === form.id) ?? null : null;

  function notify(text: string) {
    setError(null);
    setMessage(text);
    void load({ silent: true });
    void reloadHistory({ silent: true });
  }

  function fail(text: string) {
    setMessage(null);
    setError(text);
  }

  async function handleStop(input: Omit<StopEquipmentInput, "actor">): Promise<boolean> {
    if (!equipment) return false;
    setBusy(true);
    try {
      await stopEquipment(getFirestoreDb(), equipment.id, { ...input, actor });
      notify("Equipamento parado — parada aberta no histórico.");
      return true;
    } catch (err) {
      fail(err instanceof Error ? err.message : "Falha ao parar");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (!equipment) return;
    setBusy(true);
    try {
      await releaseEquipment(getFirestoreDb(), equipment.id, {
        resolutionNote: releaseNote,
        actor,
      });
      setReleaseNote("");
      notify("Equipamento liberado — parada encerrada.");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Falha ao liberar");
    } finally {
      setBusy(false);
    }
  }

  async function handleMaintenanceSubmit(input: MaintenanceInput) {
    setBusy(true);
    try {
      const db = getFirestoreDb();
      if (form?.kind === "edit") {
        await updateMaintenance(db, form.id, input);
        setSelectedMaintenanceId(form.id);
        notify("Manutenção atualizada.");
      } else {
        const created = await scheduleMaintenance(db, input, actor);
        if (form?.corrective) {
          await startMaintenance(db, created.id, actor);
          notify("Corretiva aberta — equipamento em MANUTENÇÃO.");
        } else {
          notify("Manutenção agendada.");
        }
        setSelectedMaintenanceId(created.id);
      }
      setForm(null);
      setTab("maintenance");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Falha ao salvar");
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
          eyebrow="Equipamentos"
          title="Equipamento"
          actions={
            <Button href="/app/equipment" variant="secondary" size="sm">
              ← Equipamentos
            </Button>
          }
        />
        <CockpitEmpty
          title={error ?? "Não encontrado"}
          detail="Volte à lista operacional ou ao cadastro."
          action={<Button href="/app/equipment">Ver equipamentos</Button>}
        />
      </div>
    );
  }

  const station = equipment.stationId ? getStation(equipment.stationId) : undefined;
  const inMaintenance = Boolean(equipment.currentMaintenanceId);
  const canStop =
    canManage &&
    equipment.active &&
    equipment.status !== "STOPPED" &&
    equipment.status !== "OPERATING" &&
    equipment.status !== "MAINTENANCE" &&
    equipment.status !== "UNAVAILABLE";
  const canRelease =
    canManage &&
    !inMaintenance &&
    (equipment.status === "STOPPED" ||
      equipment.status === "MAINTENANCE" ||
      equipment.status === "UNAVAILABLE");

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Equipamentos"
        title={`${equipment.code} · ${equipment.name}`}
        description={`${equipmentTypeLabel(equipment.type)}${
          station ? ` · ${station.label}` : ""
        } · ${equipmentStatusLabel(equipment.status)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/app/equipment" variant="secondary" size="sm">
              ← Equipamentos
            </Button>
            <Button href="/app/settings/equipment" variant="secondary" size="sm">
              Editar cadastro
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Disponibilidade 30 dias"
          value={formatPct(metrics30.availabilityPercent)}
          detail="Base 24 h/dia"
        />
        <StatTile
          label="Tempo parado 30 dias"
          value={formatDurationMinutes(metrics30.downtimeMinutes)}
          detail={`${metrics30.downtimeCount} parada(s)`}
        />
        <StatTile
          label="Tempo médio de reparo"
          value={formatDurationMinutes(metrics30.mttrMinutes)}
          detail="MTTR · últimos 30 dias"
        />
        <StatTile
          label="Próxima manutenção"
          value={upcoming ? formatDateBr(upcoming.scheduledDate) : "—"}
          detail={
            upcoming
              ? `${isMaintenanceOverdue(upcoming) ? "Atrasada · " : ""}${upcoming.title}`
              : "Nenhuma agendada"
          }
          tone={upcoming && isMaintenanceOverdue(upcoming) ? "critical" : "ink"}
        />
      </div>

      <SegmentedControl
        activeId={tab}
        onSelect={(id) => setTab(id as Tab)}
        items={[
          { id: "geral", label: "Geral" },
          { id: "maintenance", label: "Manutenções", count: maintenance.length },
          { id: "downtime", label: "Paradas", count: downtimes.length },
        ]}
      />

      {message ? <Alert tone="good">{message}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      {tab === "geral" ? (
        <>
          <Card className="px-5 py-5">
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
                {currentLot.currentStep ? ` · ${stepTypeLabel(currentLot.currentStep)}` : ""}
              </p>
            ) : (
              <p className="mt-3 text-sm text-dc-text-secondary">
                Nenhum lote em execução neste equipamento.
              </p>
            )}
            {equipment.stoppedAt ? (
              <p className="mt-2 text-xs text-dc-text-muted">
                Parado desde {formatDateTimeBr(equipment.stoppedAt)}
                {equipment.stopCategory
                  ? ` · ${downtimeCategoryLabel(equipment.stopCategory)}`
                  : ""}
                {equipment.stopReason ? ` · ${equipment.stopReason}` : ""}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-dc-text-muted">
              Etapas aplicáveis: {equipment.applicableStepTypes.map(stepTypeLabel).join(" · ")}
            </p>

            <div className="mt-4 border-t border-[var(--border)] pt-4">
              {!canManage ? (
                <AccessDeniedNote action="parar/liberar" />
              ) : (
                <div className="space-y-3">
                  {canStop ? (
                    <StopEquipmentForm busy={busy} onStop={handleStop} />
                  ) : null}
                  {canRelease ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="O que foi feito para resolver (opcional)"
                        value={releaseNote}
                        onChange={(e) => setReleaseNote(e.target.value)}
                        className="h-10 min-w-[14rem] flex-1 rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm outline-none focus:border-dc-orange"
                      />
                      <Button disabled={busy} onClick={() => void handleRelease()}>
                        Liberar equipamento
                      </Button>
                    </div>
                  ) : null}
                  {inMaintenance ? (
                    <p className="text-xs text-dc-text-muted">
                      Em manutenção — conclua a manutenção na aba Manutenções para liberar.
                    </p>
                  ) : null}
                  {equipment.status === "OPERATING" ? (
                    <p className="text-xs text-dc-text-muted">
                      Em uso — finalize a etapa no Floor antes de registrar parada.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy || inMaintenance || equipment.status === "OPERATING"}
                      onClick={() => {
                        setForm({ kind: "new", corrective: true });
                        setTab("maintenance");
                      }}
                    >
                      Abrir corretiva
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setForm({ kind: "new" });
                        setTab("maintenance");
                      }}
                    >
                      Agendar manutenção
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="px-5 py-5">
            <p className="dc-eyebrow">Capacidade e informações gerais</p>
            <dl className="mt-3 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Capacidade" value={formatEquipmentCapacity(equipment)} />
              <InfoItem
                label="Potência"
                value={
                  equipment.powerKw != null
                    ? `${equipment.powerKw.toLocaleString("pt-BR")} kW`
                    : null
                }
              />
              <InfoItem label="Fabricante" value={equipment.manufacturer} />
              <InfoItem label="Modelo" value={equipment.model} />
              <InfoItem label="Nº de série" value={equipment.serialNumber} />
              <InfoItem
                label="Instalação"
                value={equipment.installedAt?.split("-").reverse().join("/")}
              />
              <InfoItem label="Localização" value={equipment.location} />
            </dl>
            {equipment.notes ? (
              <p className="mt-3 whitespace-pre-line border-t border-dc-border/60 pt-3 text-sm text-dc-text-secondary">
                {equipment.notes}
              </p>
            ) : null}
          </Card>
        </>
      ) : null}

      {tab === "maintenance" ? (
        <div className="space-y-4">
          {canManage && !form ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setForm({ kind: "new" })}>
                + Agendar manutenção
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={inMaintenance || equipment.status === "OPERATING"}
                onClick={() => setForm({ kind: "new", corrective: true })}
              >
                Abrir corretiva agora
              </Button>
            </div>
          ) : null}

          {form ? (
            <Card className="px-5 py-5">
              <p className="text-sm font-semibold tracking-tight text-[var(--ink)]">
                {form.kind === "edit"
                  ? "Editar manutenção"
                  : form.corrective
                    ? "Abrir manutenção corretiva"
                    : "Agendar manutenção"}
              </p>
              <div className="mt-4">
                <MaintenanceForm
                  key={form.kind === "edit" ? form.id : `new-${form.corrective ? "c" : "p"}`}
                  equipment={[equipment]}
                  maintenance={editingMaintenance ?? undefined}
                  defaultEquipmentId={equipment.id}
                  defaultType={form.kind === "new" && form.corrective ? "CORRECTIVE" : undefined}
                  submitLabel={
                    form.kind === "new" && form.corrective ? "Abrir e iniciar corretiva" : undefined
                  }
                  busy={busy}
                  onSubmit={handleMaintenanceSubmit}
                  onCancel={() => setForm(null)}
                />
              </div>
            </Card>
          ) : null}

          {selectedMaintenance ? (
            <MaintenanceDetailPanel
              key={`${selectedMaintenance.id}-${selectedMaintenance.status}`}
              maintenance={selectedMaintenance}
              equipment={equipment}
              canManage={canManage}
              actor={actor}
              onEdit={() => setForm({ kind: "edit", id: selectedMaintenance.id })}
              onClose={() => setSelectedMaintenanceId(null)}
              onDone={notify}
              onError={fail}
            />
          ) : null}

          <MaintenanceList
            maintenance={maintenance}
            selectedId={selectedMaintenanceId}
            onSelect={(m) => setSelectedMaintenanceId(m.id)}
            showEquipment={false}
          />
        </div>
      ) : null}

      {tab === "downtime" ? (
        <DowntimeList
          downtimes={downtimes}
          canManage={canManage}
          actor={actor}
          showEquipment={false}
          onDone={notify}
          onError={fail}
        />
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-dc-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-dc-text">{value || "—"}</dd>
    </div>
  );
}
