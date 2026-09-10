"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Etiqueta do lote (Doc 02 §72 / Doc 11 #12).
 * Payload = lotCode — o mesmo valor que o Floor escaneia / digita.
 */
export function LotQrLabel({
  lotCode,
  productName,
  orderNumber,
  size = 168,
  compact = false,
}: {
  lotCode: string;
  productName?: string | null;
  orderNumber?: string | null;
  size?: number;
  compact?: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const value = lotCode.trim().toUpperCase();

  function handlePrint() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=560");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${value}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;text-align:center;color:#111}
  .code{font-size:22px;font-weight:700;letter-spacing:0.04em;margin-top:12px}
  .meta{font-size:13px;color:#444;margin-top:6px}
  svg{display:block;margin:0 auto}
</style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-4"
          : "rounded-[14px] border border-dc-border bg-dc-surface p-5"
      }
    >
      {!compact ? (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-dc-text">
              Etiqueta / QR do lote
            </h2>
            <p className="mt-1 text-xs text-dc-text-muted">
              Escaneie no Floor — payload = código do lote
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="h-9 rounded-xl border border-dc-border px-3 text-xs font-semibold text-dc-text hover:border-dc-orange"
          >
            Imprimir
          </button>
        </div>
      ) : null}

      <div ref={printRef} className="inline-flex flex-col items-center">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          includeMargin
          bgColor="#ffffff"
          fgColor="#111111"
        />
        <p className="mt-2 text-lg font-semibold tabular-nums tracking-wide text-dc-text">
          {value}
        </p>
        {productName || orderNumber ? (
          <p className="mt-0.5 max-w-[14rem] text-center text-xs text-dc-text-secondary">
            {[productName, orderNumber ? `OP ${orderNumber}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      {compact ? (
        <button
          type="button"
          onClick={handlePrint}
          className="h-9 self-center rounded-xl border border-dc-border px-3 text-xs font-semibold text-dc-text hover:border-dc-orange"
        >
          Imprimir
        </button>
      ) : null}
    </div>
  );
}
