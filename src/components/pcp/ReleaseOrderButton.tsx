"use client";

import Link from "next/link";
import { useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { LotQrLabel } from "@/components/shared/LotQrLabel";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb } from "@/lib/firebase/client";
import { releaseProductionOrder } from "@/services/release-order.service";

export function ReleaseOrderButton({
  orderId,
  disabled,
  disabledReason,
  onReleased,
}: {
  orderId: string;
  disabled?: boolean;
  disabledReason?: string;
  onReleased?: () => void;
}) {
  const { can } = useFactoryRole();
  const allowed = can("releaseOrder");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotCode, setLotCode] = useState<string | null>(null);
  const [lotId, setLotId] = useState<string | null>(null);

  async function handleRelease() {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    try {
      const db = getFirestoreDb();
      const result = await releaseProductionOrder(db, orderId);
      setLotCode(result.lot.lotCode);
      setLotId(result.lot.id);
      onReleased?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar OP");
    } finally {
      setLoading(false);
    }
  }

  if (!allowed) {
    return <AccessDeniedNote action="liberar OP" />;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void handleRelease()}
        className="dc-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "LIBERANDO…" : "LIBERAR PARA PRODUÇÃO"}
      </button>
      {disabled && disabledReason ? (
        <p className="text-xs text-warning">{disabledReason}</p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {lotCode ? (
        <div className="space-y-3 rounded-[14px] border border-success/30 bg-success/5 p-4">
          <p className="text-sm text-success">
            Lote pronto: <strong className="tabular-nums">{lotCode}</strong>
            {lotId ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/app/cockpit/production/lots/${lotId}`}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  ver lote
                </Link>
              </>
            ) : null}
          </p>
          <LotQrLabel lotCode={lotCode} size={140} compact />
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/app/floor" className="dc-btn-primary h-10 px-3 text-sm">
              Abrir Floor →
            </Link>
            <Link
              href="/display/production"
              className="dc-btn-secondary h-10 px-3 text-sm"
              target="_blank"
              rel="noreferrer"
            >
              Display TV
            </Link>
            <Link
              href="/app/settings/qa"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Marcar no QA
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
