"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: ReadonlyArray<{ href: string; label: string; exact?: boolean }> = [
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

  return (
    <nav
      className="inline-flex flex-wrap gap-1 rounded-[14px] border border-dc-border/80 bg-dc-surface p-1 shadow-dc-sm"
      aria-label="Produção"
    >
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-[10px] px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? "bg-dc-orange text-white shadow-sm"
                : "text-dc-text-secondary hover:bg-dc-surface-secondary hover:text-dc-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
