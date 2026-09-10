"use client";

import Link from "next/link";
import { useState } from "react";
import { stepTypeLabel } from "@/domain/production/process-route";
import { useStation } from "@/hooks/useStation";

/**
 * Associação dispositivo → estação (Doc 07 §88–89).
 */
export function FloorStationSetup() {
  const { stations, station, associateStation } = useStation();
  const [selectedId, setSelectedId] = useState(station.id);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <div>
        <p className="floor-eyebrow">Configuração do dispositivo</p>
        <h1 className="floor-title mt-2">Associar tablet à estação</h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-dc-text-secondary">
          Este aparelho fica fixo nesta estação. O operador se identifica à
          parte — estação ≠ pessoa.
        </p>
      </div>

      <div className="rounded-[16px] border border-dc-orange/25 bg-dc-orange/5 px-4 py-3 text-sm text-dc-text-secondary">
        <p className="font-semibold text-dc-text">QA · primeiro ciclo</p>
        <p className="mt-1 leading-relaxed">
          Comece em <strong className="text-dc-text">Pesagem</strong> (ou
          Amasso). Antes: liberar OP no PCP e semear equipamentos se a fila
          pedir recurso.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-dc-orange">
          <Link href="/app/pcp">PCP →</Link>
          <Link href="/app/settings/equipment">Equipamentos →</Link>
          <Link href="/app/settings/loss-reasons">Motivos de perda →</Link>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {stations.map((s) => {
          const active = s.id === selectedId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`flex w-full flex-col items-start rounded-[16px] border px-4 py-4 text-left transition ${
                  active
                    ? "border-dc-orange bg-dc-orange-soft shadow-dc-sm"
                    : "border-dc-border bg-dc-surface hover:border-dc-text/20"
                }`}
              >
                <span className="text-base font-semibold tracking-tight text-dc-text">
                  {s.label}
                </span>
                <span className="mt-1 text-sm text-dc-text-secondary">
                  {stepTypeLabel(s.stepType)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => associateStation(selectedId)}
        className="floor-btn-primary sm:max-w-sm"
      >
        CONFIRMAR ESTAÇÃO
      </button>
    </div>
  );
}
