"use client";

import Link from "next/link";
import {
  CockpitEmpty,
  CockpitPageHeader,
} from "@/components/shared/CockpitUi";

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
          <Link href="/app/quality" className="dc-btn-secondary h-10 px-3 text-sm">
            ← Visão geral
          </Link>
        }
      />
      <CockpitEmpty
        title="Disponível após validação da fábrica"
        detail="Enquanto isso, use perdas e ocorrências para registrar o que acontece no chão. Não inventamos critérios oficiais de retrabalho/reprovação."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/app/quality/losses" className="dc-btn-primary">
              Fila de perdas →
            </Link>
            <Link
              href="/app/quality/incidents"
              className="dc-btn-secondary"
            >
              Ocorrências →
            </Link>
          </div>
        }
      />
    </div>
  );
}
