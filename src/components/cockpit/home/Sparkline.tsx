"use client";

import { useEffect, useRef, useState } from "react";
import type { Severity } from "@/lib/severity/getSeverity";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type SparklineProps = {
  data: number[];
  severity: Severity;
  className?: string;
  /** true só na 1ª montagem do card — não redesenha a cada refresh. */
  animateOnMount?: boolean;
};

export function Sparkline({
  data,
  severity,
  className = "",
  animateOnMount = false,
}: SparklineProps) {
  const reduced = usePrefersReducedMotion();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!animateOnMount || reduced || playedRef.current) return;
    playedRef.current = true;
    setShouldAnimate(true);
  }, [animateOnMount, reduced]);

  const w = 160;
  const h = 24;
  const pad = 2;
  const values = data.length > 0 ? data : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const stroke =
    severity === "critical"
      ? "var(--critical)"
      : severity === "warning"
        ? "var(--warning)"
        : severity === "good"
          ? "var(--good)"
          : "var(--muted)";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-6 w-full ${className}`}
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={shouldAnimate ? "dc-spark-draw" : undefined}
        style={
          shouldAnimate
            ? undefined
            : { strokeDasharray: 1, strokeDashoffset: 0 }
        }
      />
      {last ? (
        <circle cx={last.x} cy={last.y} r="2.25" fill={stroke} />
      ) : null}
    </svg>
  );
}
