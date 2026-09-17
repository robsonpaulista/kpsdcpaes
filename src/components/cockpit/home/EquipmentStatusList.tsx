"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type {
  DashboardEquipmentRow,
  DashboardEquipmentStatus,
} from "@/domain/cockpit/dashboard-types";
import { equipmentStatusLabel } from "@/lib/labels/equipment";

function isProblem(status: DashboardEquipmentStatus): boolean {
  return (
    status === "STOPPED" ||
    status === "MAINTENANCE" ||
    status === "UNAVAILABLE"
  );
}

function nodeClass(status: DashboardEquipmentStatus): string {
  if (isProblem(status)) {
    return "border-[var(--critical)] bg-[var(--critical)]";
  }
  if (status === "OPERATING") {
    return "border-[var(--accent)] bg-[var(--accent)]";
  }
  if (status === "WAITING") {
    return "border-[var(--warning)] bg-[var(--warning)]";
  }
  return "border-[var(--good)] bg-[var(--good)]";
}

function connectorClass(status: DashboardEquipmentStatus): string {
  if (isProblem(status)) return "bg-[var(--critical)]/40";
  if (status === "OPERATING") return "bg-[var(--accent)]/40";
  if (status === "WAITING") return "bg-[var(--warning)]/40";
  return "bg-[var(--good)]/40";
}

function shortStatus(status: DashboardEquipmentStatus): string {
  if (status === "AVAILABLE") return "Disponível";
  if (status === "OPERATING") return "Operando";
  if (status === "WAITING") return "Aguardando";
  if (status === "STOPPED") return "Parado";
  if (status === "MAINTENANCE") return "Manutenção";
  return "Indisponível";
}

function EquipmentNode({
  row,
  showConnector,
}: {
  row: DashboardEquipmentRow;
  showConnector: boolean;
}) {
  const problem = isProblem(row.status);
  const detail =
    row.status === "OPERATING" && row.lotCode
      ? row.lotCode
      : row.stoppedLabel && problem
        ? row.stoppedLabel
        : row.remainingLabel && row.status === "OPERATING"
          ? row.remainingLabel
          : null;

  return (
    <li className="flex min-w-0 items-start">
      <Link
        href={row.href}
        className="group flex w-[5.5rem] shrink-0 flex-col items-center text-center sm:w-24"
        title={`${row.name} · ${equipmentStatusLabel(row.status)}`}
      >
        <span className="relative flex items-center justify-center">
          <span
            className={`size-3 rounded-full border sm:size-3.5 ${nodeClass(row.status)}`}
            aria-hidden
          />
          {problem || row.timing === "LATE" ? (
            <TriangleAlert
              className="dc-alert-blink absolute -right-3 -top-2.5 size-3 text-[var(--critical)]"
              strokeWidth={2}
              aria-label="Problema"
            />
          ) : null}
        </span>

        <p className="mt-2 font-mono text-[11px] font-semibold tabular-nums tracking-tight text-dc-text transition-colors group-hover:text-[var(--accent)]">
          {row.code}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-dc-text-secondary">
          {row.name.replace(/^Linha de /, "")}
        </p>
        <p
          className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${
            problem
              ? "text-[var(--critical)]"
              : row.status === "OPERATING"
                ? "text-[var(--accent)]"
                : "text-dc-text-muted"
          }`}
        >
          {shortStatus(row.status)}
        </p>
        {detail ? (
          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-dc-text-secondary">
            {detail}
          </p>
        ) : null}
      </Link>

      {showConnector ? (
        <span
          className={`mt-[5px] h-px w-4 shrink-0 sm:mt-1.5 sm:w-6 ${connectorClass(row.status)}`}
          aria-hidden
        />
      ) : null}
    </li>
  );
}

export function EquipmentStatusList({
  items,
  operating,
  available,
  stopped,
}: {
  items: DashboardEquipmentRow[];
  operating: number;
  available: number;
  stopped: number;
}) {
  return (
    <section
      id="status-equipamentos"
      className="scroll-mt-28"
      aria-label="Status dos equipamentos"
    >
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
              Status dos equipamentos
            </h2>
            <span className="flex items-center gap-1 text-[10px] text-dc-text-secondary">
              <span
                className="size-1.5 rounded-full bg-[var(--good)]"
                aria-hidden
              />
              Ao vivo
            </span>
          </div>
          <p className="mt-0.5 text-xs text-dc-text-secondary">
            {operating} operando · {available} disponíveis
            {stopped > 0 ? ` · ${stopped} parados` : null}
          </p>
        </div>
        <Link href="/app/equipment" className="dc-link text-xs font-semibold">
          Ver equipamentos →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[12px] border border-dc-border bg-[var(--surface)] px-4 py-4 text-sm text-dc-text-secondary">
          Nenhum equipamento ativo cadastrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-dc-border bg-[var(--surface)] px-4 py-4 sm:px-5 sm:py-5">
          <ol className="flex min-w-max items-start justify-between gap-0">
            {items.map((row, index) => (
              <EquipmentNode
                key={row.id}
                row={row}
                showConnector={index < items.length - 1}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
