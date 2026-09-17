import Link from "next/link";
import { cn } from "@/lib/ui/cn";

export type SegmentItem = {
  id: string;
  label: string;
  count?: number;
  href?: string;
};

type SegmentedControlProps = {
  items: SegmentItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  className?: string;
};

/**
 * Abas / filtro segmentado.
 * Ativo: fundo --ink / texto --bg (mesmo peso do botão primário).
 */
export function SegmentedControl({
  items,
  activeId,
  onSelect,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const classes = cn(
          "rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-[background-color,color] duration-150",
          active
            ? "bg-[var(--ink)] text-[var(--bg)]"
            : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
        );
        const content = (
          <>
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "ml-1.5 font-mono tabular-nums",
                  active ? "text-[var(--bg)]" : "text-[var(--muted)]",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              className={classes}
              role="tab"
              aria-selected={active}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect?.(item.id)}
            className={classes}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
