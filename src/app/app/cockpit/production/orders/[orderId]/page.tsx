import { OrderDetailClient } from "@/components/pcp/OrderDetailClient";

export default async function ProductionOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <OrderDetailClient
      orderId={decodeURIComponent(orderId)}
      backHref="/app/cockpit/production/orders"
      backLabel="Ordens"
    />
  );
}
