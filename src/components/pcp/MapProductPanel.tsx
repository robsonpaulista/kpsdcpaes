"use client";

import { useEffect, useState } from "react";
import { getFirestoreDb } from "@/lib/firebase/client";
import { listProducts } from "@/repositories/products.repository";
import { mapExternalProduct } from "@/services/map-product.service";
import type { Product } from "@/types/production";

export function MapProductPanel({
  sourceSystem,
  externalProductCode,
  externalProductName,
  onMapped,
}: {
  sourceSystem: string;
  externalProductCode: string;
  externalProductName?: string;
  onMapped: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [mode, setMode] = useState<"link" | "create">("create");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState(externalProductName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const db = getFirestoreDb();
        const list = await listProducts(db);
        setProducts(list.filter((p) => p.active));
      } catch {
        setProducts([]);
      }
    }
    void load();
  }, []);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const db = getFirestoreDb();
      const result = await mapExternalProduct(db, {
        sourceSystem,
        externalProductCode,
        externalProductName,
        existingProductId: mode === "link" ? selectedProductId : undefined,
        createNew: mode === "create",
        newProductCode: mode === "create" ? newCode || undefined : undefined,
        newProductName: mode === "create" ? newName || undefined : undefined,
      });
      setSuccess(
        `Mapeado para ${result.product.name}. ${result.resolvedOrders.length} OP(s) liberadas para configuração.`,
      );
      onMapped();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao mapear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[14px] bg-warning-soft p-4 text-sm">
      <p className="font-semibold">PRODUTO NÃO CONFIGURADO</p>
      <p className="mt-1 text-dc-text-secondary">
        Código externo:{" "}
        <span className="tabular-nums font-medium text-dc-text">
          {externalProductCode}
        </span>
        {externalProductName ? ` · ${externalProductName}` : null}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            mode === "create"
              ? "bg-dc-text text-white"
              : "bg-dc-surface text-dc-text-secondary"
          }`}
        >
          Cadastrar produto
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            mode === "link"
              ? "bg-dc-text text-white"
              : "bg-dc-surface text-dc-text-secondary"
          }`}
        >
          Vincular existente
        </button>
      </div>

      {mode === "create" ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-dc-text-muted">
            Nome no Factory OS
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-sm"
            />
          </label>
          <label className="block text-xs text-dc-text-muted">
            Código interno (opcional)
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Ex.: PAO-AUSTRALIANO-70"
              className="mt-1 h-10 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-sm tabular-nums"
            />
          </label>
        </div>
      ) : (
        <label className="mt-3 block text-xs text-dc-text-muted">
          Produto Factory
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-dc-border bg-dc-surface px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
      )}

      <button
        type="button"
        disabled={loading || (mode === "link" && !selectedProductId)}
        onClick={() => void handleSubmit()}
        className="mt-4 h-11 rounded-xl bg-dc-orange px-4 text-sm font-semibold text-white disabled:opacity-40"
      >
        {loading ? "MAPEANDO…" : "MAPEAR PRODUTO"}
      </button>

      {error ? <p className="mt-2 text-danger">{error}</p> : null}
      {success ? <p className="mt-2 text-success">{success}</p> : null}
    </div>
  );
}
