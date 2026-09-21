"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { SegmentedControl } from "@/components/ui";

const ITEMS: ReadonlyArray<{ href: string; label: string; exact?: boolean }> = [
  { href: "/app/cockpit/production/overview", label: "Visão Geral" },
  { href: "/app/cockpit/production", label: "Ao vivo", exact: true },
  { href: "/app/cockpit/production/orders", label: "Ordens" },
  { href: "/app/cockpit/production/lots", label: "Lotes" },
  { href: "/app/cockpit/production/history", label: "Histórico" },
];

/**
 * Subnav de Produção (Doc 02 §8 / §19–30).
 */
export function ProductionSubnav() {
  const pathname = usePathname();

  const activeId = useMemo(() => {
    const match = ITEMS.find((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return match?.href ?? ITEMS[0]!.href;
  }, [pathname]);

  return (
    <SegmentedControl
      activeId={activeId}
      items={ITEMS.map((item) => ({
        id: item.href,
        label: item.label,
        href: item.href,
      }))}
    />
  );
}
