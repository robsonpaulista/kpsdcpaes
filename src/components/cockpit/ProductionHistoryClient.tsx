"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductionListFiltersPanel } from "@/components/cockpit/ProductionListFilters";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { StatusBadge } from "@/components/ui";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDateBr } from "@/lib/format/date";
import {
  lotStatusLabel,
  productionStatusLabel,
} from "@/lib/labels/production-status";
import {
  EMPTY_PRODUCTION_FILTERS,
  hasActiveProductionFilters,
  inPeriod,
  type ProductionListFilters,
} from "@/lib/production/list-filters";
import { buildProductMaps } from "@/lib/products/product-maps";
import { listCompletedStepRuns } from "@/repositories/execution.repository";
import { listCompletedLots } from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type { Product, ProductionLot, ProductionOrder } from "@/types/production";

function formatUnits(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR")} un.`;
}

/**
 * Histórico de produção — lotes e OPs concluídos, com filtros.
 */
export function ProductionHistoryClient() {
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<
    Record<string, string | null>
  >({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [realizedByLot, setRealizedByLot] = useState<Record<string, number>>(
    {},
  );
  const [filters, setFilters] = useState<ProductionListFilters>(
    EMPTY_PRODUCTION_FILTERS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [completed, allOrders, products, completedSteps] =
        await Promise.all([
          listCompletedLots(db, 500),
          listProductionOrders(db),
          listProducts(db),
          listCompletedStepRuns(db),
        ]);
      setLots(completed);
      setOrders(
        allOrders.filter(
          (o) =>
            o.productionStatus === "COMPLETED" ||
            o.productionStatus === "CANCELLED",
        ),
      );
      setCatalog(
        products
          .filter((p) => p.active)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
      const maps = buildProductMaps(products);
      setProductNames(maps.names);
      setProductImages(maps.images);
      const nums: Record<string, string> = {};
      for (const o of allOrders) nums[o.id] = o.externalOrderNumber;
      setOrderNumbers(nums);

      const realized: Record<string, number> = {};
      for (const step of completedSteps) {
        if (
          step.stepType === "PACKAGING" &&
          step.outputQuantity != null &&
          step.outputQuantity > 0
        ) {
          realized[step.lotId] = step.outputQuantity;
        }
      }
      setRealizedByLot(realized);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar histórico",
      );
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

  const hasActiveFilters = hasActiveProductionFilters(filters);

  const filteredLots = useMemo(() => {
    const lotQ = filters.lotQuery.trim().toUpperCase();
    const opQ = filters.opQuery.trim().toUpperCase();

    return lots.filter((lot) => {
      const lotDate =
        lot.completedAt?.slice(0, 10) ?? lot.updatedAt.slice(0, 10);
      if (!inPeriod(lotDate, filters.dateFrom, filters.dateTo)) return false;
      if (filters.productId && lot.productId !== filters.productId) {
        return false;
      }
      if (lotQ && !lot.lotCode.toUpperCase().includes(lotQ)) return false;
      if (opQ) {
        const op = (orderNumbers[lot.productionOrderId] ?? "").toUpperCase();
        if (!op.includes(opQ)) return false;
      }
      return true;
    });
  }, [lots, filters, orderNumbers]);

  const filteredOrders = useMemo(() => {
    const lotQ = filters.lotQuery.trim().toUpperCase();
    const opQ = filters.opQuery.trim().toUpperCase();

    return orders.filter((order) => {
      if (
        !inPeriod(
          order.productionDate ?? order.updatedAt.slice(0, 10),
          filters.dateFrom,
          filters.dateTo,
        )
      ) {
        return false;
      }
      if (filters.productId && order.productId !== filters.productId) {
        return false;
      }
      if (opQ && !order.externalOrderNumber.toUpperCase().includes(opQ)) {
        return false;
      }
      if (lotQ) {
        const orderLots = lots.filter(
          (l) => l.productionOrderId === order.id,
        );
        const hit = orderLots.some((l) =>
          l.lotCode.toUpperCase().includes(lotQ),
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, lots, filters]);

  const lotsByOrder = useMemo(() => {
    const map: Record<string, ProductionLot[]> = {};
    for (const lot of lots) {
      const list = map[lot.productionOrderId] ?? [];
      list.push(lot);
      map[lot.productionOrderId] = list;
    }
    return map;
  }, [lots]);

  function orderRealized(orderId: string): number | null {
    const orderLots = lotsByOrder[orderId] ?? [];
    let total = 0;
    let any = false;
    for (const lot of orderLots) {
      const qty = realizedByLot[lot.id];
      if (qty != null) {
        total += qty;
        any = true;
      }
    }
    return any ? total : null;
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        title="Histórico"
        description="Lotes e ordens concluídos ou cancelados"
      />

      <ProductionListFiltersPanel
        filters={filters}
        onChange={setFilters}
        catalog={catalog}
        resultLabel={
          loading || error
            ? undefined
            : `${filteredLots.length} lote${filteredLots.length === 1 ? "" : "s"} · ${filteredOrders.length} ordem${filteredOrders.length === 1 ? "" : "ens"}${hasActiveFilters ? " (filtrado)" : ""}`
        }
      />

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
            {filteredLots.length === 0 ? (
              <p className="mt-2 text-sm text-dc-text-secondary">
                {hasActiveFilters
                  ? "Nenhum lote neste filtro."
                  : "Nenhum lote concluído ainda."}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-dc-border">
                {filteredLots.map((lot) => {
                  const productName =
                    productNames[lot.productId] ?? lot.productId;
                  const realized = realizedByLot[lot.id];
                  const planned = lot.plannedQuantity;

                  return (
                    <li
                      key={lot.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <ProductThumbnail
                          imageUrl={productImages[lot.productId]}
                          alt={productName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/app/cockpit/production/lots/${encodeURIComponent(lot.id)}`}
                              className="font-semibold tabular-nums text-[var(--accent)] hover:underline"
                            >
                              {lot.lotCode}
                            </Link>
                            <StatusBadge status="good">
                              {lotStatusLabel(lot.status)}
                            </StatusBadge>
                          </div>
                          <p className="mt-0.5 truncate text-sm font-medium text-dc-text">
                            {productName}
                          </p>
                          <p className="mt-0.5 text-xs text-dc-text-secondary">
                            {orderNumbers[lot.productionOrderId]
                              ? `OP ${orderNumbers[lot.productionOrderId]}`
                              : "Sem OP"}
                            {planned != null
                              ? ` · Planejado ${formatUnits(planned)}`
                              : ""}
                            {realized != null
                              ? ` · Produzido ${formatUnits(realized)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-semibold tabular-nums text-dc-text">
                          {formatUnits(realized ?? planned)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-dc-text-muted">
                          {formatDateBr(
                            lot.completedAt?.slice(0, 10) ??
                              lot.updatedAt.slice(0, 10),
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
            <h2 className="text-sm font-semibold text-dc-text">
              Ordens encerradas
            </h2>
            {filteredOrders.length === 0 ? (
              <p className="mt-2 text-sm text-dc-text-secondary">
                {hasActiveFilters
                  ? "Nenhuma OP neste filtro."
                  : "Nenhuma OP concluída ou cancelada."}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-dc-border">
                {filteredOrders.map((order) => {
                  const productName = order.productId
                    ? (productNames[order.productId] ?? order.productId)
                    : "Produto não mapeado";
                  const realized = orderRealized(order.id);
                  const orderLots = lotsByOrder[order.id] ?? [];
                  const cancelled = order.productionStatus === "CANCELLED";

                  return (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <ProductThumbnail
                          imageUrl={
                            order.productId
                              ? productImages[order.productId]
                              : null
                          }
                          alt={productName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/app/cockpit/production/orders/${encodeURIComponent(order.id)}`}
                              className="font-semibold tabular-nums text-[var(--accent)] hover:underline"
                            >
                              OP {order.externalOrderNumber}
                            </Link>
                            <StatusBadge
                              status={cancelled ? "critical" : "good"}
                            >
                              {productionStatusLabel(order.productionStatus)}
                            </StatusBadge>
                          </div>
                          <p className="mt-0.5 truncate text-sm font-medium text-dc-text">
                            {productName}
                          </p>
                          <p className="mt-0.5 text-xs text-dc-text-secondary">
                            {order.plannedQuantity != null
                              ? `Planejado ${formatUnits(order.plannedQuantity)}`
                              : "Sem qtde planejada"}
                            {realized != null
                              ? ` · Produzido ${formatUnits(realized)}`
                              : ""}
                            {orderLots.length > 0
                              ? ` · ${orderLots.length} lote${orderLots.length === 1 ? "" : "s"}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-semibold tabular-nums text-dc-text">
                          {formatUnits(realized ?? order.plannedQuantity)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-dc-text-muted">
                          {formatDateBr(
                            order.productionDate ??
                              order.updatedAt.slice(0, 10),
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
