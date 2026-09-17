"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Contagem 0 → target (~650ms). Se reduced-motion ou target null, mostra final.
 */
export function useCountUp(
  target: number | null | undefined,
  opts?: { durationMs?: number; enabled?: boolean },
): number | null {
  const reduced = usePrefersReducedMotion();
  const duration = opts?.durationMs ?? 650;
  const enabled = opts?.enabled !== false;
  const [value, setValue] = useState<number | null>(
    reduced || !enabled ? (target ?? null) : target == null ? null : 0,
  );

  useEffect(() => {
    if (target == null || Number.isNaN(target)) {
      setValue(null);
      return;
    }
    if (reduced || !enabled) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    setValue(0);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled, reduced]);

  return value;
}
