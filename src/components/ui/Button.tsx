import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--ink)] text-[var(--bg)] hover:bg-[color-mix(in_srgb,var(--ink)_88%,black)]",
  secondary:
    "border border-[var(--border)] bg-transparent text-[var(--ink-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] hover:text-[var(--accent-strong)]",
  destructive:
    "border border-[var(--critical)] bg-transparent text-[var(--critical)] hover:bg-[var(--critical)] hover:text-white",
  ghost:
    "border border-transparent bg-transparent text-[var(--accent)] hover:underline hover:text-[var(--accent-strong)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 rounded-[var(--radius-control)] px-3 text-xs font-semibold",
  md: "h-10 rounded-[var(--radius-control)] px-4 text-sm font-semibold",
  lg: "h-11 rounded-[var(--radius-md)] px-5 text-sm font-semibold",
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  title?: string;
};

/**
 * Botão do design system — primary | secondary | destructive | ghost.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  href,
  target,
  rel,
  type = "button",
  onClick,
  title,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center transition-[background-color,border-color,color,text-decoration-color] duration-150 disabled:cursor-not-allowed disabled:opacity-45",
    variantClass[variant],
    sizeClass[size],
    className,
  );

  if (href) {
    if (disabled) {
      return (
        <span
          className={cn(classes, "pointer-events-none opacity-45")}
          aria-disabled
        >
          {children}
        </span>
      );
    }
    return (
      <Link href={href} className={classes} target={target} rel={rel} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export type { ButtonProps };
