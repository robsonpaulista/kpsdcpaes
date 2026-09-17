"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CockpitEmpty,
  CockpitSegments,
} from "@/components/shared/CockpitUi";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  integrationStatusLabel,
  productionStatusLabel,
} from "@/lib/labels/production-status";
import { formatDateBr } from "@/lib/format/date";
import { listProductionOrders } from "@/repositories/orders.repository";
import type { ProductionOrder, ProductionStatus } from "@/types/production";

type FilterTab = "open" | "completed" | "all";

function isOpenStatus(status: ProductionStatus): boolean {
  return (
    status === "WAITING" ||
    status === "RELEASED" ||
    status === "IN_PROGRESS"
  );
}

function isCompletedTab(status: ProductionStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

function statusTone(status: ProductionStatus): string {
  switch (status) {
    case "COMPLETED":
      return "font-semibold text-success";
    case "IN_PROGRESS":
      return "font-semibold text-[var(--accent)]";
    case "CANCELLED":
      return "font-semibold text-danger";
    default:
      return "font-semibold text-dc-text-secondary";
  }
}

function parseTab(raw: string | null): FilterTab {
  if (raw === "completed" || raw === "all" || raw === "open") return raw;
  return "open";
}

export function ProductionOrdersList() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>(() =>
    parseTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setFilter(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase não configurado.");
      }
      const db = getFirestoreDb();
      const data = await listProductionOrders(db);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar OPs");
      if (!opts?.silent) setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  const counts = useMemo(() => {
    const open = orders.filter((o) => isOpenStatus(o.productionStatus)).length;
    const completed = orders.filter(
      (o) => o.productionStatus === "COMPLETED",
    ).length;
    const cancelled = orders.filter(
      (o) => o.productionStatus === "CANCELLED",
    ).length;
    return { open, completed, cancelled };
  }, [orders]);

  const visible = useMemo(() => {
    if (filter === "open") {
      return orders.filter((o) => isOpenStatus(o.productionStatus));
    }
    if (filter === "completed") {
      return orders.filter((o) => isCompletedTab(o.productionStatus));
    }
    return orders;
  }, [orders, filter]);

  if (loading) {
    return (
      <div className="dc-panel p-5 text-sm text-dc-text-secondary">
        Carregando ordens…
      </div>
    );
  }

  if (error) {
    return (
      <div className="dc-panel border-danger/30 bg-danger-soft p-5 text-sm text-danger">
        {error}
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 block text-sm font-semibold underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <CockpitEmpty
        title="Nenhuma OP importada"
        detail="Sincronize as ordens do sistema gestor para começar a programar."
        action={
          <Link
            href="/app/settings/integrations/dev"
            className="dc-btn-primary h-11 px-5 text-sm"
          >
            Ir para Integração
          </Link>
        }
      />
    );
  }

  const pending = orders.filter(
    (o) => o.integrationStatus === "PENDING_VALIDATION",
  ).length;
  const inProduction = orders.filter(
    (o) => o.productionStatus === "IN_PROGRESS",
  ).length;
  const readyToRelease = orders.filter(
    (o) =>
      o.productionStatus === "WAITING" &&
      o.integrationStatus !== "PENDING_VALIDATION",
  ).length;

  const tabs = [
    {
      id: "open",
      label: "Em aberto",
      count: counts.open,
      href: "/app/pcp",
    },
    {
      id: "completed",
      label: "Concluídas",
      count: counts.completed + counts.cancelled,
      href: "/app/pcp?tab=completed",
    },
    {
      id: "all",
      label: "Todas",
      count: orders.length,
      href: "/app/pcp?tab=all",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Recebidas", value: orders.length },
          { label: "Em produção", value: inProduction },
          { label: "Concluídas", value: counts.completed, tone: "text-success" },
          { label: "Aguardando validação", value: pending, tone: pending ? "text-warning" : undefined },
        ].map((stat) => (
          <div key={stat.label} className="dc-panel px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
              {stat.label}
            </p>
            <p
              className={`dc-metric mt-2 text-dc-text ${stat.tone ?? ""}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CockpitSegments items={tabs} activeId={filter} />
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Atualizar
        </button>
      </div>

      {readyToRelease > 0 ? (
        <div className="dc-panel border-dc-orange/25 bg-dc-orange/[0.04] px-4 py-3 text-sm text-dc-text-secondary">
          <p className="font-semibold text-dc-text">
            {readyToRelease} OP(s) pronta(s) para liberar
          </p>
          <p className="mt-1">
            Abra a OP → Liberar para produção → Floor (Pesagem) com o QR/código
            do lote.
          </p>
        </div>
      ) : null}

      {filter === "open" && counts.completed > 0 ? (
        <p className="text-sm text-dc-text-secondary">
          {counts.completed} OP(s) concluída(s) —{" "}
          <Link
            href="/app/pcp?tab=completed"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            ver concluídas →
          </Link>
        </p>
      ) : null}

      {visible.length === 0 ? (
        <CockpitEmpty
          title={
            filter === "completed"
              ? "Nenhuma OP concluída"
              : filter === "open"
                ? "Nenhuma OP em aberto"
                : "Nenhuma OP neste filtro"
          }
          detail={
            filter === "completed"
              ? "Finalize um lote no chão até a embalagem."
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => {
            const needsMapping =
              order.integrationStatus === "PENDING_VALIDATION";
            const href = `/app/pcp/orders/${encodeURIComponent(order.id)}`;
            const done = order.productionStatus === "COMPLETED";
            return (
              <li key={order.id}>
                <Link
                  href={href}
                  className={`block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-[background-color,border-color] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--surface-2)] ${
                    done ? "border-[color-mix(in_srgb,var(--good)_28%,var(--border))] bg-[color-mix(in_srgb,var(--good-bg)_55%,var(--surface))]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold tabular-nums tracking-tight text-dc-text">
                        {order.externalOrderNumber}
                      </p>
                      <p className="mt-1 text-sm text-dc-text-secondary">
                        {(
                          order.externalSnapshot as {
                            externalProductName?: string;
                          }
                        )?.externalProductName ??
                          order.productId ??
                          "Produto"}
                      </p>
                      <p className="mt-2 text-xs font-medium text-dc-text-muted">
                        ORIGEM: GESTOR ·{" "}
                        <span className="tabular-nums">
                          {order.plannedQuantity?.toLocaleString("pt-BR")} un.
                        </span>
                        {order.productionDate
                          ? ` · ${formatDateBr(order.productionDate)}`
                          : null}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p
                        className={
                          needsMapping
                            ? "font-bold text-warning"
                            : "font-semibold text-dc-text-secondary"
                        }
                      >
                        {integrationStatusLabel(order.integrationStatus)}
                      </p>
                      <p className={`mt-1 ${statusTone(order.productionStatus)}`}>
                        {productionStatusLabel(order.productionStatus)}
                      </p>
                      <p className="mt-4 text-sm font-bold text-[var(--accent)]">
                        {needsMapping
                          ? "Mapear →"
                          : order.productionStatus === "WAITING"
                            ? "Liberar →"
                            : done
                              ? "Ver conclusão →"
                              : "Abrir →"}
                      </p>
                    </div>
                  </div>
                  {needsMapping ? (
                    <p className="mt-3 rounded-[12px] bg-warning-soft px-3 py-2.5 text-xs font-medium text-dc-text">
                      Esta OP não pode ser liberada até que o produto seja
                      configurado no Factory OS.
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
