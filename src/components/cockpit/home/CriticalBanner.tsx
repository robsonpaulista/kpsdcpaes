import Link from "next/link";
import { Ban } from "lucide-react";
import type { CriticalBannerData } from "@/domain/cockpit/dashboard-types";

export function CriticalBanner({ data }: { data: CriticalBannerData }) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[14px] border border-danger/35 bg-danger-soft px-4 py-3.5 pl-5">
      <span
        className="absolute inset-y-0 left-0 w-1 bg-danger"
        aria-hidden
      />
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-danger text-white">
          <Ban className="size-4" strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-danger">{data.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-dc-text-secondary">
            {data.message}
          </p>
        </div>
      </div>
      <Link
        href={data.href}
        className="shrink-0 rounded-[10px] border border-danger/45 bg-dc-surface px-3 py-2 text-xs font-semibold text-danger transition-colors duration-150 hover:bg-[var(--critical-bg)]"
      >
        {data.ctaLabel}
      </Link>
    </div>
  );
}
