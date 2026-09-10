import { EquipmentDetailClient } from "@/components/equipment/EquipmentDetailClient";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;
  return (
    <EquipmentDetailClient equipmentId={decodeURIComponent(equipmentId)} />
  );
}
