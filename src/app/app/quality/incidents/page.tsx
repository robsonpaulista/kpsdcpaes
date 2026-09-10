import { Suspense } from "react";
import { QualityIncidentsClient } from "@/components/quality/QualityIncidentsClient";

export default function QualityIncidentsPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-dc-text-secondary">Carregando ocorrências…</p>
      }
    >
      <QualityIncidentsClient />
    </Suspense>
  );
}
