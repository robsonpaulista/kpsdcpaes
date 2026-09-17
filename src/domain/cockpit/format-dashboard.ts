export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
}

export function formatClock(d = new Date()): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLiveStamp(d = new Date()): string {
  const date = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = formatClock(d);
  return `${date} ${time}`;
}

export function hoursLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${Math.round(hours)}h (${days} dia${days === 1 ? "" : "s"})`;
}

/** Variação percentual: ((atual - base) / |base|) * 100 */
export function percentDelta(current: number, baseline: number): number | null {
  if (baseline === 0) {
    if (current === 0) return 0;
    return null;
  }
  return Math.round(((current - baseline) / Math.abs(baseline)) * 100);
}

export function ppDelta(current: number, meta: number): number {
  return Math.round(current - meta);
}
