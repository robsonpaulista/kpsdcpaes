"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_TYPES,
  localDayKey,
  maintenancePriorityLabel,
  maintenanceTypeLabel,
} from "@/lib/labels/maintenance";
import type { MaintenanceInput } from "@/services/equipment-maintenance.service";
import type {
  Equipment,
  EquipmentMaintenance,
  MaintenancePriority,
  MaintenanceType,
} from "@/types/equipment";

type Draft = {
  equipmentId: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedMinutes: string;
  responsible: string;
  provider: string;
  recurrenceDays: string;
};

const RECURRENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Não repetir" },
  { value: "7", label: "Semanal (7 dias)" },
  { value: "15", label: "Quinzenal (15 dias)" },
  { value: "30", label: "Mensal (30 dias)" },
  { value: "60", label: "Bimestral (60 dias)" },
  { value: "90", label: "Trimestral (90 dias)" },
  { value: "180", label: "Semestral (180 dias)" },
  { value: "365", label: "Anual (365 dias)" },
];

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]";

function toDraft(
  maintenance?: EquipmentMaintenance,
  defaults?: {
    equipmentId?: string;
    scheduledDate?: string;
    type?: MaintenanceType;
  },
): Draft {
  return {
    equipmentId: maintenance?.equipmentId ?? defaults?.equipmentId ?? "",
    type: maintenance?.type ?? defaults?.type ?? "PREVENTIVE",
    priority:
      maintenance?.priority ?? (defaults?.type === "CORRECTIVE" ? "HIGH" : "MEDIUM"),
    title: maintenance?.title ?? "",
    description: maintenance?.description ?? "",
    scheduledDate:
      maintenance?.scheduledDate ?? defaults?.scheduledDate ?? localDayKey(),
    scheduledTime: maintenance?.scheduledTime ?? "",
    estimatedMinutes:
      maintenance?.estimatedMinutes != null
        ? String(maintenance.estimatedMinutes)
        : "",
    responsible: maintenance?.responsible ?? "",
    provider: maintenance?.provider ?? "",
    recurrenceDays:
      maintenance?.recurrenceDays != null ? String(maintenance.recurrenceDays) : "",
  };
}

function parseOptionalInt(value: string): number | undefined {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function MaintenanceForm({
  equipment,
  maintenance,
  defaultEquipmentId,
  defaultDate,
  defaultType,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  equipment: Equipment[];
  maintenance?: EquipmentMaintenance;
  defaultEquipmentId?: string;
  defaultDate?: string;
  defaultType?: MaintenanceType;
  submitLabel?: string;
  busy: boolean;
  onSubmit: (input: MaintenanceInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(maintenance, {
      equipmentId: defaultEquipmentId,
      scheduledDate: defaultDate,
      type: defaultType,
    }),
  );
  const recurrenceIsPreset = RECURRENCE_OPTIONS.some(
    (o) => o.value === draft.recurrenceDays,
  );

  function patch(next: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onSubmit({
      equipmentId: draft.equipmentId,
      type: draft.type,
      priority: draft.priority,
      title: draft.title,
      description: draft.description,
      scheduledDate: draft.scheduledDate,
      scheduledTime: draft.scheduledTime || undefined,
      estimatedMinutes: parseOptionalInt(draft.estimatedMinutes),
      responsible: draft.responsible,
      provider: draft.provider,
      recurrenceDays: parseOptionalInt(draft.recurrenceDays),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={`${labelClass} sm:col-span-2`}>
          Equipamento *
          <Select
            className="mt-1.5"
            value={draft.equipmentId}
            onChange={(e) => patch({ equipmentId: e.target.value })}
            required
          >
            <option value="">Selecione</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.code} · {eq.name}
              </option>
            ))}
          </Select>
        </label>
        <label className={labelClass}>
          Tipo
          <Select
            className="mt-1.5"
            value={draft.type}
            onChange={(e) => patch({ type: e.target.value as MaintenanceType })}
          >
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {maintenanceTypeLabel(t)}
              </option>
            ))}
          </Select>
        </label>
        <label className={labelClass}>
          Prioridade
          <Select
            className="mt-1.5"
            value={draft.priority}
            onChange={(e) =>
              patch({ priority: e.target.value as MaintenancePriority })
            }
          >
            {MAINTENANCE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {maintenancePriorityLabel(p)}
              </option>
            ))}
          </Select>
        </label>
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          Título *
          <Input
            className="mt-1.5"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Ex.: Lubrificação e troca de correias"
            required
          />
        </label>
        <label className={labelClass}>
          Data *
          <Input
            type="date"
            className="mt-1.5"
            value={draft.scheduledDate}
            onChange={(e) => patch({ scheduledDate: e.target.value })}
            required
          />
        </label>
        <label className={labelClass}>
          Hora
          <Input
            type="time"
            className="mt-1.5"
            value={draft.scheduledTime}
            onChange={(e) => patch({ scheduledTime: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Duração estimada (min)
          <Input
            type="number"
            min={1}
            className="mt-1.5"
            value={draft.estimatedMinutes}
            onChange={(e) => patch({ estimatedMinutes: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Repetição
          <Select
            className="mt-1.5"
            value={recurrenceIsPreset ? draft.recurrenceDays : "custom"}
            onChange={(e) =>
              patch({
                recurrenceDays:
                  e.target.value === "custom" ? "45" : e.target.value,
              })
            }
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value="custom">Personalizado…</option>
          </Select>
        </label>
        {!recurrenceIsPreset ? (
          <label className={labelClass}>
            A cada (dias)
            <Input
              type="number"
              min={1}
              className="mt-1.5"
              value={draft.recurrenceDays}
              onChange={(e) => patch({ recurrenceDays: e.target.value })}
            />
          </label>
        ) : null}
        <label className={labelClass}>
          Responsável
          <Input
            className="mt-1.5"
            value={draft.responsible}
            onChange={(e) => patch({ responsible: e.target.value })}
            placeholder="Técnico / equipe"
          />
        </label>
        <label className={labelClass}>
          Prestador
          <Input
            className="mt-1.5"
            value={draft.provider}
            onChange={(e) => patch({ provider: e.target.value })}
            placeholder="Empresa externa (opcional)"
          />
        </label>
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          Descrição / checklist
          <Textarea
            className="mt-1.5"
            rows={3}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="O que deve ser feito, peças previstas, cuidados…"
          />
        </label>
      </div>
      {draft.recurrenceDays ? (
        <p className="text-xs text-[var(--ink-2)]">
          Ao concluir, a próxima será agendada automaticamente{" "}
          {draft.recurrenceDays} dias depois da conclusão.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy
            ? "Salvando…"
            : submitLabel ?? (maintenance ? "Salvar alterações" : "Agendar manutenção")}
        </Button>
      </div>
    </form>
  );
}
