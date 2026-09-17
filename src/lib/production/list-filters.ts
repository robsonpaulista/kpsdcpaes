/**
 * Filtros compartilhados — Histórico / Ordens / Lotes.
 */

export type ProductionListFilters = {
  dateFrom: string;
  dateTo: string;
  productId: string;
  lotQuery: string;
  opQuery: string;
};

export const EMPTY_PRODUCTION_FILTERS: ProductionListFilters = {
  dateFrom: "",
  dateTo: "",
  productId: "",
  lotQuery: "",
  opQuery: "",
};

export function dayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function inPeriod(
  dateValue: string | null | undefined,
  from: string,
  to: string,
): boolean {
  const key = dayKey(dateValue);
  if (!key) return !from && !to;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export function hasActiveProductionFilters(
  filters: ProductionListFilters,
): boolean {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.productId ||
      filters.lotQuery.trim() ||
      filters.opQuery.trim(),
  );
}
