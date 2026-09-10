"use client";

import { stepTypeLabel } from "@/domain/production/process-route";
import type { ProductionLot, ProductionOrder, Product } from "@/types/production";

type FloorLotQuickInfoProps = {
  open: boolean;
  onClose: () => void;
  lot: ProductionLot;
  product: Product | null;
  order: ProductionOrder | null;
  /** Início da etapa ativa, se disponível. */
  startedAt?: string;
};

function formatWhen(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Informações rápidas do lote no Floor (Doc 07 §105–107).
 * Sem IDs técnicos / Firebase / integração.
 */
export function FloorLotQuickInfo({
  open,
  onClose,
  lot,
  product,
  order,
  startedAt,
}: FloorLotQuickInfoProps) {
  if (!open) return null;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Lote", value: lot.lotCode },
    { label: "Produto", value: product?.name ?? "—" },
    { label: "OP", value: order?.externalOrderNumber ?? "—" },
    {
      label: "Etapa",
      value: lot.currentStep ? stepTypeLabel(lot.currentStep) : "—",
    },
    {
      label: "Início",
      value: formatWhen(startedAt ?? lot.startedAt),
    },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-dc-text/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="floor-lot-quick-info-title"
        className="relative z-10 w-full max-w-lg rounded-t-[20px] border border-dc-border bg-dc-surface px-5 pb-8 pt-4 shadow-lg"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-dc-border" />
        <h2
          id="floor-lot-quick-info-title"
          className="text-sm font-semibold text-dc-text"
        >
          Informações do lote
        </h2>
        <dl className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-b border-dc-border/60 pb-2 last:border-0"
            >
              <dt className="text-xs text-dc-text-muted">{row.label}</dt>
              <dd className="text-right text-sm font-semibold tabular-nums text-dc-text">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl border border-dc-border text-sm font-semibold text-dc-text-secondary"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
