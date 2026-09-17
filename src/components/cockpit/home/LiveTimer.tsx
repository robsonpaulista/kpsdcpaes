"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

/**
 * Cronômetro isolado — não re-renderiza a Home inteira.
 * `baseMinutes` = minutos já decorridos no snapshot; avança a partir da montagem.
 */
export function LiveTimer({
  baseMinutes,
  className,
}: {
  baseMinutes: number | null;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (baseMinutes == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [baseMinutes]);

  if (baseMinutes == null) {
    return <span className={className}>—</span>;
  }

  const seconds = baseMinutes * 60 + tick;
  return (
    <span className={`font-mono tabular-nums ${className ?? ""}`}>
      {formatClock(seconds)}
    </span>
  );
}
