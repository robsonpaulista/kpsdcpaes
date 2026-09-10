"use client";

import Link from "next/link";
import { useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  syncProductionOrders,
  type SyncOrdersResult,
} from "@/services/production-order-sync.service";

export function SyncOrdersButton() {
  const { can } = useFactoryRole();
  const allowed = can("syncIntegration");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncOrdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase não configurado. Verifique o .env.local.");
      }
      const db = getFirestoreDb();
      const syncResult = await syncProductionOrders(db);
      setResult(syncResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao sincronizar OPs";
      setError(
        message.includes("permission") || message.includes("PERMISSION")
          ? `${message} — Verifique as Security Rules do Firestore (writes em factory_*).`
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  if (!allowed) {
    return <AccessDeniedNote action="sincronizar integração" />;
  }

  const syncOk = result != null && result.errorCount === 0;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading || !isFirebaseConfigured()}
        className="dc-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "SINCRONIZANDO…" : "SINCRONIZAR OPS"}
      </button>

      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-[12px] border border-success/25 bg-success-soft px-4 py-3 text-sm text-dc-text">
          <p className="font-semibold text-success">Sincronização concluída</p>
          <ul className="mt-2 grid gap-1 text-dc-text-secondary sm:grid-cols-2">
            <li>Fonte: {result.sourceKind}</li>
            <li>Recebidas: {result.receivedCount}</li>
            <li>Novas: {result.createdCount}</li>
            <li>Atualizadas: {result.updatedCount}</li>
            <li>Pendentes de validação: {result.pendingValidationCount}</li>
            <li>Erros: {result.errorCount}</li>
          </ul>
          {result.errors.length > 0 ? (
            <ul className="mt-2 text-danger">
              {result.errors.map((e) => (
                <li key={e.externalId}>
                  {e.externalId}: {e.message}
                </li>
              ))}
            </ul>
          ) : null}

          {syncOk ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-success/20 pt-3">
              <Link href="/app/pcp" className="dc-btn-primary h-10 px-3 text-sm">
                Ir ao PCP →
              </Link>
              <Link
                href="/app/settings/qa"
                className="dc-btn-secondary h-10 px-3 text-sm"
              >
                Marcar no QA
              </Link>
              <Link
                href="/app/settings/equipment"
                className="dc-btn-secondary h-10 px-3 text-sm"
              >
                Semear equipamentos
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
