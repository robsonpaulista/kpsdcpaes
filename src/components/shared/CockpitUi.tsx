"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Cabeçalho padrão das páginas do Cockpit. */
export function CockpitPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="dc-eyebrow">{eyebrow}</p> : null}
        <h1
          className={`font-semibold tracking-tight text-dc-text ${
            eyebrow ? "mt-2 text-[26px]" : "text-[26px]"
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-dc-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

type SegmentItem = {
  id: string;
  label: string;
  count?: number;
  href?: string;
};

/** Abas / filtros segmentados — PCP, lotes, qualidade. */
export function CockpitSegments({
  items,
  activeId,
  onSelect,
}: {
  items: SegmentItem[];
  activeId: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-[14px] border border-dc-border/80 bg-dc-surface p-1 shadow-dc-sm">
      {items.map((item) => {
        const active = item.id === activeId;
        const className = `rounded-[10px] px-3 py-2 text-sm font-semibold transition ${
          active
            ? "bg-dc-orange text-white shadow-sm"
            : "text-dc-text-secondary hover:bg-dc-surface-secondary hover:text-dc-text"
        }`;
        const content = (
          <>
            {item.label}
            {item.count != null ? (
              <span className="ml-1.5 tabular-nums opacity-80">
                {item.count}
              </span>
            ) : null}
          </>
        );
        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className={className}>
              {content}
            </Link>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export function CockpitEmpty({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="dc-panel border-dashed p-8 text-center">
      <p className="text-base font-semibold tracking-tight text-dc-text">
        {title}
      </p>
      {detail ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-dc-text-secondary">
          {detail}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
