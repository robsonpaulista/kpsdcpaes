"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { productionStatusLabel } from "@/lib/labels/production-status";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type { ProductionOrder, ProductionStatus } from "@/types/production";

type Filter = "active" | "all";

function isActive(status: ProductionStatus): boolean {
  return (
    status === "WAITING" ||
    status === "RELEASED" ||
    status === "IN_PROGRESS"
  );
}

function statusClass(status: ProductionStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "text-dc-orange";
    case "COMPLETED":
      return "text-success";
    case "CANCELLED":
      return "text-danger";
    default:
      return "text-dc-text-secondary";
  }
}

/**
 * Doc 02 §19–21 — visão de produção (não substitui PCP / sync).
 */
export function ProductionOrdersClient() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [data, products] = await Promise.all([
        listProductionOrders(db),
        listProducts(db),
      ]);
      setOrders(data);
      const names: Record<string, string> = {};
      for (const p of products) names[p.id] = p.name;
      setProductNames(names);
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

  const visible = useMemo(() => {
    if (filter === "active") return orders.filter((o) => isActive(o.productionStatus));
    return orders;
  }, [orders, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-dc-text">Ordens de produção</h1>
          <p className="mt-1 text-sm text-dc-text-secondary">
            O que foi planejado e o status de execução · sync no PCP
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          {(
            [
              ["active", "Em aberto"],
              ["all", "Todas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg px-2.5 py-1.5 font-medium ${
                filter === id
                  ? "bg-dc-orange/10 text-dc-orange"
                  : "text-dc-text-secondary hover:text-dc-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-dc-text-secondary">
          Nenhuma OP neste filtro. Sincronize no PCP se ainda não houver dados.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-[14px] border border-dc-border bg-dc-surface md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dc-border text-xs text-dc-text-muted">
                  <th className="px-4 py-3 font-medium">OP</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Planejado</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const name =
                    (order.productId && productNames[order.productId]) ||
                    (
                      order.externalSnapshot as
                        | { externalProductName?: string }
                        | undefined
                    )?.externalProductName ||
                    "—";
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-dc-border/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/cockpit/production/orders/${encodeURIComponent(order.id)}`}
                          className="font-semibold tabular-nums text-dc-orange"
                        >
                          {order.externalOrderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-dc-text">{name}</td>
                      <td className="px-4 py-3 tabular-nums text-dc-text-secondary">
                        {order.plannedQuantity?.toLocaleString("pt-BR") ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-dc-text-secondary">
                        {order.productionDate ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-semibold ${statusClass(order.productionStatus)}`}
                      >
                        {productionStatusLabel(order.productionStatus)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {visible.map((order) => {
              const name =
                (order.productId && productNames[order.productId]) ||
                (
                  order.externalSnapshot as
                    | { externalProductName?: string }
                    | undefined
                )?.externalProductName ||
                "—";
              return (
                <li
                  key={order.id}
                  className="rounded-[14px] border border-dc-border bg-dc-surface p-4"
                >
                  <Link
                    href={`/app/cockpit/production/orders/${encodeURIComponent(order.id)}`}
                    className="font-semibold tabular-nums text-dc-orange"
                  >
                    OP {order.externalOrderNumber}
                  </Link>
                  <p className="mt-1 text-sm text-dc-text">{name}</p>
                  <p className="mt-1 text-xs text-dc-text-secondary">
                    {order.plannedQuantity?.toLocaleString("pt-BR") ?? "—"} un.
                    {order.productionDate ? ` · ${order.productionDate}` : ""}
                  </p>
                  <p
                    className={`mt-2 text-xs font-semibold ${statusClass(order.productionStatus)}`}
                  >
                    {productionStatusLabel(order.productionStatus)}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
