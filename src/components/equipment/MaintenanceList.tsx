"use client";

import { useMemo } from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatBrl } from "@/domain/cockpit/format-dashboard";
import { formatDateBr } from "@/lib/format/date";
import { cn } from "@/lib/ui/cn";
import {
  formatDurationMinutes,
  isMaintenanceOverdue,
  localDayKey,
  maintenanceStatusLabel,
  maintenanceTone,
  maintenanceTypeLabel,
} from "@/lib/labels/maintenance";
import type { EquipmentMaintenance } from "@/types/equipment";

type Group = { id: string; title: string; items: EquipmentMaintenance[] };

/** Atrasadas, em execução, próximas e histórico (concluídas/canceladas). */
export function MaintenanceList({
  maintenance,
  selectedId,
  onSelect,
  showEquipment = true,
}: {
  maintenance: EquipmentMaintenance[];
  selectedId: string | null;
  onSelect: (maintenance: EquipmentMaintenance) => void;
  showEquipment?: boolean;
}) {
  const groups = useMemo<Group[]>(() => {
    const today = localDayKey();
    const history = maintenance
      .filter((m) => m.status === "COMPLETED" || m.status === "CANCELLED")
      .sort((a, b) =>
        (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
      );
    return [
      {
        id: "overdue",
        title: "Atrasadas",
        items: maintenance.filter((m) => isMaintenanceOverdue(m, today)),
      },
      {
        id: "progress",
        title: "Em execução",
        items: maintenance.filter((m) => m.status === "IN_PROGRESS"),
      },
      {
        id: "upcoming",
        title: "Próximas",
        items: maintenance.filter(
          (m) => m.status === "SCHEDULED" && m.scheduledDate >= today,
        ),
      },
      { id: "history", title: "Histórico", items: history },
    ].filter((g) => g.items.length > 0);
  }, [maintenance]);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="Nenhuma manutenção"
        detail="Agende preventivas ou abra uma corretiva para começar o histórico."
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {group.title} · {group.items.length}
          </h3>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
            {group.items.map((m) => {
              const tone = maintenanceTone(m);
              const done = m.status === "COMPLETED";
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    className={cn(
                      "flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]",
                      selectedId === m.id && "bg-[var(--surface-2)]",
                    )}
                  >
                    <div className="w-20 shrink-0 font-mono text-xs tabular-nums text-[var(--ink-2)]">
                      {formatDateBr(
                        done && m.completedAt
                          ? localDayKey(new Date(m.completedAt))
                          : m.scheduledDate,
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">
                        {showEquipment ? (
                          <span className="font-mono">{m.equipmentCode} · </span>
                        ) : null}
                        {m.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {maintenanceTypeLabel(m.type)}
                        {m.responsible ? ` · ${m.responsible}` : ""}
                        {done && m.durationMinutes
                          ? ` · ${formatDurationMinutes(m.durationMinutes)}`
                          : ""}
                        {done && m.cost != null ? ` · ${formatBrl(m.cost)}` : ""}
                        {m.status === "CANCELLED" && m.cancelReason
                          ? ` · ${m.cancelReason}`
                          : ""}
                        {done && m.servicePerformed ? ` · ${m.servicePerformed}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={tone}>
                      {isMaintenanceOverdue(m)
                        ? "Atrasada"
                        : maintenanceStatusLabel(m.status)}
                    </StatusBadge>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
