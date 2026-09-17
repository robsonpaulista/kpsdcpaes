"use client";

import { CheckCircle2, CircleCheck, Gauge, ShieldCheck } from "lucide-react";
import type { DashboardHighlight } from "@/domain/cockpit/dashboard-types";
import { severityTextClass } from "@/lib/severity/getSeverity";

function HighlightIcon({ id }: { id: string }) {
  const cls = "size-3.5 shrink-0";
  if (id === "no-risk") return <ShieldCheck className={cls} strokeWidth={1.75} />;
  if (id === "equip") return <Gauge className={cls} strokeWidth={1.75} />;
  if (id === "clear") return <CircleCheck className={cls} strokeWidth={1.75} />;
  return <CheckCircle2 className={cls} strokeWidth={1.75} />;
}

export function ShiftHighlights({
  highlights,
}: {
  highlights: DashboardHighlight[];
}) {
  if (highlights.length === 0) return null;

  return (
    <section aria-label="Destaques do turno">
      <div className="mb-2.5 px-0.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
          Destaques do turno
        </h2>
        <p className="mt-0.5 text-xs text-dc-text-secondary">
          O que está sob controle agora
        </p>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-dc-border bg-[var(--surface)]">
        <ul className="grid grid-cols-1 divide-y divide-dc-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {highlights.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
            >
              <span className={severityTextClass(item.tone)}>
                <HighlightIcon id={item.id} />
              </span>
              <div className="min-w-0">
                <p
                  className={`font-mono text-lg font-semibold leading-none tabular-nums tracking-tight ${severityTextClass(item.tone)}`}
                >
                  {item.value}
                </p>
                <p className="mt-1 truncate text-[11px] text-dc-text-secondary">
                  {item.label}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
