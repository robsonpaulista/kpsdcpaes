import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  /** light = texto escuro (cockpit); dark = texto claro (login/display) */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

/**
 * Marca DC Pães — Doc 03 §1 / §6.
 * Identidade clara sem pintar a UI de laranja.
 */
export function BrandMark({
  href = "/app/cockpit",
  tone = "light",
  size = "md",
  showWordmark = true,
}: BrandMarkProps) {
  const monogram =
    size === "lg"
      ? "h-12 w-12 text-lg"
      : size === "sm"
        ? "h-8 w-8 text-[11px]"
        : "h-9 w-9 text-xs";
  const title =
    size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  const muted = tone === "dark" ? "text-white/45" : "text-dc-text-muted";
  const strong = tone === "dark" ? "text-white" : "text-dc-text";

  const content = (
    <span className="inline-flex items-center gap-3">
      <span
        className={`relative inline-flex shrink-0 items-center justify-center rounded-[10px] bg-dc-graphite font-bold tracking-tight text-white ${monogram}`}
      >
        DC
        <span className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-dc-orange" />
      </span>
      {showWordmark ? (
        <span className="min-w-0 text-left leading-tight">
          <span className={`block font-semibold tracking-tight ${title} ${strong}`}>
            DC Pães
          </span>
          <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] ${muted}`}>
            Factory OS
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="group inline-flex transition hover:opacity-90">
      {content}
    </Link>
  );
}
