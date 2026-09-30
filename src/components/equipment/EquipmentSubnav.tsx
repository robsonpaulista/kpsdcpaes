"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { SegmentedControl } from "@/components/ui";

const ITEMS: ReadonlyArray<{ href: string; label: string; exact?: boolean }> = [
  { href: "/app/equipment", label: "Painel", exact: true },
  { href: "/app/equipment/overview", label: "Indicadores" },
  { href: "/app/equipment/maintenance", label: "Manutenções" },
  { href: "/app/equipment/downtime", label: "Paradas" },
];

export function EquipmentSubnav() {
  const pathname = usePathname();

  const activeId = useMemo(() => {
    const match = ITEMS.find((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return match?.href ?? "";
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
