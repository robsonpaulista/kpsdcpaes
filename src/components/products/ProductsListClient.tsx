"use client";

import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import {
  Alert,
  Button,
  EmptyState,
  ListRow,
  StatTile,
  StatusBadge,
} from "@/components/ui";
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
      setMessage(
        `${seeded.length} produto(s) DC Pães garantidos no catálogo (com imagem).`,
      );
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao semear");
    } finally {
      setBusy(false);
    }
  }

  const visible = items.filter((p) => p.active);

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Catálogo industrial DC Pães com fotos reais. Ficha técnica oficial entra quando a operação validar."
        actions={
          canSeed ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void handleSeed()}
            >
              {busy ? "…" : "Semear catálogo DC Pães"}
            </Button>
          ) : null
        }
      />

      {!loading && visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Total" value={counts.total} />
          <StatTile label="Ativos" value={counts.active} />
          <StatTile label="Com código ERP" value={counts.mapped} />
        </div>
      ) : null}

      {message ? <Alert tone="good">{message}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-2)]">Carregando…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nenhum produto"
          detail="Semeie o catálogo DC Pães ou mapeie produtos no PCP."
          action={
            canSeed ? (
              <Button disabled={busy} onClick={() => void handleSeed()}>
                Semear catálogo DC Pães
              </Button>
            ) : (
              <Button href="/app/pcp">Ir ao PCP →</Button>
            )
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {visible.map((product) => (
            <li key={product.id}>
              <ListRow
                href={`/app/products/${encodeURIComponent(product.id)}`}
                leading={
                  <ProductThumbnail
                    imageUrl={product.imageUrl}
                    alt={product.name}
                    size="sm"
                  />
                }
                title={product.name}
                meta={
                  <>
                    <span className="font-mono tabular-nums">{product.code}</span>
                    {product.externalProductCode
                      ? ` · ERP ${product.externalProductCode}`
                      : ""}
                    {product.nominalWeight != null
                      ? ` · ${product.nominalWeight} ${product.unit ?? "g"}`
                      : ""}
                  </>
                }
                trailing={
                  <>
                    <StatusBadge status={product.active ? "good" : "neutral"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </StatusBadge>
                    <ChevronRight className="size-4 text-[var(--muted)]" />
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
