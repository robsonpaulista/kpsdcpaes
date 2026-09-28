"use client";

import { useState, type FormEvent } from "react";
import {
  DEFAULT_PROCESS_ROUTE,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { FACTORY_STATIONS } from "@/domain/production/stations";
import {
  EQUIPMENT_CAPACITY_UNITS,
  EQUIPMENT_TYPES,
  equipmentCapacityUnitLabel,
  equipmentTypeLabel,
} from "@/lib/labels/equipment";
import type { EquipmentProfileInput } from "@/services/equipment-ops.service";
import type {
  Equipment,
  EquipmentCapacityUnit,
  EquipmentType,
} from "@/types/equipment";
import type { StepType } from "@/types/production";

type Draft = {
  code: string;
  name: string;
  type: EquipmentType;
  stationId: string;
  applicableStepTypes: StepType[];
  active: boolean;
  capacity: string;
  capacityUnit: EquipmentCapacityUnit | "";
  manufacturer: string;
  model: string;
  serialNumber: string;
  installedAt: string;
  powerKw: string;
  location: string;
  notes: string;
};

const STEP_TYPES: StepType[] = DEFAULT_PROCESS_ROUTE.map((s) => s.stepType);

const inputClass =
  "mt-1 h-10 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 text-sm text-dc-text outline-none focus:border-dc-orange";

function toDraft(equipment?: Equipment): Draft {
  return {
    code: equipment?.code ?? "",
    name: equipment?.name ?? "",
    type: equipment?.type ?? "MIXER",
    stationId: equipment?.stationId ?? "",
    applicableStepTypes: equipment?.applicableStepTypes ?? [],
    active: equipment?.active ?? true,
    capacity: equipment?.capacity != null ? String(equipment.capacity) : "",
    capacityUnit: equipment?.capacityUnit ?? "",
    manufacturer: equipment?.manufacturer ?? "",
    model: equipment?.model ?? "",
    serialNumber: equipment?.serialNumber ?? "",
    installedAt: equipment?.installedAt ?? "",
    powerKw: equipment?.powerKw != null ? String(equipment.powerKw) : "",
    location: equipment?.location ?? "",
    notes: equipment?.notes ?? "",
  };
}

function parseNumber(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInput(draft: Draft): EquipmentProfileInput {
  return {
    code: draft.code,
    name: draft.name,
    type: draft.type,
    stationId: draft.stationId || undefined,
    applicableStepTypes: draft.applicableStepTypes,
    active: draft.active,
    capacity: parseNumber(draft.capacity),
    capacityUnit: draft.capacityUnit || undefined,
    manufacturer: draft.manufacturer,
    model: draft.model,
    serialNumber: draft.serialNumber,
    installedAt: draft.installedAt,
    powerKw: parseNumber(draft.powerKw),
    location: draft.location,
    notes: draft.notes,
  };
}

export function EquipmentProfileForm({
  equipment,
  busy,
  onSubmit,
  onCancel,
}: {
  equipment?: Equipment;
  busy: boolean;
  onSubmit: (input: EquipmentProfileInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(equipment));

  function patch(next: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function toggleStep(stepType: StepType) {
    setDraft((prev) => ({
      ...prev,
      applicableStepTypes: prev.applicableStepTypes.includes(stepType)
        ? prev.applicableStepTypes.filter((s) => s !== stepType)
        : [...prev.applicableStepTypes, stepType],
    }));
  }

  function handleStationChange(stationId: string) {
    const station = FACTORY_STATIONS.find((s) => s.id === stationId);
    setDraft((prev) => ({
      ...prev,
      stationId,
      applicableStepTypes:
        station && !prev.applicableStepTypes.includes(station.stepType)
          ? [...prev.applicableStepTypes, station.stepType]
          : prev.applicableStepTypes,
    }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onSubmit(toInput(draft));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="dc-eyebrow">Identificação</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-dc-text-muted">
            Código *
            <input
              value={draft.code}
              onChange={(e) => patch({ code: e.target.value })}
              placeholder="Ex.: FO03"
              className={`${inputClass} uppercase tabular-nums`}
              required
            />
          </label>
          <label className="text-xs text-dc-text-muted sm:col-span-1 lg:col-span-2">
            Nome *
            <input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Ex.: Forno 03"
              className={inputClass}
              required
            />
          </label>
          <label className="text-xs text-dc-text-muted">
            Tipo
            <select
              value={draft.type}
              onChange={(e) => patch({ type: e.target.value as EquipmentType })}
              className={inputClass}
            >
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {equipmentTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-dc-text-muted lg:col-span-2">
            Estação
            <select
              value={draft.stationId}
              onChange={(e) => handleStationChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Sem estação</option>
              {FACTORY_STATIONS.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.label} · {stepTypeLabel(station.stepType)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-dc-text">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => patch({ active: e.target.checked })}
              className="size-4 accent-dc-orange"
            />
            Cadastro ativo
          </label>
        </div>
        <div>
          <p className="text-xs text-dc-text-muted">Etapas aplicáveis *</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STEP_TYPES.map((stepType) => {
              const checked = draft.applicableStepTypes.includes(stepType);
              return (
                <button
                  key={stepType}
                  type="button"
                  onClick={() => toggleStep(stepType)}
                  className={`h-8 rounded-full border px-3 text-xs font-medium transition ${
                    checked
                      ? "border-dc-orange bg-dc-orange/10 text-dc-orange"
                      : "border-dc-border text-dc-text-secondary hover:border-dc-orange/50"
                  }`}
                >
                  {stepTypeLabel(stepType)}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="dc-eyebrow">Capacidade</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-dc-text-muted">
            Capacidade nominal
            <input
              inputMode="decimal"
              value={draft.capacity}
              onChange={(e) => patch({ capacity: e.target.value })}
              placeholder="Ex.: 120"
              className={`${inputClass} tabular-nums`}
            />
          </label>
          <label className="text-xs text-dc-text-muted">
            Unidade
            <select
              value={draft.capacityUnit}
              onChange={(e) =>
                patch({
                  capacityUnit: e.target.value as EquipmentCapacityUnit | "",
                })
              }
              className={inputClass}
            >
              <option value="">Selecione</option>
              {EQUIPMENT_CAPACITY_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {equipmentCapacityUnitLabel(unit)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-dc-text-muted">
            Potência (kW)
            <input
              inputMode="decimal"
              value={draft.powerKw}
              onChange={(e) => patch({ powerKw: e.target.value })}
              placeholder="Ex.: 18,5"
              className={`${inputClass} tabular-nums`}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="dc-eyebrow">Informações gerais</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-dc-text-muted">
            Fabricante
            <input
              value={draft.manufacturer}
              onChange={(e) => patch({ manufacturer: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-xs text-dc-text-muted">
            Modelo
            <input
              value={draft.model}
              onChange={(e) => patch({ model: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-xs text-dc-text-muted">
            Nº de série
            <input
              value={draft.serialNumber}
              onChange={(e) => patch({ serialNumber: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
          </label>
          <label className="text-xs text-dc-text-muted">
            Data de instalação
            <input
              type="date"
              value={draft.installedAt}
              onChange={(e) => patch({ installedAt: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-xs text-dc-text-muted sm:col-span-2">
            Localização
            <input
              value={draft.location}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder="Ex.: Galpão 1 · linha A"
              className={inputClass}
            />
          </label>
          <label className="text-xs text-dc-text-muted sm:col-span-2 lg:col-span-4">
            Observações
            <textarea
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
              placeholder="Manutenção preventiva, restrições de uso, contatos técnicos…"
              className="mt-1 w-full rounded-[12px] border border-dc-border bg-dc-bg px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-orange"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2 border-t border-dc-border/60 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="dc-btn-secondary h-10 px-4 text-sm disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="dc-btn-primary h-10 px-4 text-sm disabled:opacity-50"
        >
          {busy ? "Salvando…" : equipment ? "Salvar alterações" : "Cadastrar equipamento"}
        </button>
      </div>
    </form>
  );
}
