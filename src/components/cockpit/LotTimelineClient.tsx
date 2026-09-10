"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LotQrLabel } from "@/components/shared/LotQrLabel";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  lotProductionHref,
  lotTraceabilityHref,
} from "@/lib/links/lots";
import { productionEventLabel } from "@/lib/labels/production-events";
import { executionStatusLabel } from "@/lib/labels/production-status";
import { formatMinutesLabel } from "@/lib/labels/timing";
import { getStation } from "@/domain/production/stations";
import { listEquipment } from "@/repositories/equipment.repository";
import { listStepRunsByLot, listEventsByLot } from "@/repositories/execution.repository";
import { getLotById } from "@/repositories/lots.repository";
import { getProductionOrder } from "@/repositories/orders.repository";
import { getProductById } from "@/repositories/products.repository";
import { listIncidentsByLot } from "@/repositories/quality.repository";
import type { Equipment } from "@/types/equipment";
import type {
  LotStepRun,
  ProductionEvent,
  ProductionLot,
  ProductionOrder,
  Product,
} from "@/types/production";
import type { QualityIncident } from "@/types/quality";
import { TraceabilityAuditPanel } from "@/components/traceability/TraceabilityAuditPanel";

export function LotTimelineClient({
  lotId,
  backHref,
  backLabel = "Voltar",
  mode = "production",
}: {
  lotId: string;
  backHref?: string;
  backLabel?: string;
  /** traceability = busca/auditoria; production = kanban/listas. */
  mode?: "production" | "traceability";
}) {
  const [lot, setLot] = useState<ProductionLot | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [events, setEvents] = useState<ProductionEvent[]>([]);
  const [steps, setSteps] = useState<LotStepRun[]>([]);
  const [incidents, setIncidents] = useState<QualityIncident[]>([]);
  const [equipmentById, setEquipmentById] = useState<Record<string, Equipment>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
        const db = getFirestoreDb();
        const found = await getLotById(db, lotId);
        if (!found) throw new Error("Lote não encontrado.");
        setLot(found);
        setProduct(await getProductById(db, found.productId));
        setOrder(await getProductionOrder(db, found.productionOrderId));
        setEvents(await listEventsByLot(db, found.id));
        setSteps(await listStepRunsByLot(db, found.id));
        setIncidents(await listIncidentsByLot(db, found.id));
        const equipment = await listEquipment(db);
        const map: Record<string, Equipment> = {};
        for (const eq of equipment) map[eq.id] = eq;
        setEquipmentById(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar lote");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [lotId]);
  if (loading) {
    return (
      <p className="text-sm text-dc-text-secondary">Carregando linha do tempo…</p>
    );
  }
  if (error || !lot) {
    return <p className="text-sm text-danger">{error ?? "Lote não encontrado"}</p>;
  }

  const href =
    backHref ??
    (mode === "traceability"
      ? "/app/traceability"
      : `/app/pcp/orders/${encodeURIComponent(lot.productionOrderId)}`);

  const totalLoss = steps.reduce(
    (sum, s) => sum + (s.lossQuantity ?? 0),
    0,
  );
  const lossesByStep = steps.filter(
    (s) => s.lossQuantity != null && s.lossQuantity > 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={href}
          className="text-sm font-semibold text-dc-text-secondary transition hover:text-dc-text"
        >
          ← {backLabel === "Voltar" && !backHref
            ? mode === "traceability"
              ? "Rastreabilidade"
              : "Voltar à OP"
            : backLabel}
        </Link>
        <CockpitPageHeader
          eyebrow={
            mode === "traceability"
              ? "Rastreabilidade · histórico do lote"
              : "Lote em produção"
          }
          title={lot.lotCode}
          description={`${product?.name ?? lot.productId}${
            order ? ` · OP ${order.externalOrderNumber}` : ""
          }`}
        />
        <p className="mt-2 text-sm text-dc-text-muted">
          {lot.currentStep ? stepTypeLabel(lot.currentStep) : "—"} ·{" "}
          {executionStatusLabel(lot.currentStepStatus, lot.status)}
          {order?.productionDate ? ` · ${order.productionDate}` : null}
          {lot.processRoute?.length
            ? " · rota snapshot na liberação"
            : null}
        </p>
      </div>

      <LotQrLabel
        lotCode={lot.lotCode}
        productName={product?.name}
        orderNumber={order?.externalOrderNumber}
      />

      {mode === "traceability" ? (
        <TraceabilityAuditPanel
          lot={lot}
          order={order}
          steps={steps}
          events={events}
          incidents={incidents}
          equipmentIds={
            new Set(
              steps
                .map((s) => s.equipmentId)
                .filter((id): id is string => Boolean(id)),
            )
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dc-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Produto
          </p>
          <p className="mt-2 text-base font-semibold tracking-tight">
            {product?.name ?? lot.productId}
          </p>
        </div>
        <div className="dc-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Ordem
          </p>
          <p className="mt-2 text-base font-semibold tabular-nums tracking-tight">
            {order?.externalOrderNumber ?? "—"}
          </p>
        </div>
        <div className="dc-panel p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-text-muted">
            Perda acumulada
          </p>
          <p className="dc-metric mt-2">
            {totalLoss.toLocaleString("pt-BR")} un.
          </p>
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="dc-panel p-5">
          <h2 className="text-sm font-semibold tracking-tight">
            Etapas · processo e espera
          </h2>
          <p className="mt-1 text-xs text-dc-text-muted">
            Espera = fila até iniciar · Processo = tempo em execução
          </p>
          <ul className="mt-4 space-y-0">
            {steps.map((s, index) => (
              <li
                key={s.id}
                className="border-t border-dc-border/70 py-3.5 first:border-0 first:pt-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-dc-text">
                    <span className="mr-2 tabular-nums text-dc-text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {stepTypeLabel(s.stepType)}
                  </p>
                  <p className="text-xs font-semibold text-dc-text-muted">
                    {executionStatusLabel(s.status, null)}
                  </p>
                </div>
                <p className="mt-1.5 text-sm tabular-nums text-dc-text-secondary">
                  Espera {formatMinutesLabel(s.waitingDurationMinutes)} · Processo{" "}
                  {formatMinutesLabel(s.processDurationMinutes)}
                  {s.standardDurationMinutes != null
                    ? ` · meta ${formatMinutesLabel(s.standardDurationMinutes)}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-dc-text-muted">
                  {s.operatorId
                    ? `Operador: ${s.operatorId}`
                    : "Operador: não informado"}
                  {s.stationId
                    ? ` · ${getStation(s.stationId)?.label ?? s.stationId}`
                    : ""}
                  {s.equipmentId
                    ? ` · ${
                        equipmentById[s.equipmentId]?.code ?? s.equipmentId
                      }`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lossesByStep.length > 0 ? (
        <div className="dc-panel p-5">
          <h2 className="text-sm font-semibold tracking-tight">Perdas por etapa</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lossesByStep.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="font-medium">{stepTypeLabel(s.stepType)}</span>
                <span className="tabular-nums text-dc-text-secondary">
                  {s.lossQuantity?.toLocaleString("pt-BR")} un.
                  {s.outputQuantity != null
                    ? ` · saída ${s.outputQuantity.toLocaleString("pt-BR")}`
                    : ""}
                  {s.lossReason ? ` · ${s.lossReason}` : " · motivo não informado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {incidents.length > 0 ? (
        <div className="dc-panel p-5">
          <h2 className="text-sm font-semibold tracking-tight">Ocorrências</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {incidents.map((i) => (
              <li key={i.id} className="rounded-[12px] bg-dc-surface-secondary/70 px-3 py-2.5">
                <p className="font-medium text-dc-text">{i.description}</p>
                <p className="mt-1 text-xs font-semibold text-dc-text-muted">
                  {i.status === "OPEN" ? "ABERTA" : "RESOLVIDA"}
                  {i.blocksLot ? " · com bloqueio" : ""}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/app/quality/incidents"
            className="mt-4 inline-block text-sm font-semibold text-dc-orange"
          >
            Abrir ocorrências →
          </Link>
        </div>
      ) : null}

      <div className="dc-panel p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          Linha do tempo de execução
        </h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-dc-text-secondary">Sem eventos ainda.</p>
        ) : (
          <ol className="relative mt-5 space-y-0 border-l-2 border-dc-border pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full border-2 border-dc-surface bg-dc-orange" />
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="w-14 shrink-0 tabular-nums font-semibold text-dc-text-muted">
                    {new Date(event.occurredAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-dc-text">
                      {productionEventLabel(event)}
                    </p>
                    <p className="mt-0.5 text-xs text-dc-text-muted">
                      {event.operatorId ? `Op. ${event.operatorId}` : null}
                      {event.operatorId && event.stationId ? " · " : null}
                      {event.stationId
                        ? getStation(event.stationId)?.label ?? event.stationId
                        : null}
                      {event.equipmentId
                        ? ` · ${
                            equipmentById[event.equipmentId]?.code ??
                            event.equipmentId
                          }`
                        : null}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {mode === "production" ? (
          <Link
            href={lotTraceabilityHref(lot.id)}
            className="font-semibold text-dc-orange"
          >
            Abrir em Rastreabilidade →
          </Link>
        ) : (
          <Link
            href={lotProductionHref(lot.id)}
            className="font-semibold text-dc-orange"
          >
            Ver no contexto Produção →
          </Link>
        )}
        <Link
          href="/app/traceability"
          className="font-semibold text-dc-text-secondary"
        >
          Buscar outro lote →
        </Link>
      </div>
    </div>
  );
}
