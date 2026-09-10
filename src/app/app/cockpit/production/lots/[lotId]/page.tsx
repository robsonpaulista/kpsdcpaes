import { LotTimelineClient } from "@/components/cockpit/LotTimelineClient";

export default async function LotTimelinePage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return (
    <LotTimelineClient
      lotId={decodeURIComponent(lotId)}
      backHref="/app/cockpit/production/lots"
      backLabel="Lotes"
    />
  );
}
