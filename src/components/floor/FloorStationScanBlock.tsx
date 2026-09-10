"use client";

import { FloorQrScanner } from "@/components/floor/FloorQrScanner";

/**
 * Bloco comum de entrada por QR / digitação no Floor (monitores por estação).
 */
export function FloorStationScanBlock({
  caption = "Entrada · escanear QR",
  active,
  code,
  busy,
  manualEntry,
  error,
  onScan,
  onCodeChange,
  onIdentify,
  onToggleManual,
  onClearError,
}: {
  caption?: string;
  active: boolean;
  code: string;
  busy: boolean;
  manualEntry: boolean;
  error: string | null;
  onScan: (raw: string) => void;
  onCodeChange: (value: string) => void;
  onIdentify: () => void;
  onToggleManual: (manual: boolean) => void;
  onClearError: () => void;
}) {
  return (
    <>
      <div className="mt-8 w-full">
        <p className="floor-eyebrow mb-3">{caption}</p>
        <FloorQrScanner active={active} onScan={onScan} />
      </div>

      {manualEntry ? (
        <form
          className="mt-6 w-full space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onIdentify();
          }}
        >
          <label className="block text-left text-sm font-medium text-dc-text-muted">
            Digitar lote
            <input
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="Ex.: PH26082801"
              autoFocus
              className="mt-1.5 h-14 w-full rounded-[14px] border border-dc-border bg-dc-surface px-4 text-lg tabular-nums outline-none focus:border-dc-orange"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="floor-btn-finish"
          >
            {busy ? "BUSCANDO…" : "IDENTIFICAR LOTE"}
          </button>
          <button
            type="button"
            onClick={() => onToggleManual(false)}
            className="w-full text-center text-sm font-medium text-dc-text-muted"
          >
            Voltar ao scanner
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onToggleManual(true)}
          className="mt-6 text-sm font-semibold text-dc-text-secondary underline-offset-2 hover:underline"
        >
          Não consegue escanear? DIGITAR LOTE
        </button>
      )}

      {error ? (
        <div className="mt-5 rounded-[18px] border border-danger/25 bg-danger-soft px-4 py-4 text-left">
          <p className="text-base font-bold text-danger">ATENÇÃO</p>
          <p className="mt-1.5 text-sm text-dc-text-secondary">{error}</p>
          <button
            type="button"
            onClick={onClearError}
            className="mt-3 text-sm font-bold text-dc-orange"
          >
            TENTAR DE NOVO
          </button>
        </div>
      ) : null}
    </>
  );
}
