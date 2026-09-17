"use client";

import type { ReactNode } from "react";
import {
  EmptyState,
  SegmentedControl,
  type SegmentItem,
} from "@/components/ui";
import { useCockpitPageTitle } from "@/hooks/useCockpitPageTitle";

/**
 * Cabeçalho das páginas do Cockpit.
 * O `title` vai para a topbar (fonte única); aqui ficam eyebrow, descrição e ações.
 */
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
  useCockpitPageTitle(title);

  if (!eyebrow && !description && !actions) return null;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="dc-eyebrow">{eyebrow}</p> : null}
        {description ? (
          <p
            className={`max-w-2xl text-sm text-[var(--ink-2)] ${
              eyebrow ? "mt-1.5" : ""
            }`}
          >
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

/** @deprecated Preferir SegmentedControl de @/components/ui */
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
    <SegmentedControl items={items} activeId={activeId} onSelect={onSelect} />
  );
}

/** @deprecated Preferir EmptyState de @/components/ui */
export function CockpitEmpty({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return <EmptyState title={title} detail={detail} action={action} />;
}
