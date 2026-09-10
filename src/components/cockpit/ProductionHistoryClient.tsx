"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  lotStatusLabel,
  productionStatusLabel,
} from "@/lib/labels/production-status";
import { listCompletedLots } from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type { ProductionLot, ProductionOrder } from "@/types/production";

/**
 * Histórico de produção — lotes e OPs concluídos (Doc 02 sidebar).
 */
export function ProductionHistoryClient() {
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [completed, allOrders, products] = await Promise.all([
        listCompletedLots(db, 40),
        listProductionOrders(db),
        listProducts(db),
      ]);
      setLots(completed);
      setOrders(
        allOrders.filter(
          (o) =>
            o.productionStatus === "COMPLETED" ||
            o.productionStatus === "CANCELLED",
        ),
      );
      const names: Record<string, string> = {};
      for (const p of products) names[p.id] = p.name;
      setProductNames(names);
      const nums: Record<string, string> = {};
      for (const o of allOrders) nums[o.id] = o.externalOrderNumber;
      setOrderNumbers(nums);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar histórico");
      if (!opts?.silent) {
        setLots([]);
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-dc-text">Histórico</h1>
        <p className="mt-1 text-sm text-dc-text-secondary">
          Lotes e ordens concluídos ou cancelados
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <>
          <section className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
            <h2 className="text-sm font-semibold text-dc-text">
              Lotes concluídos
            </h2>
            {lots.length === 0 ? (
              <p className="mt-2 text-sm text-dc-text-secondary">
                Nenhum lote concluído ainda.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-dc-border">
                {lots.map((lot) => (
                  <li
                    key={lot.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <Link
                        href={`/app/cockpit/production/lots/${encodeURIComponent(lot.id)}`}
                        className="font-semibold tabular-nums text-dc-orange"
                      >
                        {lot.lotCode}
                      </Link>
                      <p className="text-xs text-dc-text-secondary">
                        {productNames[lot.productId] ?? lot.productId}
                        {orderNumbers[lot.productionOrderId]
                          ? ` · OP ${orderNumbers[lot.productionOrderId]}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-dc-text-muted">
                      {lot.completedAt?.slice(0, 10) ??
                        lot.updatedAt.slice(0, 10)}{" "}
                      · {lotStatusLabel(lot.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
            <h2 className="text-sm font-semibold text-dc-text">
              Ordens encerradas
            </h2>
            {orders.length === 0 ? (
              <p className="mt-2 text-sm text-dc-text-secondary">
                Nenhuma OP concluída ou cancelada.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-dc-border">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <Link
                      href={`/app/cockpit/production/orders/${encodeURIComponent(order.id)}`}
                      className="font-semibold tabular-nums text-dc-orange"
                    >
                      OP {order.externalOrderNumber}
                    </Link>
                    <span className="text-xs text-dc-text-muted">
                      {order.productionDate ?? order.updatedAt.slice(0, 10)} ·{" "}
                      {productionStatusLabel(order.productionStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
