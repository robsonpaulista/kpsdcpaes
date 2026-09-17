"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { stepTypeLabel } from "@/domain/production/process-route";
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
import { lotStatusLabel } from "@/lib/labels/production-status";
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
  LotStatus,
  Product,
  ProductionLot,
} from "@/types/production";

type StatusFilter = "open" | "blocked" | "all";

function isOpen(status: LotStatus): boolean {
  return status === "WAITING" || status === "IN_PROGRESS";
}

function lotTone(status: LotStatus): StatusTone {
  if (status === "BLOCKED") return "critical";
  if (status === "IN_PROGRESS") return "good";
  if (status === "WAITING") return "warning";
  return "neutral";
}

/**
 * Doc 02 §29 — lotes e estado atual.
 */
export function ProductionLotsClient() {
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<
    Record<string, string | null>
  >({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
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
      const [allLots, products, orders] = await Promise.all([
        listLots(db),
        listProducts(db),
        listProductionOrders(db),
      ]);
      setLots(
        allLots.filter(
          (l) => l.status !== "COMPLETED" && l.status !== "CANCELLED",
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
      for (const o of orders) nums[o.id] = o.externalOrderNumber;
      setOrderNumbers(nums);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar lotes");
      if (!opts?.silent) setLots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  const counts = useMemo(() => {
    return {
      open: lots.filter((l) => isOpen(l.status)).length,
      blocked: lots.filter((l) => l.status === "BLOCKED").length,
      all: lots.length,
    };
  }, [lots]);

  const byStatus = useMemo(() => {
    if (statusFilter === "open") return lots.filter((l) => isOpen(l.status));
    if (statusFilter === "blocked") {
      return lots.filter((l) => l.status === "BLOCKED");
    }
    return lots;
  }, [lots, statusFilter]);

  const visible = useMemo(() => {
    const lotQ = filters.lotQuery.trim().toUpperCase();
    const opQ = filters.opQuery.trim().toUpperCase();

    return byStatus.filter((lot) => {
      const lotDate =
        lot.createdAt?.slice(0, 10) ?? lot.updatedAt.slice(0, 10);
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
  }, [byStatus, filters, orderNumbers]);

  const filtersActive = hasActiveProductionFilters(filters);

  return (
    <div className="space-y-5">
      <CockpitPageHeader
        eyebrow="Execução"
        title="Lotes"
        description="Estado atual de cada lote · concluídos no Histórico"
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
          { id: "open", label: "Abertos", count: counts.open },
          { id: "blocked", label: "Bloqueados", count: counts.blocked },
          { id: "all", label: "Todos", count: counts.all },
        ]}
      />

      <ProductionListFiltersPanel
        filters={filters}
        onChange={setFilters}
        catalog={catalog}
        resultLabel={
          loading
            ? undefined
            : `${visible.length} lote${visible.length === 1 ? "" : "s"}${
                filtersActive ? " (filtrado)" : ""
              }`
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando lotes…</p>
      ) : error ? (
        <Alert tone="critical">{error}</Alert>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nenhum lote neste filtro"
          detail={
            filtersActive
              ? "Ajuste ou limpe os filtros."
              : "Liberar uma OP no PCP gera o primeiro lote."
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
              <Button href="/app/pcp" size="lg">
                Ir ao PCP
              </Button>
            )
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {visible.map((lot) => (
            <li key={lot.id}>
              <ListRow
                href={`/app/cockpit/production/lots/${encodeURIComponent(lot.id)}`}
                leading={
                  <ProductThumbnail
                    imageUrl={productImages[lot.productId]}
                    alt={productNames[lot.productId] ?? lot.productId}
                    size="sm"
                  />
                }
                title={
                  <span className="font-mono tabular-nums">{lot.lotCode}</span>
                }
                meta={
                  <>
                    {productNames[lot.productId] ?? lot.productId}
                    {orderNumbers[lot.productionOrderId]
                      ? ` · OP ${orderNumbers[lot.productionOrderId]}`
                      : ""}
                    {lot.plannedQuantity != null
                      ? ` · ${lot.plannedQuantity.toLocaleString("pt-BR")} un.`
                      : ""}
                    {lot.currentStep
                      ? ` · ${stepTypeLabel(lot.currentStep)}`
                      : ""}
                  </>
                }
                trailing={
                  <StatusBadge status={lotTone(lot.status)}>
                    {lotStatusLabel(lot.status)}
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
