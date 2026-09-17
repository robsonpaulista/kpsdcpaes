import { cn } from "@/lib/ui/cn";
import type { EquipmentStatus } from "@/types/equipment";

export type StatusTone = "good" | "warning" | "critical" | "neutral";

const toneClass: Record<StatusTone, string> = {
  good: "bg-[var(--good-bg)] text-[var(--good)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)]",
  critical: "bg-[var(--critical-bg)] text-[var(--critical)]",
  neutral: "bg-[var(--surface-2)] text-[var(--muted)]",
};

type StatusBadgeProps = {
  status: StatusTone;
  children: React.ReactNode;
  className?: string;
};

/**
 * Pill de status — só good/warning/critical/neutral.
 */
export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        toneClass[status],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Mapeia status de equipamento → tom do design system. */
export function equipmentStatusTone(status: EquipmentStatus): StatusTone {
  switch (status) {
    case "OPERATING":
    case "AVAILABLE":
    case "WAITING":
      return "good";
    case "MAINTENANCE":
      return "warning";
    case "STOPPED":
    case "UNAVAILABLE":
      return "critical";
    default:
      return "neutral";
  }
}
