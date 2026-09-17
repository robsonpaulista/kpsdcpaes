import type { Product } from "@/types/production";

export type ProductMaps = {
  names: Record<string, string>;
  images: Record<string, string | null>;
};

/** Mapas productId → nome / imagem a partir do catálogo. */
export function buildProductMaps(products: Product[]): ProductMaps {
  const names: Record<string, string> = {};
  const images: Record<string, string | null> = {};
  for (const p of products) {
    names[p.id] = p.name;
    images[p.id] = p.imageUrl ?? null;
  }
  return { names, images };
}
