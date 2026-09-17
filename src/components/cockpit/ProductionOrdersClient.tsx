"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductionListFiltersPanel } from "@/components/cockpit/ProductionListFilters";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import {
  Alert,
  Button,
  EmptyState,
  ListRow,
  SegmentedControl,
  StatusBadge,
  type StatusTone,
} from "@/components/ui";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDateBr } from "@/lib/format/date";
import { productionStatusLabel } from "@/lib/labels/production-status";
import {
  EMPTY_PRODUCTION_FILTERS,
  hasActiveProductionFilters,
  inPeriod,
  type ProductionListFilters,
} from "@/lib/production/list-filters";
import { buildProductMaps } from "@/lib/products/product-maps";
import { listLots } from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type {
  Product,
  ProductionLot,
  ProductionOrder,
  ProductionStatus,
} from "@/types/production";

type StatusFilter = "active" | "all";

function isActive(status: ProductionStatus): boolean {
  return (
    status === "WAITING" ||
    status === "RELEASED" ||
    status === "IN_PROGRESS"
  );
}

function statusTone(status: ProductionStatus): StatusTone {
  switch (status) {
    case "IN_PROGRESS":
    case "RELEASED":
      return "good";
    case "COMPLETED":
      return "neutral";
    case "CANCELLED":
      return "critical";
    case "WAITING":
      return "warning";
    default:
      return "neutral";
  }
}

/**
 * Doc 02 §19–21 — visão de produção (não substitui PCP / sync).
 */
export function ProductionOrdersClient() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<
    Record<string, string | null>
  >({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
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
      const [data, products, allLots] = await Promise.all([
        listProductionOrders(db),
        listProducts(db),
        listLots(db),
      ]);
      setOrders(data);
      setLots(allLots);
      setCatalog(
        products
          .filter((p) => p.active)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
      const maps = buildProductMaps(products);
      setProductNames(maps.names);
      setProductImages(maps.images);
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

  const byStatus = useMemo(() => {
    if (statusFilter === "active") {
      return orders.filter((o) => isActive(o.productionStatus));
    }
    return orders;
  }, [orders, statusFilter]);

  const visible = useMemo(() => {
    const lotQ = filters.lotQuery.trim().toUpperCase();
    const opQ = filters.opQuery.trim().toUpperCase();

    return byStatus.filter((order) => {
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
        const hit = lots.some(
          (l) =>
            l.productionOrderId === order.id &&
            l.lotCode.toUpperCase().includes(lotQ),
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [byStatus, filters, lots]);

  const counts = useMemo(
    () => ({
      active: orders.filter((o) => isActive(o.productionStatus)).length,
      all: orders.length,
    }),
    [orders],
  );

  const filtersActive = hasActiveProductionFilters(filters);

  return (
    <div className="space-y-5">
      <CockpitPageHeader
        eyebrow="Execução"
        title="Ordens de produção"
        description="O que foi planejado e o status de execução · sync no PCP"
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Atualizar
          </Button>
        }
      />

      <SegmentedControl
        activeId={statusFilter}
        onSelect={(id) => setStatusFilter(id as StatusFilter)}
        items={[
          { id: "active", label: "Em aberto", count: counts.active },
          { id: "all", label: "Todas", count: counts.all },
        ]}
      />

      <ProductionListFiltersPanel
        filters={filters}
        onChange={setFilters}
        catalog={catalog}
        resultLabel={
          loading
            ? undefined
            : `${visible.length} ordem${visible.length === 1 ? "" : "ens"}${
                filtersActive ? " (filtrado)" : ""
              }`
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
      ) : error ? (
        <Alert tone="critical">{error}</Alert>
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            filtersActive
              ? "Nenhuma OP neste filtro"
              : "Nenhuma OP neste filtro"
          }
          detail={
            filtersActive
              ? "Ajuste ou limpe os filtros."
              : "Sincronize no PCP se ainda não houver dados."
          }
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                onClick={() => setFilters(EMPTY_PRODUCTION_FILTERS)}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button href="/app/pcp">Ir ao PCP →</Button>
            )
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {visible.map((order) => (
            <li key={order.id}>
              <ListRow
                href={`/app/cockpit/production/orders/${encodeURIComponent(order.id)}`}
                leading={
                  <ProductThumbnail
                    imageUrl={
                      order.productId ? productImages[order.productId] : null
                    }
                    alt={
                      order.productId
                        ? (productNames[order.productId] ?? order.productId)
                        : "Produto"
                    }
                    size="sm"
                  />
                }
                title={
                  <span className="font-mono tabular-nums">
                    {order.externalOrderNumber}
                  </span>
                }
                meta={
                  <>
                    {order.productId
                      ? (productNames[order.productId] ?? order.productId)
                      : "Produto não mapeado"}
                    {order.productionDate
                      ? ` · ${formatDateBr(order.productionDate)}`
                      : ""}
                    {order.plannedQuantity != null
                      ? ` · ${order.plannedQuantity.toLocaleString("pt-BR")} un.`
                      : ""}
                  </>
                }
                trailing={
                  <StatusBadge status={statusTone(order.productionStatus)}>
                    {productionStatusLabel(order.productionStatus)}
                  </StatusBadge>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
