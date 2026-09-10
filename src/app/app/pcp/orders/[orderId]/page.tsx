import { OrderDetailClient } from "@/components/pcp/OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailClient orderId={decodeURIComponent(orderId)} />;
}
