"use client";

import Link from "next/link";

const STEPS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/app/settings/integrations/dev", label: "Sync" },
  { href: "/app/pcp", label: "PCP" },
  { href: "/app/floor", label: "Floor" },
  { href: "/display/production", label: "Display" },
  { href: "/app/quality/losses", label: "Perdas" },
  { href: "/app/traceability", label: "Rastreio" },
  { href: "/app/settings/qa", label: "Checklist" },
];

/**
 * Atalho compacto do ciclo QA E2E (Doc 11) — Cockpit / hubs.
 */
export function QaCycleStrip({
  note = "Ciclo de validação MVP — sync → liberar → chão → display → qualidade → rastreio.",
}: {
  note?: string;
}) {
  return (
    <div className="dc-panel border-dc-orange/20 bg-dc-orange/[0.04] px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="dc-eyebrow text-dc-orange">QA · ciclo E2E</p>
        <Link
          href="/app/settings/qa"
          className="text-xs font-semibold text-dc-orange"
        >
          Abrir checklist →
        </Link>
      </div>
      <p className="mt-1 text-xs text-dc-text-secondary">{note}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="rounded-[10px] border border-dc-border bg-dc-surface px-2.5 py-1.5 text-xs font-semibold text-dc-text-secondary transition hover:border-dc-orange/40 hover:text-dc-orange"
          >
            {step.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
