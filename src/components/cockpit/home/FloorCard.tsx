"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { LiveTimer } from "@/components/cockpit/home/LiveTimer";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import type { DashboardFloorRow } from "@/domain/cockpit/dashboard-types";

function ProductionRail({ steps }: { steps: DashboardFloorRow["routeSteps"] }) {
  return (
    <div className="mt-1.5 flex min-w-0 flex-1 items-center gap-0" aria-hidden>
      {steps.map((step, i) => (
        <div key={step.stepType} className="flex items-center">
          <span
            className={`flex size-2 items-center justify-center rounded-full border ${
              step.state === "done"
                ? "border-[var(--good)] bg-[var(--good)]"
                : step.state === "current"
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-dc-border bg-[var(--surface)]"
            }`}
            title={`${step.stepLabel}${step.state === "current" ? " · agora" : ""}`}
          />
          {i < steps.length - 1 ? (
            <span
              className={`h-px w-2.5 sm:w-3.5 ${
                step.state === "done" ? "bg-[var(--good)]/50" : "bg-dc-border"
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function statusLabel(row: DashboardFloorRow): string {
  if (row.status === "stopped") return "Parado";
  if (row.status === "running") return "Em andamento";
  return "Aguardando";
}

function isProblem(row: DashboardFloorRow): boolean {
  if (row.isBottleneck) return true;
  if (row.timing === "LATE" || row.timing === "ATTENTION") return true;
  if (
    row.status === "stopped" &&
    row.waitingMinutes != null &&
    row.waitingMinutes >= 3
  ) {
    return true;
  }
  return false;
}

function issueLabel(row: DashboardFloorRow): string | null {
  if (row.isBottleneck) return "Gargalo";
  if (row.timing === "LATE") return "Atraso";
  if (row.timing === "ATTENTION") return "Atenção";
  if (
    row.status === "stopped" &&
    row.waitingMinutes != null &&
    row.waitingMinutes >= 3
  ) {
    return "Fila parada";
  }
  if (row.timing === "ON_TIME") return "No prazo";
  return null;
}

function issueClass(row: DashboardFloorRow): string {
  if (row.isBottleneck || row.timing === "LATE") {
    return "text-[var(--critical)]";
  }
  if (
    row.timing === "ATTENTION" ||
    (row.status === "stopped" && (row.waitingMinutes ?? 0) >= 3)
  ) {
    return "text-[var(--warning)]";
  }
  if (row.timing === "ON_TIME") return "text-[var(--good)]";
  return "text-dc-text-muted";
}

function LotCard({ row }: { row: DashboardFloorRow }) {
  const current = row.routeSteps.find((s) => s.state === "current");
  const stepLabel = current?.stepLabel ?? row.stepLabel;
  const issue = issueLabel(row);
  const problem = isProblem(row);
  const showWaitTimer =
    row.waitingMinutes != null && row.status !== "running";

  return (
    <Link
      href={row.href}
      className={`flex gap-3 rounded-[12px] border bg-[var(--surface)] px-3.5 py-3 transition-colors duration-150 hover:bg-[var(--surface-2)] ${
        row.isBottleneck || row.timing === "LATE"
          ? "border-[var(--critical)]/35"
          : row.status === "stopped" || row.timing === "ATTENTION"
            ? "border-[var(--warning)]/35"
            : "border-dc-border"
      }`}
    >
      <ProductThumbnail imageUrl={row.imageUrl} alt={row.productName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-dc-text">
            {row.productName}
          </p>
          <span className="flex shrink-0 items-center gap-1.5">
            {problem ? (
              <TriangleAlert
                className={`dc-alert-blink size-3.5 ${issueClass(row)}`}
                strokeWidth={2}
                aria-label={issue ?? "Problema"}
              />
            ) : null}
            {issue ? (
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${issueClass(row)}`}
              >
                {issue}
              </span>
            ) : null}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p className="shrink-0 font-mono text-[11px] tabular-nums text-dc-text-secondary">
            {row.lotCode}
            {row.plannedQuantity != null
              ? ` · ${row.plannedQuantity.toLocaleString("pt-BR")} un.`
              : null}
          </p>
          <ProductionRail steps={row.routeSteps} />
        </div>

        <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-snug text-dc-text-secondary">
          <span className="font-medium text-dc-text">{statusLabel(row)}</span>
          <span aria-hidden>·</span>
          <span className="uppercase tracking-[0.06em]">{stepLabel}</span>
          {showWaitTimer ? (
            <>
              <span aria-hidden>·</span>
              <LiveTimer
                baseMinutes={row.waitingMinutes}
                className="font-mono text-[11px] tabular-nums text-dc-text"
              />
            </>
          ) : row.status === "running" ? (
            <>
              <span aria-hidden>·</span>
              <span>{row.statusLabel}</span>
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

export function FloorCard({
  items,
  activeLots,
  equipmentAvailable,
}: {
  items: DashboardFloorRow[];
  activeLots: number;
  equipmentAvailable: number;
}) {
  return (
    <section aria-label="Em produção agora">
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
              Em produção agora
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
            {activeLots} {activeLots === 1 ? "lote" : "lotes"} em andamento
            {equipmentAvailable > 0
              ? ` · ${equipmentAvailable} equipamentos disponíveis`
              : null}
          </p>
        </div>
        <Link href="/app/floor" className="dc-link text-xs font-semibold">
          Ver chão completo →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[12px] border border-dc-border bg-[var(--surface)] px-4 py-4 text-sm text-dc-text-secondary">
          Nenhum lote ativo no momento.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((row) => (
            <li key={row.id}>
              <LotCard row={row} />
            </li>
          ))}
        </ul>
      )}

      {activeLots > items.length ? (
        <div className="mt-2.5 text-right">
          <Link
            href="/app/cockpit/production"
            className="dc-link text-xs font-semibold"
          >
            Ver todos os lotes →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
