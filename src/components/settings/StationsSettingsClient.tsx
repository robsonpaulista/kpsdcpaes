"use client";

import Link from "next/link";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { stepTypeLabel } from "@/domain/production/process-route";
import { FACTORY_STATIONS } from "@/domain/production/stations";

/**
 * Estações V1 — leitura (Doc 02 §8 / settings/stations).
 * Catálogo ainda no domínio; layout físico real a validar com a fábrica.
 * Não inventar CRUD de estações sem regra operacional.
 */
export function StationsSettingsClient() {
  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Catálogo"
        title="Estações"
        description="Estação = contexto operacional do tablet (Doc 07). Equipamento = recurso físico. Associação estação↔etapa V1 é simplificada."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link
              href="/app/settings/equipment"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Equipamentos →
            </Link>
          </div>
        }
      />

      <ul className="dc-panel divide-y divide-dc-border/70 overflow-hidden">
        {FACTORY_STATIONS.map((station) => (
          <li
            key={station.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
          >
            <div>
              <p className="text-sm font-semibold tracking-tight text-dc-text">
                {station.label}
              </p>
              <p className="mt-0.5 text-xs text-dc-text-muted">
                Etapa: {stepTypeLabel(station.stepType)}
              </p>
            </div>
            <p className="rounded-full bg-dc-surface-secondary px-2.5 py-1 text-[11px] tabular-nums text-dc-text-muted">
              {station.id}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-xs text-dc-text-muted">
        Tablets associam-se a uma estação no Floor (modo dispositivo). Edição do
        catálogo físico fica para validação operacional — sem CRUD inventado
        nesta V1.
      </p>
    </div>
  );
}
