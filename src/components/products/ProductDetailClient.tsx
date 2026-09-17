"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CockpitEmpty,
  CockpitPageHeader,
  CockpitSegments,
} from "@/components/shared/CockpitUi";
import {
  resolveProcessRoute,
  stepTypeLabel,
} from "@/domain/production/process-route";
import { ProductThumbnail } from "@/components/shared/ProductThumbnail";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { listProductMappings } from "@/repositories/product-mappings.repository";
import {
  getProductById,
  upsertProduct,
} from "@/repositories/products.repository";
import { listActiveLots } from "@/repositories/lots.repository";
import type {
  ProcessRouteStep,
  Product,
  ProductMapping,
  ProductionLot,
} from "@/types/production";

type TabId = "geral" | "ficha" | "processo" | "tempos" | "historico";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "geral", label: "Geral" },
  { id: "ficha", label: "Ficha Técnica" },
  { id: "processo", label: "Processo" },
  { id: "tempos", label: "Tempos" },
  { id: "historico", label: "Histórico" },
];

export function ProductDetailClient({ productId }: { productId: string }) {
  const { can } = useFactoryRole();
  const canEditRoute = can("manageCatalog");
  const [product, setProduct] = useState<Product | null>(null);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [routeDraft, setRouteDraft] = useState<ProcessRouteStep[]>([]);
  const [tab, setTab] = useState<TabId>("geral");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        if (!isFirebaseConfigured()) {
          throw new Error("Firebase não configurado.");
        }
        const db = getFirestoreDb();
        const [found, allMappings, activeLots] = await Promise.all([
          getProductById(db, productId),
          listProductMappings(db),
          listActiveLots(db),
        ]);
        if (!found) {
          setProduct(null);
          setMappings([]);
          setLots([]);
          setError("Produto não encontrado.");
          return;
        }
        setProduct(found);
        setRouteDraft(resolveProcessRoute(found.processRoute));
        setMappings(
          allMappings.filter((m) => m.productId === found.id && m.active),
        );
        setLots(
          activeLots
            .filter((l) => l.productId === found.id)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);

  async function handleSaveRoute() {
    if (!product || !canEditRoute) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const cleaned = routeDraft.map((step, index) => ({
        ...step,
        sequence: index + 1,
        standardDurationMinutes: Math.max(
          1,
          Math.round(step.standardDurationMinutes),
        ),
        lateToleranceMinutes: Math.max(
          0,
          Math.round(step.lateToleranceMinutes),
        ),
      }));
      const updated = await upsertProduct(getFirestoreDb(), {
        ...product,
        processRoute: cleaned,
      });
      setProduct(updated);
      setRouteDraft(resolveProcessRoute(updated.processRoute));
      setSaveMessage(
        "Rota salva. Novos lotes liberados usam estes tempos (snapshot).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar rota");
    } finally {
      setSaving(false);
    }
  }

  function updateStep(
    stepType: ProcessRouteStep["stepType"],
    patch: Partial<
      Pick<ProcessRouteStep, "standardDurationMinutes" | "lateToleranceMinutes">
    >,
  ) {
    setRouteDraft((prev) =>
      prev.map((s) => (s.stepType === stepType ? { ...s, ...patch } : s)),
    );
  }

  if (loading) {
    return <p className="text-sm text-dc-text-secondary">Carregando…</p>;
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <CockpitPageHeader
          eyebrow="Catálogo"
          title="Produto"
          actions={
            <Link href="/app/products" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Produtos
            </Link>
          }
        />
        <CockpitEmpty
          title={error ?? "Produto não encontrado"}
          detail="Volte à lista ou semee o catálogo DC Pães."
          action={
            <Link href="/app/products" className="dc-btn-primary">
              Ver produtos
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Produto"
        title={product.name}
        description={`${product.code}${product.active ? " · ativo" : " · inativo"}`}
        actions={
          <Link href="/app/products" className="dc-btn-secondary h-10 px-3 text-sm">
            ← Produtos
          </Link>
        }
      />

      {product.imageUrl ? (
        <div className="flex items-start gap-4">
          <ProductThumbnail
            imageUrl={product.imageUrl}
            alt={product.name}
            size="lg"
            className="!size-28 !rounded-[14px]"
          />
          <p className="max-w-md text-sm text-dc-text-secondary">
            Imagem do catálogo DC Pães vinculada a este SKU.
          </p>
        </div>
      ) : null}

      <CockpitSegments
        activeId={tab}
        onSelect={(id) => setTab(id as TabId)}
        items={TABS.map((item) => ({ id: item.id, label: item.label }))}
      />

      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {tab === "geral" ? (
        <dl className="dc-panel space-y-3 px-5 py-5">
          <Row label="Código" value={product.code} />
          <Row label="Nome" value={product.name} />
          <Row
            label="Peso nominal"
            value={
              product.nominalWeight != null
                ? `${product.nominalWeight} ${product.unit ?? "g"}`
                : "—"
            }
          />
          <Row
            label="Código ERP"
            value={product.externalProductCode ?? "—"}
          />
          <Row
            label="Mapeamentos ativos"
            value={
              mappings.length === 0
                ? "Nenhum — configure no PCP se a OP vier bloqueada"
                : mappings
                    .map((m) => `${m.sourceSystem}:${m.externalProductCode}`)
                    .join(" · ")
            }
          />
          <Row
            label="Rota de tempos"
            value={
              product.processRoute?.length
                ? "Configurada neste produto"
                : "Usando padrão da fábrica"
            }
          />
        </dl>
      ) : null}

      {tab === "ficha" ? (
        <div className="dc-panel border-dashed px-5 py-5">
          <p className="dc-eyebrow">Receita</p>
          <p className="mt-2 text-sm font-semibold tracking-tight text-dc-text">
            Ficha técnica
          </p>
          <p className="mt-2 text-sm text-dc-text-secondary">
            Aguardando ficha oficial validada pela operação. O Factory OS{" "}
            <strong className="font-semibold text-dc-text">não inventa</strong>{" "}
            ingredientes nem quantidades industriais.
          </p>
          <p className="mt-3 text-xs text-dc-text-muted">
            Quando existir, a ficha será snapshot por lote (Doc 10) — alteração
            futura da receita não muda produção já registrada.
          </p>
        </div>
      ) : null}

      {tab === "processo" || tab === "tempos" ? (
        <div className="dc-panel px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="dc-eyebrow">
                {tab === "processo" ? "Rota" : "Tempos"}
              </p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-dc-text">
                {tab === "processo" ? "Rota de processo" : "Tempos padrão"}
              </p>
              <p className="mt-1 max-w-2xl text-xs text-dc-text-muted">
                Salvo no produto. Na liberação da OP, a rota é{" "}
                <strong className="text-dc-text">copiada para o lote</strong> —
                mudanças depois não alteram lotes já liberados.
              </p>
            </div>
            {canEditRoute ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveRoute()}
                className="dc-btn-primary h-10 px-3 text-xs disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar rota"}
              </button>
            ) : (
              <p className="text-xs text-dc-text-muted">
                Edição: Admin / Gestor
              </p>
            )}
          </div>
          {saveMessage ? (
            <p className="mt-3 rounded-[12px] border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
              {saveMessage}
            </p>
          ) : null}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-dc-text-muted">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Etapa</th>
                  <th className="pb-2 font-medium">Tempo (min)</th>
                  <th className="pb-2 font-medium">Tolerância</th>
                </tr>
              </thead>
              <tbody>
                {routeDraft.map((step) => (
                  <tr
                    key={step.stepType}
                    className="border-t border-dc-border/60"
                  >
                    <td className="py-2.5 tabular-nums text-dc-text-muted">
                      {step.sequence}
                    </td>
                    <td className="py-2.5 font-medium text-dc-text">
                      {stepTypeLabel(step.stepType)}
                    </td>
                    <td className="py-2.5">
                      {canEditRoute ? (
                        <input
                          type="number"
                          min={1}
                          value={step.standardDurationMinutes}
                          onChange={(e) =>
                            updateStep(step.stepType, {
                              standardDurationMinutes:
                                Number(e.target.value) || 1,
                            })
                          }
                          className="h-9 w-20 rounded-[10px] border border-dc-border bg-dc-bg px-2 tabular-nums text-dc-text outline-none focus:border-dc-orange"
                        />
                      ) : (
                        <span className="tabular-nums text-dc-text-secondary">
                          {step.standardDurationMinutes} min
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {canEditRoute ? (
                        <input
                          type="number"
                          min={0}
                          value={step.lateToleranceMinutes}
                          onChange={(e) =>
                            updateStep(step.stepType, {
                              lateToleranceMinutes:
                                Number(e.target.value) || 0,
                            })
                          }
                          className="h-9 w-20 rounded-[10px] border border-dc-border bg-dc-bg px-2 tabular-nums text-dc-text outline-none focus:border-dc-orange"
                        />
                      ) : (
                        <span className="tabular-nums text-dc-text-secondary">
                          +{step.lateToleranceMinutes} min
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "historico" ? (
        <div className="dc-panel px-5 py-5">
          <p className="dc-eyebrow">Em curso</p>
          <p className="mt-1 text-sm font-semibold tracking-tight text-dc-text">
            Lotes ativos deste produto
          </p>
          {lots.length === 0 ? (
            <p className="mt-3 text-sm text-dc-text-secondary">
              Nenhum lote ativo no momento.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-dc-border/70">
              {lots.map((lot) => (
                <li key={lot.id}>
                  <Link
                    href={`/app/cockpit/production/lots/${lot.id}`}
                    className="flex items-center justify-between px-1 py-2.5 text-sm transition hover:bg-dc-surface-secondary"
                  >
                    <span className="font-semibold tabular-nums text-dc-orange">
                      {lot.lotCode}
                    </span>
                    <span className="text-xs text-dc-text-secondary">
                      {lot.currentStep
                        ? stepTypeLabel(lot.currentStep)
                        : lot.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-dc-text-muted">
            Histórico completo de lotes concluídos: use{" "}
            <Link
              href="/app/traceability"
              className="font-medium text-dc-orange"
            >
              Rastreabilidade →
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dc-border/50 pb-2.5 last:border-0 last:pb-0">
      <dt className="text-xs text-dc-text-muted">{label}</dt>
      <dd className="text-sm font-medium text-dc-text">{value}</dd>
    </div>
  );
}
