import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type EmptyStateProps = {
  title: string;
  detail?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  detail,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-3 flex justify-center text-[var(--muted)]">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </p>
      {detail ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          {detail}
        </p>
      ) : null}
      {action ? (
        <div className="mt-5 flex justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

type AlertProps = {
  tone: "good" | "warning" | "critical";
  children: ReactNode;
  className?: string;
};

const alertTone: Record<AlertProps["tone"], string> = {
  good: "border-[color-mix(in_srgb,var(--good)_30%,var(--border))] bg-[var(--good-bg)] text-[var(--good)]",
  warning:
    "border-[color-mix(in_srgb,var(--warning)_30%,var(--border))] bg-[var(--warning-bg)] text-[var(--warning)]",
  critical:
    "border-[color-mix(in_srgb,var(--critical)_30%,var(--border))] bg-[var(--critical-bg)] text-[var(--critical)]",
};

export function Alert({ tone, children, className }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] border px-4 py-2.5 text-sm",
        alertTone[tone],
        className,
      )}
      role="status"
    >
      {children}
    </div>
  );
}
