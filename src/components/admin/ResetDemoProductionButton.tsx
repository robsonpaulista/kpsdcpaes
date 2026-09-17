"use client";

import Link from "next/link";
import { useState } from "react";
import { AccessDeniedNote } from "@/components/access/AccessDeniedNote";
import { useFactoryRole } from "@/hooks/useFactoryRole";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  resetAndSeedDemoProduction,
  type SeedDemoProductionResult,
} from "@/services/seed-demo-production.service";

/**
 * Apaga OPs/lotes mock antigos e recria com o catálogo DC Pães.
 * Uso só em ambiente de desenvolvimento.
 */
export function ResetDemoProductionButton() {
  const { can, role } = useFactoryRole();
  const allowed = can("syncIntegration") && role === "ADMIN";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedDemoProductionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!allowed) return;
    const ok = window.confirm(
      "Apagar TODAS as OPs, lotes, etapas e eventos atuais e recriar a demo com os produtos DC Pães?",
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase não configurado. Verifique o .env.local.");
      }
      const next = await resetAndSeedDemoProduction(getFirestoreDb());
      setResult(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao resetar produção";
      setError(
        message.includes("permission") || message.includes("PERMISSION")
          ? `${message} — É necessário papel Admin e rules publicadas.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  if (!allowed) {
    return <AccessDeniedNote action="resetar produção demo (Admin)" />;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleReset()}
        disabled={loading || !isFirebaseConfigured()}
        className="dc-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "RECRIANDO DEMO…" : "APAGAR E RECRIAR PRODUÇÃO DEMO"}
      </button>

      {error ? (
        <p className="rounded-[12px] border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-[12px] border border-success/25 bg-success-soft px-4 py-3 text-sm text-dc-text">
          <p className="font-semibold text-success">Demo recriada</p>
          <ul className="mt-2 grid gap-1 text-dc-text-secondary sm:grid-cols-2">
            <li>OPs apagadas: {result.cleared.orders}</li>
            <li>Lotes apagados: {result.cleared.lots}</li>
            <li>Etapas apagadas: {result.cleared.steps}</li>
            <li>OPs sincronizadas: {result.syncReceived}</li>
            <li>Lotes criados: {result.lotsCreated}</li>
          </ul>
          {result.lotCodes.length > 0 ? (
            <p className="mt-2 font-mono text-xs tabular-nums text-dc-text-secondary">
              {result.lotCodes.join(" · ")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-success/20 pt-3">
            <Link href="/app" className="dc-btn-primary h-10 px-3 text-sm">
              Ver Visão Geral →
            </Link>
            <Link
              href="/app/cockpit/production"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Produção
            </Link>
            <Link href="/app/floor" className="dc-btn-secondary h-10 px-3 text-sm">
              Chão
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
