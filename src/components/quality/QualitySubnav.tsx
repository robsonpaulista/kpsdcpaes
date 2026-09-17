"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { SegmentedControl } from "@/components/ui";

const ITEMS: ReadonlyArray<{ href: string; label: string; exact?: boolean }> = [
  { href: "/app/quality", label: "Visão geral", exact: true },
  { href: "/app/quality/losses", label: "Perdas" },
  { href: "/app/quality/incidents", label: "Ocorrências" },
  { href: "/app/quality/rework", label: "Retrabalho" },
  { href: "/app/quality/rejections", label: "Reprovações" },
];

/** Subnav Qualidade (Doc 02 §8 / §69–70). */
export function QualitySubnav() {
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
