"use client";

import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { Button, EmptyState } from "@/components/ui";

type Props = {
  title: string;
  description: string;
};

/** Módulo reservado — critérios oficiais ainda não validados com a fábrica. */
export function QualityPlaceholderClient({ title, description }: Props) {
  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Qualidade"
        title={title}
        description={description}
        actions={
          <Button href="/app/quality" variant="secondary" size="sm">
            ← Visão geral
          </Button>
        }
      />
      <EmptyState
        title="Disponível após validação da fábrica"
        detail="Enquanto isso, use perdas e ocorrências para registrar o que acontece no chão. Não inventamos critérios oficiais de retrabalho/reprovação."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button href="/app/quality/losses">Fila de perdas →</Button>
            <Button href="/app/quality/incidents" variant="secondary">
              Ocorrências →
            </Button>
          </div>
        }
      />
    </div>
  );
}
