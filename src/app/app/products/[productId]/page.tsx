import { ProductDetailClient } from "@/components/products/ProductDetailClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductDetailClient productId={decodeURIComponent(productId)} />;
}
