"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { lotTraceabilityHref } from "@/lib/links/lots";
import { executionStatusLabel } from "@/lib/labels/production-status";
import {
  getLotByCode,
  getLotById,
  listLotsByOrder,
  listRecentLots,
} from "@/repositories/lots.repository";
import { listProductionOrders } from "@/repositories/orders.repository";
import { listProducts } from "@/repositories/products.repository";
import type { ProductionLot } from "@/types/production";

/**
 * Hub de rastreabilidade (Doc 02 §34–35) + deep link /traceability/:lotId.
 */
export function TraceabilityClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<ProductionLot[]>([]);
  const [hits, setHits] = useState<ProductionLot[] | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const [lots, products, orders] = await Promise.all([
        listRecentLots(db, 15),
        listProducts(db),
        listProductionOrders(db),
      ]);
      setRecent(lots);
      const names: Record<string, string> = {};
      for (const p of products) names[p.id] = p.name;
      setProductNames(names);
      const numbers: Record<string, string> = {};
      for (const o of orders) numbers[o.id] = o.externalOrderNumber;
      setOrderNumbers(numbers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  async function handleSearch(raw: string) {
    const term = raw.trim();
    if (!term) return;
    setSearching(true);
    setError(null);
    setHits(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();

      const byCode =
        (await getLotByCode(db, term)) ?? (await getLotById(db, term));
      if (byCode) {
        router.push(lotTraceabilityHref(byCode.id));
        return;
      }

      const orders = await listProductionOrders(db);
      const order = orders.find(
        (o) =>
          o.externalOrderNumber.toLowerCase() === term.toLowerCase() ||
          o.externalId.toLowerCase() === term.toLowerCase() ||
          o.id.toLowerCase() === term.toLowerCase(),
      );
      if (order) {
        const orderLots = await listLotsByOrder(db, order.id);
        if (orderLots.length === 1) {
          router.push(lotTraceabilityHref(orderLots[0].id));
          return;
        }
        if (orderLots.length > 1) {
          setHits(
            [...orderLots].sort((a, b) =>
              b.updatedAt.localeCompare(a.updatedAt),
            ),
          );
          return;
        }
        setError(
          `OP ${order.externalOrderNumber} encontrada, mas ainda sem lotes.`,
        );
        return;
      }

      setError("Nenhum lote ou OP encontrado para essa busca.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na busca");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Auditoria"
        title="Rastreabilidade"
        description="Encontre qualquer lote produzido. A história nasce na execução do chão."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/floor" className="dc-btn-secondary h-10 px-3 text-sm">
              Floor
            </Link>
            <Link
              href="/display/production"
              className="dc-btn-secondary h-10 px-3 text-sm"
              target="_blank"
              rel="noreferrer"
            >
              Display
            </Link>
            <Link
              href="/app/settings/qa"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              QA →
            </Link>
          </div>
        }
      />

      <div className="dc-panel border-dc-orange/20 bg-dc-orange/[0.04] px-4 py-3 text-sm text-dc-text-secondary">
        <p className="font-semibold text-dc-text">QA · passo final</p>
        <p className="mt-1">
          Após embalar no Floor, busque o código do lote aqui. O painel de
          auditoria no detalhe deve fechar verde (OP, rota, etapas, eventos).
        </p>
      </div>

      <form
        className="dc-panel p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSearch(query);
        }}
      >
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
          Buscar lote, OP ou código
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Ex.: PF26082701 ou 260827-002"
            className="mt-2 h-14 w-full rounded-[14px] border border-dc-border bg-dc-bg px-4 text-lg tabular-nums outline-none focus:border-dc-orange"
          />
        </label>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="dc-btn-primary mt-4 h-12 px-6 disabled:opacity-40"
        >
          {searching ? "BUSCANDO…" : "BUSCAR"}
        </button>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </form>

      {hits && hits.length > 0 ? (
        <div className="dc-panel p-5">
          <h2 className="text-sm font-semibold tracking-tight text-dc-text">
            Lotes da OP · {hits.length}
          </h2>
          <ul className="mt-3 divide-y divide-dc-border/70">
            {hits.map((lot) => (
              <li key={lot.id}>
                <Link
                  href={lotTraceabilityHref(lot.id)}
                  className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 transition hover:text-dc-orange"
                >
                  <span className="text-base font-semibold tabular-nums">
                    {lot.lotCode}
                  </span>
                  <span className="text-xs font-medium text-dc-text-muted">
                    {executionStatusLabel(lot.currentStepStatus, lot.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="dc-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-dc-text">
            Produções recentes
          </h2>
          <button
            type="button"
            onClick={() => void loadRecent()}
            className="text-sm font-semibold text-dc-orange"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-dc-text-secondary">Carregando…</p>
        ) : recent.length === 0 ? (
          <div className="mt-4">
            <CockpitEmpty
              title="Nenhum lote ainda"
              detail="Liberar e executar OPs gera o histórico de rastreabilidade."
              action={
                <Link href="/app/pcp" className="dc-btn-primary h-11 px-5 text-sm">
                  Ir ao PCP
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-dc-border/70">
            {recent.map((lot) => (
              <li key={lot.id}>
                <Link
                  href={lotTraceabilityHref(lot.id)}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition hover:bg-dc-surface-secondary/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-dc-text">
                      {productNames[lot.productId] ?? lot.productId}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-dc-text-secondary">
                      {lot.lotCode}
                      {orderNumbers[lot.productionOrderId]
                        ? ` · OP ${orderNumbers[lot.productionOrderId]}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-dc-text-muted">
                    <p className="font-medium text-dc-text-secondary">
                      {lot.currentStep
                        ? stepTypeLabel(lot.currentStep)
                        : "—"}
                    </p>
                    <p className="mt-0.5">
                      {executionStatusLabel(lot.currentStepStatus, lot.status)}
                    </p>
                    {lot.status === "COMPLETED" ? (
                      <p className="mt-1 inline-flex rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                        Concluído
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
