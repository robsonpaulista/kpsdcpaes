/**
 * Formatação de datas para UI (padrão BR).
 * Firestore guarda ISO (yyyy-mm-dd ou ISO datetime) — exibir sempre dd/mm/aaaa.
 */

/** "2026-09-16" ou ISO datetime → "16/09/2026" */
export function formatDateBr(
  value: string | null | undefined,
): string {
  if (!value) return "—";

  const trimmed = value.trim();
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dayOnly) {
    const [, y, m, d] = dayOnly;
    return `${d}/${m}/${y}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** ISO datetime → "16/09/2026 15:10" (só data se vier yyyy-mm-dd). */
export function formatDateTimeBr(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatDateBr(trimmed);

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return formatDateBr(trimmed);

  const date = parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = parsed.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}
