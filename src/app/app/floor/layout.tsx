"use client";

import { AuthGate } from "@/components/auth/AuthGate";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { BrandMark } from "@/components/shared/BrandMark";
import { FloorConnectionBadge } from "@/components/floor/FloorConnectionBadge";
import { FloorInstallHint } from "@/components/floor/FloorInstallHint";
import { FloorStationSetup } from "@/components/floor/FloorStationSetup";
import { stepTypeLabel } from "@/domain/production/process-route";
import {
  FactoryRoleProvider,
  useFactoryRole,
} from "@/hooks/useFactoryRole";
import { OperatorProvider, useOperator } from "@/hooks/useOperator";
import { StationProvider, useStation } from "@/hooks/useStation";

function FloorChrome({ children }: { children: React.ReactNode }) {
  const {
    station,
    locked,
    ready,
    unlockForReconfigure,
  } = useStation();
  const { operatorName, setOperatorName } = useOperator();
  const { can } = useFactoryRole();
  const canExecute = can("executeFloor");

  function handleReconfigure() {
    const ok = window.confirm(
      `Trocar a estação deste tablet?\n\nHoje: ${station.label}\n\nSó use se for reconfigurar o dispositivo.`,
    );
    if (ok) unlockForReconfigure();
  }

  if (!ready) {
    return (
      <div className="floor-chrome flex min-h-screen items-center justify-center text-sm text-dc-text-secondary">
        Carregando estação…
      </div>
    );
  }

  if (!locked) {
    return (
      <div className="floor-chrome flex min-h-screen flex-col">
        <header className="floor-header flex h-16 items-center justify-between gap-3 px-4">
          <BrandMark href="/app/floor" size="sm" />
          <FloorConnectionBadge />
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
          {!canExecute ? (
            <div className="mt-8">
              <AccessDeniedNote action="configurar estação / executar no chão" />
            </div>
          ) : (
            <FloorStationSetup />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="floor-chrome flex min-h-screen flex-col">
      <header className="floor-header flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden sm:inline">
            <BrandMark href="/app/floor" size="sm" showWordmark={false} />
          </span>
          <div className="min-w-0">
            <p className="floor-eyebrow">Chão de fábrica</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="truncate text-base font-semibold tracking-tight text-dc-text">
                {station.label}
              </p>
              {canExecute ? (
                <button
                  type="button"
                  onClick={handleReconfigure}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-dc-text-muted underline-offset-2 hover:text-dc-text-secondary hover:underline"
                >
                  Trocar
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <FloorConnectionBadge />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5">
        <FloorInstallHint />
        {!canExecute ? (
          <div className="mb-4">
            <AccessDeniedNote action="apontar etapas no chão de fábrica" />
          </div>
        ) : null}
        {children}
      </main>

      <footer className="floor-footer flex min-h-16 items-center justify-between gap-3 px-4 py-2 text-sm">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
            Operador
          </span>
          <input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Seu nome"
            disabled={!canExecute}
            className="h-11 min-w-0 flex-1 rounded-[12px] border border-white/15 bg-black/25 px-3 text-base font-medium text-white outline-none placeholder:text-white/30 focus:border-dc-orange disabled:opacity-50"
          />
        </label>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
          {stepTypeLabel(station.stepType)}
        </span>
      </footer>
    </div>
  );
}

export default function FloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate label="DC Pães · Chão de fábrica">
      <FactoryRoleProvider>
        <StationProvider>
          <OperatorProvider>
            <FloorChrome>{children}</FloorChrome>
          </OperatorProvider>
        </StationProvider>
      </FactoryRoleProvider>
    </AuthGate>
  );
}
