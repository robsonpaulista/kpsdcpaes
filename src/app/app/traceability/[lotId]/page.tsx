import { LotTimelineClient } from "@/components/cockpit/LotTimelineClient";

export default async function TraceabilityLotPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return (
    <LotTimelineClient
      lotId={decodeURIComponent(lotId)}
      backHref="/app/traceability"
      backLabel="Rastreabilidade"
      mode="traceability"
    />
  );
}
