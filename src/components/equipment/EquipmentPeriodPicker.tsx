"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { formatDateBr } from "@/lib/format/date";
import {
  equipmentPeriodPreset,
  type EquipmentPeriod,
} from "@/services/equipment-management.service";

export function EquipmentPeriodPicker({
  period,
  onChange,
  onInvalid,
}: {
  period: EquipmentPeriod;
  onChange: (next: EquipmentPeriod) => void;
  onInvalid: (message: string) => void;
}) {
  const [draft, setDraft] = useState<EquipmentPeriod>(period);

  function applyPreset(days: number) {
    const next = equipmentPeriodPreset(days);
    setDraft(next);
    onChange(next);
  }

  function applyDraft() {
    const next = {
      dateFrom: draft.dateFrom || period.dateFrom,
      dateTo: draft.dateTo || draft.dateFrom || period.dateTo,
    };
    if (next.dateFrom > next.dateTo) {
      onInvalid("A data inicial não pode ser depois da final.");
      return;
    }
    onChange(next);
  }

  const label =
    period.dateFrom === period.dateTo
      ? formatDateBr(period.dateFrom)
      : `${formatDateBr(period.dateFrom)} – ${formatDateBr(period.dateTo)}`;

  return (
    <section
      className="rounded-[14px] border border-dc-border bg-dc-surface p-4 sm:p-5"
      aria-label="Período"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
            Período
          </h2>
          <p className="mt-0.5 text-xs text-dc-text-secondary">Analisando {label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => applyPreset(1)}>
            Hoje
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset(7)}>
            7 dias
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset(30)}>
            30 dias
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset(90)}>
            90 dias
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
          De
          <Input
            type="date"
            className="mt-1.5"
            value={draft.dateFrom}
            onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
          Até
          <Input
            type="date"
            className="mt-1.5"
            value={draft.dateTo}
            onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
          />
        </label>
        <div className="flex items-end">
          <Button size="sm" onClick={applyDraft}>
            Aplicar
          </Button>
        </div>
      </div>
    </section>
  );
}
