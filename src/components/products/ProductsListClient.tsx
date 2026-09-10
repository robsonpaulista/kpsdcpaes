"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  listProducts,
  seedMockFactoryProducts,
} from "@/repositories/products.repository";
import type { Product } from "@/types/production";

export function ProductsListClient() {
  const { can } = useFactoryRole();
  const canSeed = can("manageCatalog");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const list = await listProducts(getFirestoreDb());
      list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
      if (!opts?.silent) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  const counts = useMemo(() => {
    const active = items.filter((p) => p.active).length;
    const mapped = items.filter((p) => Boolean(p.externalProductCode)).length;
    return { total: items.length, active, mapped };
  }, [items]);

  async function handleSeed() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const seeded = await seedMockFactoryProducts(getFirestoreDb());
      setMessage(`${seeded.length} produto(s) do mock garantidos no catálogo.`);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao semear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Catálogo industrial do Factory OS (Doc 02). Ficha técnica oficial entra quando a operação validar — sem inventar receita aqui."
        actions={
          canSeed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSeed()}
              className="dc-btn-secondary h-10 disabled:opacity-50"
            >
              {busy ? "…" : "Semear produtos mock"}
            </button>
          ) : null
        }
      />

      {!loading && items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="dc-panel px-4 py-4">
            <p className="dc-eyebrow">Total</p>
            <p className="dc-metric mt-2 text-dc-text">{counts.total}</p>
          </div>
          <div className="dc-panel px-4 py-4">
            <p className="dc-eyebrow">Ativos</p>
            <p className="dc-metric mt-2 text-success">{counts.active}</p>
          </div>
          <div className="dc-panel px-4 py-4">
            <p className="dc-eyebrow">Com código ERP</p>
            <p className="dc-metric mt-2 text-dc-orange">{counts.mapped}</p>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-[12px] border border-success/25 bg-success-soft px-4 py-2.5 text-sm text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-dc-text-secondary">Carregando…</p>
      ) : items.length === 0 ? (
        <CockpitEmpty
          title="Nenhum produto"
          detail="Sincronize OPs / mapeie produtos no PCP ou semee o catálogo mock."
          action={
            canSeed ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSeed()}
                className="dc-btn-primary"
              >
                Semear produtos mock
              </button>
            ) : (
              <Link href="/app/pcp" className="dc-btn-primary">
                Ir ao PCP →
              </Link>
            )
          }
        />
      ) : (
        <ul className="dc-panel divide-y divide-dc-border/70 overflow-hidden">
          {items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/app/products/${encodeURIComponent(product.id)}`}
                className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-dc-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-dc-text">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-dc-text-muted">
                    {product.code}
                    {product.externalProductCode
                      ? ` · ERP ${product.externalProductCode}`
                      : ""}
                    {product.nominalWeight != null
                      ? ` · ${product.nominalWeight} ${product.unit ?? "g"}`
                      : ""}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      product.active
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-dc-border bg-dc-surface-secondary text-dc-text-muted"
                    }`}
                  >
                    {product.active ? "Ativo" : "Inativo"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-dc-text-muted transition group-hover:translate-x-0.5 group-hover:text-dc-orange" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
