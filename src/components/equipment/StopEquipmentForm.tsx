"use client";

import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import {
  DOWNTIME_CATEGORIES,
  downtimeCategoryLabel,
} from "@/lib/labels/maintenance";
import type { StopEquipmentInput } from "@/services/equipment-ops.service";
import type { DowntimeCategory } from "@/types/equipment";

/** Categoria + motivo da parada. O histórico usa a categoria nos indicadores. */
export function StopEquipmentForm({
  busy,
  onStop,
  compact = false,
}: {
  busy: boolean;
  onStop: (input: Omit<StopEquipmentInput, "actor">) => Promise<boolean>;
  compact?: boolean;
}) {
  const [category, setCategory] = useState<DowntimeCategory>("MECHANICAL_FAILURE");
  const [reason, setReason] = useState<string>("");

  async function handleStop() {
    const ok = await onStop({ category, reason });
    if (ok) setReason("");
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Select
        value={category}
        onChange={(e) => setCategory(e.target.value as DowntimeCategory)}
        className={compact ? "h-9 w-auto min-w-[11rem] text-xs" : "w-auto min-w-[12rem]"}
        aria-label="Categoria da parada"
      >
        {DOWNTIME_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {downtimeCategoryLabel(c)}
          </option>
        ))}
      </Select>
      <Input
        type="text"
        placeholder="Detalhe do motivo (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={compact ? "h-9 min-w-[10rem] flex-1 text-xs" : "min-w-[12rem] flex-1"}
      />
      <Button
        variant="destructive"
        size="sm"
        disabled={busy}
        onClick={() => void handleStop()}
      >
        Registrar parada
      </Button>
    </div>
  );
}
