"use client";

import { useMemo, useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { EquipmentSubnav } from "@/components/equipment/EquipmentSubnav";
import {
  MaintenanceCalendar,
  currentCalendarMonth,
  type CalendarMonth,
} from "@/components/equipment/MaintenanceCalendar";
import { MaintenanceDetailPanel } from "@/components/equipment/MaintenanceDetailPanel";
import { MaintenanceForm } from "@/components/equipment/MaintenanceForm";
import { MaintenanceList } from "@/components/equipment/MaintenanceList";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  Card,
  SegmentedControl,
  Select,
  StatTile,
} from "@/components/ui";
import { useEquipmentManagementData } from "@/hooks/useEquipmentManagementData";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  MAINTENANCE_TYPES,
  isMaintenanceOverdue,
  localDayKey,
  maintenanceTypeLabel,
} from "@/lib/labels/maintenance";
import {
  scheduleMaintenance,
  startMaintenance,
  updateMaintenance,
  type MaintenanceInput,
} from "@/services/equipment-maintenance.service";
import type { MaintenanceType } from "@/types/equipment";

type View = "calendar" | "list";

type FormState =
  | { kind: "new"; date?: string; corrective?: boolean }
  | { kind: "edit"; id: string }
  | null;

export function MaintenanceClient() {
  const { can, profile } = useFactoryRole();
  const canManage = can("manageEquipment");
  const actor = profile?.email ?? profile?.uid;
  const { data, loading, error, reload } = useEquipmentManagementData();

  const [view, setView] = useState<View>("calendar");
  const [month, setMonth] = useState<CalendarMonth>(currentCalendarMonth);
  const [equipmentFilter, setEquipmentFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeEquipment = useMemo(
    () => data.equipment.filter((eq) => eq.active),
    [data.equipment],
  );
  const equipmentById = useMemo(
    () => new Map(data.equipment.map((eq) => [eq.id, eq])),
    [data.equipment],
  );

  const filtered = useMemo(
    () =>
      data.maintenance.filter(
        (m) =>
          (!equipmentFilter || m.equipmentId === equipmentFilter) &&
          (!typeFilter || m.type === typeFilter),
      ),
    [data.maintenance, equipmentFilter, typeFilter],
  );

  const counts = useMemo(() => {
    const today = localDayKey();
    const week = new Date();
    week.setDate(week.getDate() + 7);
    const weekKey = localDayKey(week);
    const monthPrefix = today.slice(0, 7);
    return {
      overdue: filtered.filter((m) => isMaintenanceOverdue(m, today)).length,
      inProgress: filtered.filter((m) => m.status === "IN_PROGRESS").length,
      upcoming: filtered.filter(
        (m) =>
          m.status === "SCHEDULED" &&
          m.scheduledDate >= today &&
          m.scheduledDate <= weekKey,
      ).length,
      completedMonth: filtered.filter(
        (m) =>
          m.status === "COMPLETED" &&
          m.completedAt &&
          localDayKey(new Date(m.completedAt)).startsWith(monthPrefix),
      ).length,
    };
  }, [filtered]);

  const selected = selectedId
    ? data.maintenance.find((m) => m.id === selectedId) ?? null
    : null;
  const editing =
    form?.kind === "edit"
      ? data.maintenance.find((m) => m.id === form.id) ?? null
      : null;

  function notify(text: string) {
    setActionError(null);
    setMessage(text);
    void reload({ silent: true });
  }

  function fail(text: string) {
    setMessage(null);
    setActionError(text);
  }

  async function handleSubmit(input: MaintenanceInput) {
    setBusy(true);
    setMessage(null);
    setActionError(null);
    try {
      const db = getFirestoreDb();
      if (form?.kind === "edit") {
        await updateMaintenance(db, form.id, input);
        notify("Manutenção atualizada.");
        setSelectedId(form.id);
      } else {
        const created = await scheduleMaintenance(db, input, actor);
        if (form?.corrective) {
          await startMaintenance(db, created.id, actor);
          notify(`Corretiva aberta — ${created.equipmentCode} em MANUTENÇÃO.`);
        } else {
          notify("Manutenção agendada.");
        }
        setSelectedId(created.id);
      }
      setForm(null);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Equipamentos"
        title="Manutenções"
        description="Calendário de preventivas, corretivas em andamento e histórico de serviços."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setForm({ kind: "new", corrective: true })}
              >
                Abrir corretiva agora
              </Button>
              <Button size="sm" onClick={() => setForm({ kind: "new" })}>
                + Agendar manutenção
              </Button>
            </div>
          ) : null
        }
      />

      <EquipmentSubnav />

      {!canManage ? <AccessDeniedNote action="gerir manutenções" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Atrasadas"
          value={counts.overdue}
          tone={counts.overdue > 0 ? "critical" : "ink"}
        />
        <StatTile
          label="Em execução"
          value={counts.inProgress}
          tone={counts.inProgress > 0 ? "warning" : "ink"}
        />
        <StatTile label="Próximos 7 dias" value={counts.upcoming} />
        <StatTile label="Concluídas no mês" value={counts.completedMonth} />
      </div>

      {message ? <Alert tone="good">{message}</Alert> : null}
      {error || actionError ? (
        <Alert tone="critical">{actionError ?? error}</Alert>
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
          {form.kind === "new" && form.corrective ? (
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              A corretiva é aberta para hoje e já iniciada: o equipamento fica em
              MANUTENÇÃO e sai da fila do chão de fábrica até a conclusão.
            </p>
          ) : null}
          <div className="mt-4">
            <MaintenanceForm
              key={
                form.kind === "edit"
                  ? form.id
                  : `new-${form.date ?? ""}-${form.corrective ? "c" : "p"}`
              }
              equipment={activeEquipment}
              maintenance={editing ?? undefined}
              defaultEquipmentId={equipmentFilter || undefined}
              defaultDate={form.kind === "new" ? form.date : undefined}
              defaultType={
                form.kind === "new" && form.corrective ? "CORRECTIVE" : undefined
              }
              submitLabel={
                form.kind === "new" && form.corrective
                  ? "Abrir e iniciar corretiva"
                  : undefined
              }
              busy={busy}
              onSubmit={handleSubmit}
              onCancel={() => setForm(null)}
            />
          </div>
        </Card>
      ) : null}

      {selected ? (
        <MaintenanceDetailPanel
          key={`${selected.id}-${selected.status}`}
          maintenance={selected}
          equipment={equipmentById.get(selected.equipmentId)}
          canManage={canManage}
          actor={actor}
          onEdit={() => setForm({ kind: "edit", id: selected.id })}
          onClose={() => setSelectedId(null)}
          onDone={notify}
          onError={fail}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          activeId={view}
          onSelect={(id) => setView(id as View)}
          items={[
            { id: "calendar", label: "Calendário" },
            { id: "list", label: "Lista e histórico" },
          ]}
        />
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
            className="w-auto min-w-[10rem]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MaintenanceType | "")}
            aria-label="Filtrar tipo"
          >
            <option value="">Todos os tipos</option>
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {maintenanceTypeLabel(t)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
      ) : view === "calendar" ? (
        <MaintenanceCalendar
          month={month}
          maintenance={filtered}
          selectedId={selectedId}
          onMonthChange={setMonth}
          onSelect={(m) => setSelectedId(m.id)}
          onDayClick={
            canManage ? (day) => setForm({ kind: "new", date: day }) : undefined
          }
        />
      ) : (
        <MaintenanceList
          maintenance={filtered}
          selectedId={selectedId}
          onSelect={(m) => setSelectedId(m.id)}
        />
      )}
    </div>
  );
}
