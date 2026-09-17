import { cn } from "@/lib/ui/cn";
import type { StatusTone } from "@/components/ui/StatusBadge";

type StatTileProps = {
  label: string;
  value: string | number;
  /** Só colorir o valor quando o número em si for um problema/alerta. */
  tone?: StatusTone | "ink";
  className?: string;
};

const valueTone: Record<NonNullable<StatTileProps["tone"]>, string> = {
  ink: "text-[var(--ink)]",
  good: "text-[var(--good)]",
  warning: "text-[var(--warning)]",
  critical: "text-[var(--critical)]",
  neutral: "text-[var(--muted)]",
};

/**
 * Tile de estatística — label muted + valor mono.
 * Disponíveis/totais ficam neutros; Parados pode ser warning/critical.
 */
export function StatTile({
  label,
  value,
  tone = "ink",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-[22px] font-semibold leading-none tracking-tight tabular-nums",
          valueTone[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}
