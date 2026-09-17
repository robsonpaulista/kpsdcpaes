"use client";

import { Button, Input, Select } from "@/components/ui";
import {
  EMPTY_PRODUCTION_FILTERS,
  hasActiveProductionFilters,
  type ProductionListFilters,
} from "@/lib/production/list-filters";
import type { Product } from "@/types/production";

export function ProductionListFiltersPanel({
  filters,
  onChange,
  catalog,
  resultLabel,
}: {
  filters: ProductionListFilters;
  onChange: (next: ProductionListFilters) => void;
  catalog: Product[];
  /** Ex.: "3 lotes · 2 ordens (filtrado)" */
  resultLabel?: string;
}) {
  const active = hasActiveProductionFilters(filters);

  function patch<K extends keyof ProductionListFilters>(
    key: K,
    value: ProductionListFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section
      className="rounded-[14px] border border-dc-border bg-dc-surface p-4 sm:p-5"
      aria-label="Filtros"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dc-text-muted">
            Filtros
          </h2>
          <p className="mt-0.5 text-xs text-dc-text-secondary">
            Período, produto, lote e OP
          </p>
        </div>
        {active ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(EMPTY_PRODUCTION_FILTERS)}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
          De
          <Input
            type="date"
            className="mt-1.5"
            value={filters.dateFrom}
            onChange={(e) => patch("dateFrom", e.target.value)}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
          Até
          <Input
            type="date"
            className="mt-1.5"
            value={filters.dateTo}
            onChange={(e) => patch("dateTo", e.target.value)}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted sm:col-span-2 lg:col-span-1">
          Produto
          <Select
            className="mt-1.5"
            value={filters.productId}
            onChange={(e) => patch("productId", e.target.value)}
          >
            <option value="">Todos</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
          Lote
          <Input
            className="mt-1.5"
            placeholder="Ex.: HB26091701"
            value={filters.lotQuery}
            onChange={(e) => patch("lotQuery", e.target.value)}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-text-muted">
          OP
          <Input
            className="mt-1.5"
            placeholder="Ex.: 260917-001"
            value={filters.opQuery}
            onChange={(e) => patch("opQuery", e.target.value)}
          />
        </label>
      </div>

      {resultLabel ? (
        <p className="mt-3 text-xs text-dc-text-secondary">{resultLabel}</p>
      ) : null}
    </section>
  );
}
