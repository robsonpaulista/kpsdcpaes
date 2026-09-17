import type { DashboardSyncStatus } from "@/domain/cockpit/dashboard-types";
import { formatClock } from "@/domain/cockpit/format-dashboard";

type DashboardFooterProps = {
  updatedAt: string;
  refreshMinutes: number;
  sync: DashboardSyncStatus;
};

export function DashboardFooter({
  updatedAt,
  refreshMinutes,
  sync,
}: DashboardFooterProps) {
  const time = formatClock(new Date(updatedAt));

  return (
    <footer className="flex flex-wrap items-start justify-between gap-2 border-t border-dc-border/70 pt-4 text-[11px] text-dc-text-muted">
      <p>
        Cockpit atualizado às{" "}
        <span className="tabular-nums">{time}</span> · próxima atualização
        automática em {refreshMinutes} min
      </p>
      <p className="text-right">
        Fonte: chão de fábrica
        {sync.floorRealtime ? " (tempo real)" : ""} + {sync.gestorLabel}
      </p>
    </footer>
  );
}
