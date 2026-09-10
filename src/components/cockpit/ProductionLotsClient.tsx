"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { stepTypeLabel } from "@/domain/production/process-route";
import {
  CockpitEmpty,
  CockpitPageHeader,
  CockpitSegments,
} from "@/components/shared/CockpitUi";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { lotStatusLabel } from "@/lib/labels/production-status";
import { listLots } from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type { LotStatus, ProductionLot } from "@/types/production";

type Filter = "open" | "blocked" | "all";

function isOpen(status: LotStatus): boolean {
  return status === "WAITING" || status === "IN_PROGRESS";
}

/**
 * Doc 02 §29 — lotes e estado atual.
 */
export function ProductionLotsClient() {
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("open");
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
        allLots.filter((l) => l.status !== "COMPLETED" && l.status !== "CANCELLED"),
      );
      const names: Record<string, string> = {};
      for (const p of products) names[p.id] = p.name;
      setProductNames(names);
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

  const visible = useMemo(() => {
    if (filter === "open") return lots.filter((l) => isOpen(l.status));
    if (filter === "blocked") return lots.filter((l) => l.status === "BLOCKED");
    return lots;
  }, [lots, filter]);

  return (
    <div className="space-y-5">
      <CockpitPageHeader
        eyebrow="Execução"
        title="Lotes"
        description="Estado atual de cada lote · concluídos no Histórico"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="dc-btn-secondary h-10 px-4 text-sm"
          >
            Atualizar
          </button>
        }
      />

      <CockpitSegments
        activeId={filter}
        onSelect={(id) => setFilter(id as Filter)}
        items={[
          { id: "open", label: "Abertos", count: counts.open },
          { id: "blocked", label: "Bloqueados", count: counts.blocked },
          { id: "all", label: "Todos", count: counts.all },
        ]}
      />

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando lotes…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : visible.length === 0 ? (
        <CockpitEmpty
          title="Nenhum lote neste filtro"
          detail="Liberar uma OP no PCP gera o primeiro lote."
          action={
            <Link href="/app/pcp" className="dc-btn-primary h-11 px-5 text-sm">
              Ir ao PCP
            </Link>
          }
        />
      ) : (
        <ul className="dc-panel divide-y divide-dc-border/70 overflow-hidden">
          {visible.map((lot) => (
            <li key={lot.id}>
              <Link
                href={`/app/cockpit/production/lots/${encodeURIComponent(lot.id)}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-dc-surface-secondary/80"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold tabular-nums tracking-tight text-dc-text">
                    {lot.lotCode}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-dc-text-secondary">
                    {productNames[lot.productId] ?? lot.productId}
                    {orderNumbers[lot.productionOrderId]
                      ? ` · OP ${orderNumbers[lot.productionOrderId]}`
                      : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p
                    className={`font-semibold ${
                      lot.status === "BLOCKED"
                        ? "text-danger"
                        : lot.status === "IN_PROGRESS"
                          ? "text-dc-orange"
                          : "text-dc-text"
                    }`}
                  >
                    {lotStatusLabel(lot.status)}
                  </p>
                  <p className="mt-0.5 text-xs text-dc-text-muted">
                    {lot.currentStep ? stepTypeLabel(lot.currentStep) : "—"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
