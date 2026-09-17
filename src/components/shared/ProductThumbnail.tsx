"use client";

import { Package } from "lucide-react";

/**
 * Thumbnail de produto — usa product.imageUrl ou placeholder neutro.
 */
export function ProductThumbnail({
  imageUrl,
  alt,
  size = "md",
  className = "",
}: {
  imageUrl: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "sm" ? "size-11" : size === "lg" ? "size-20" : "size-14";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className={`${box} shrink-0 rounded-[10px] border border-dc-border object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-[10px] border border-dc-border bg-[var(--surface-2)] text-dc-text-muted ${className}`}
      aria-hidden
      title="Imagem do produto ainda não disponível"
    >
      <Package className={size === "sm" ? "size-4" : "size-5"} strokeWidth={1.5} />
    </span>
  );
}
