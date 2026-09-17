import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

const fieldBase =
  "w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--ring)] disabled:opacity-50";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        fieldBase,
        "h-10",
        invalid && "border-[var(--critical)] focus:border-[var(--critical)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--critical)_35%,transparent)]",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-10",
        invalid && "border-[var(--critical)] focus:border-[var(--critical)]",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        fieldBase,
        "min-h-[88px] py-2",
        invalid && "border-[var(--critical)] focus:border-[var(--critical)]",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-[var(--critical)]">{children}</p>;
}
