import Link from "next/link";
import { Suspense } from "react";
import { ProductionOrdersList } from "@/components/pcp/ProductionOrdersList";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";

export default function PcpPage() {
  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Planejamento"
        title="PCP / Programação"
        description="Ordens sincronizadas do sistema gestor — mapear, liberar e acompanhar."
        actions={
          <Link
            href="/app/settings/integrations/dev"
            className="dc-btn-secondary h-10 px-4 text-sm"
          >
            Sincronizar OPs
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="dc-panel p-5 text-sm text-dc-text-secondary">
            Carregando ordens…
          </div>
        }
      >
        <ProductionOrdersList />
      </Suspense>
    </div>
  );
}
