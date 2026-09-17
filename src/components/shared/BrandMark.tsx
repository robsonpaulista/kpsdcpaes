import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  /** light = texto escuro (cockpit); dark = texto claro (login/display) */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

/**
 * Marca KPS DC Pães — alinhada ao site dcpaes.com.br.
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
  const strong = tone === "dark" ? "text-white" : "text-dc-text";

  const content = (
    <span className="inline-flex items-center gap-3">
      <span
        className={`relative inline-flex shrink-0 items-center justify-center rounded-[10px] font-bold tracking-tight ${monogram} ${
          tone === "dark"
            ? "border border-white bg-[#563f30] text-white"
            : "bg-[var(--brand)] text-white"
        }`}
      >
        DC
        <span
          className={`absolute inset-x-1.5 bottom-1 h-0.5 rounded-full ${
            tone === "dark" ? "bg-white" : "bg-[var(--brand-accent)]"
          }`}
        />
      </span>
      {showWordmark ? (
        <span className="min-w-0 text-left leading-tight">
          <span
            className={`block font-semibold tracking-tight ${title} ${strong}`}
          >
            KPS DC Pães
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
