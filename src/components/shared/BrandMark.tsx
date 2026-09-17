import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  /** light = logo colorida (fundo claro); dark = logo branca (fundo escuro) */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

/**
 * Marca oficial DC Pães — mesma logomarca da Visão Geral / sidebar.
 */
export function BrandMark({
  href = "/app/cockpit",
  tone = "light",
  size = "md",
  showWordmark = true,
}: BrandMarkProps) {
  const height =
    size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-10";
  const title =
    size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  const strong = tone === "dark" ? "text-white" : "text-dc-text";
  const src =
    tone === "dark" ? "/brand/logomarca-white.png" : "/brand/logomarca.png";

  const content = (
    <span className="inline-flex items-center gap-3">
      <Image
        src={src}
        alt="DC Pães"
        width={368}
        height={490}
        className={`${height} w-auto shrink-0 object-contain`}
        priority
      />
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
