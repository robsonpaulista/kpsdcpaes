import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  tone?: "default" | "critical" | "warning" | "good";
};

const toneBorder: Record<NonNullable<CardProps["tone"]>, string> = {
  default: "",
  critical: "border-[color-mix(in_srgb,var(--critical)_28%,var(--border))] bg-[color-mix(in_srgb,var(--critical-bg)_55%,var(--surface))]",
  warning:
    "border-[color-mix(in_srgb,var(--warning)_28%,var(--border))] bg-[color-mix(in_srgb,var(--warning-bg)_55%,var(--surface))]",
  good: "border-[color-mix(in_srgb,var(--good)_28%,var(--border))] bg-[color-mix(in_srgb,var(--good-bg)_55%,var(--surface))]",
};

/**
 * Card de superfície — hover sutil, sem scale/sombra crescente.
 */
export function Card({
  children,
  className,
  interactive,
  tone = "default",
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]",
        interactive &&
          "transition-[background-color,border-color] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--surface)_92%,var(--surface-2))]",
        toneBorder[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

type ListRowProps = {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/**
 * Linha de lista clicável — hover no fundo da linha inteira.
 */
export function ListRow({
  href,
  leading,
  title,
  meta,
  trailing,
  className,
}: ListRowProps) {
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </div>
        {meta ? (
          <div className="mt-0.5 text-xs text-[var(--muted)]">{meta}</div>
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--surface-2)]",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 px-5 py-3.5",
        className,
      )}
    >
      {body}
    </div>
  );
}
