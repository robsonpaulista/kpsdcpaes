"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MapProductPanel } from "@/components/pcp/MapProductPanel";
import { ReleaseOrderButton } from "@/components/pcp/ReleaseOrderButton";
import { LotQrLabel } from "@/components/shared/LotQrLabel";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import {
  integrationStatusLabel,
  lotStatusLabel,
  productionStatusLabel,
  stepStatusLabel,
} from "@/lib/labels/production-status";
import { formatDateBr } from "@/lib/format/date";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { useFactoryLiveReload } from "@/hooks/useFactoryLiveReload";
import { getProductionOrder } from "@/repositories/orders.repository";
import { listLotsByOrder } from "@/repositories/lots.repository";
import { getProductById } from "@/repositories/products.repository";
import type { ProductionLot, ProductionOrder, Product } from "@/types/production";

export function OrderDetailClient({
  orderId,
  backHref = "/app/pcp",
  backLabel = "Ordens",
}: {
  orderId: string;
  backHref?: string;
  backLabel?: string;
}) {
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [lots, setLots] = useState<ProductionLot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const db = getFirestoreDb();
      const o = await getProductionOrder(db, orderId);
      if (!o) throw new Error("OP não encontrada.");
      setOrder(o);
      if (o.productId) {
        setProduct(await getProductById(db, o.productId));
      } else {
        setProduct(null);
      }
      setLots(await listLotsByOrder(db, o.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar OP");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFactoryLiveReload(load);
  if (loading) {
    return <p className="text-sm text-dc-text-secondary">Carregando OP…</p>;
  }
  if (error || !order) {
    return <p className="text-sm text-danger">{error ?? "OP não encontrada"}</p>;
  }

  const snapshot = order.externalSnapshot as
    | { externalProductName?: string; externalProductCode?: string }
    | undefined;
  const needsMapping = order.integrationStatus === "PENDING_VALIDATION";
  const productName =
    product?.name ?? snapshot?.externalProductName ?? "Produto";
  const alreadyReleased =
    lots.length > 0 ||
    order.productionStatus === "RELEASED" ||
    order.productionStatus === "IN_PROGRESS" ||
    order.productionStatus === "COMPLETED";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm font-semibold text-dc-text-secondary transition hover:text-dc-text"
        >
          ← {backLabel}
        </Link>
        <CockpitPageHeader
          eyebrow="Ordem de produção"
          title={`OP ${order.externalOrderNumber}`}
          description={productName}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dc-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Quantidade planejada
          </p>
          <p className="dc-metric mt-2">
            {order.plannedQuantity?.toLocaleString("pt-BR")} un.
          </p>
          <p className="mt-2 text-xs text-dc-text-muted">ORIGEM: GESTOR</p>
        </div>
        <div className="dc-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Data
          </p>
          <p className="dc-metric mt-2 tabular-nums">
            {formatDateBr(order.productionDate)}
          </p>
          <p className="mt-2 text-xs text-dc-text-muted">ORIGEM: GESTOR</p>
        </div>
        <div className="dc-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Status
          </p>
          <p
            className={`mt-2 text-lg font-semibold ${
              order.productionStatus === "COMPLETED"
                ? "text-success"
                : order.productionStatus === "IN_PROGRESS"
                  ? "text-dc-orange"
                  : "text-dc-text"
            }`}
          >
            {productionStatusLabel(order.productionStatus)}
          </p>
          <p className="mt-2 text-xs text-dc-text-muted">
            Integração: {integrationStatusLabel(order.integrationStatus)}
          </p>
        </div>
      </div>

      {order.productionStatus === "COMPLETED" ? (
        <div className="rounded-[14px] border border-success/30 bg-success/5 p-4 text-sm text-dc-text">
          Ordem concluída — todos os lotes desta OP finalizaram o fluxo.
        </div>
      ) : null}
      {needsMapping ? (
        <MapProductPanel
          sourceSystem={order.sourceSystem}
          externalProductCode={snapshot?.externalProductCode ?? ""}
          externalProductName={snapshot?.externalProductName}
          onMapped={() => void load()}
        />
      ) : (
        <div className="dc-panel p-5">
          <h2 className="text-sm font-semibold tracking-tight">Configuração de produção</h2>
          <p className="mt-1 text-sm text-dc-text-secondary">
            Batidas informadas: {order.numberOfBatches ?? "—"} · Peso/massa:{" "}
            {order.massWeightKg ?? "—"} kg (espelho/config — relação batida↔lote
            ainda aberta)
          </p>
          <div className="mt-4">
            {alreadyReleased ? (
              <p
                className={`text-sm ${
                  order.productionStatus === "COMPLETED"
                    ? "text-success"
                    : "text-success"
                }`}
              >
                {order.productionStatus === "COMPLETED"
                  ? "OP concluída"
                  : "OP liberada"}
                {lots[0] ? (
                  <>
                    {" "}
                    · lote{" "}
                    <strong className="tabular-nums">{lots[0].lotCode}</strong>
                  </>
                ) : null}
              </p>
            ) : (
              <ReleaseOrderButton
                orderId={order.id}
                disabled={order.productionStatus === "CANCELLED"}
                disabledReason={
                  order.productionStatus === "CANCELLED"
                    ? "OP cancelada não pode ser liberada."
                    : undefined
                }
                onReleased={() => void load()}
              />
            )}
          </div>
        </div>
      )}

      <div className="rounded-[14px] border border-dc-border bg-dc-surface p-5">
        <h2 className="text-sm font-semibold">Lotes</h2>
        {lots.length === 0 ? (
          <p className="mt-2 text-sm text-dc-text-secondary">
            Nenhum lote ainda. Liberar a OP cria a primeira execução.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lots.map((lot) => (
              <li
                key={lot.id}
                className="flex items-center justify-between text-sm"
              >
                <Link
                  href={`/app/cockpit/production/lots/${lot.id}`}
                  className="font-semibold tabular-nums text-dc-orange"
                >
                  {lot.lotCode}
                </Link>
                <span className="text-dc-text-secondary">
                  {lotStatusLabel(lot.status)}
                  {lot.currentStep ? ` · ${stepTypeLabel(lot.currentStep)}` : ""}
                  {lot.currentStepStatus && lot.status !== "COMPLETED"
                    ? ` · ${stepStatusLabel(lot.currentStepStatus)}`
                    : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lots[0] ? (
        <LotQrLabel
          lotCode={lots[0].lotCode}
          productName={product?.name}
          orderNumber={order?.externalOrderNumber}
        />
      ) : null}
    </div>
  );
}
