"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  getFirebaseStatus,
  getPublicProjectId,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { getProductionOrderSourceKind } from "@/integrations/production-orders/production-order-source";
import { getMockExternalOrders } from "@/integrations/production-orders/fixtures/mock-orders";
import { SyncOrdersButton } from "@/components/admin/SyncOrdersButton";
import { ResetDemoProductionButton } from "@/components/admin/ResetDemoProductionButton";
import { GoLivePreflight } from "@/components/admin/GoLivePreflight";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "muted";
  children: ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "border-success/30 bg-success-soft text-success"
      : tone === "warn"
        ? "border-danger/30 bg-danger-soft text-danger"
        : "border-dc-border bg-dc-surface-secondary text-dc-text-secondary";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}

function externalStatusLabel(status: string): string {
  if (status === "RELEASED") return "LIBERADA";
  if (status === "IN_PROGRESS") return "EM PRODUÇÃO";
  if (status === "COMPLETED") return "CONCLUÍDA";
  if (status === "CANCELLED") return "CANCELADA";
  return status;
}

export function DevIntegrationsClient() {
  const firebaseStatus = getFirebaseStatus();
  const projectId = getPublicProjectId();
  const sourceKind = getProductionOrderSourceKind();
  const firebaseReady = firebaseStatus === "ready" && isFirebaseConfigured();
  const mockOrders = getMockExternalOrders();

  return (
    <div className="space-y-6">
      <CockpitPageHeader
        eyebrow="Operação"
        title="Integração · Desenvolvimento"
        description="Área administrativa temporária. Não aparece no chão de fábrica."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <Link
              href="/app/settings/qa"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              QA cenários →
            </Link>
          </div>
        }
      />

      <GoLivePreflight />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Firebase</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill tone={firebaseReady ? "ok" : "warn"}>
              {firebaseStatus === "ready" && "Configurado"}
              {firebaseStatus === "missing_config" && "Sem .env"}
              {firebaseStatus === "init_error" && "Erro init"}
            </StatusPill>
          </div>
          <p className="mt-3 text-xs text-dc-text-secondary">
            Project ID{" "}
            <span className="font-medium tabular-nums text-dc-text">
              {projectId ?? "—"}
            </span>
          </p>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Fonte de OPs</p>
          <p className="mt-3 text-base font-semibold tracking-tight text-dc-text">
            {sourceKind === "mock" ? "Simulação (mock)" : "ERP"}
          </p>
          <p className="mt-1 text-xs text-dc-text-secondary">
            {sourceKind === "mock"
              ? "Fixtures locais para desenvolvimento."
              : "Ainda não disponível nesta V1."}
          </p>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Ordens mock</p>
          <p className="dc-metric mt-2 text-dc-text">
            {mockOrders.length}
          </p>
          <p className="mt-1 text-xs text-dc-text-secondary">
            Exemplos na fonte atual
          </p>
        </div>
      </div>

      {firebaseStatus === "missing_config" ? (
        <div className="dc-panel border-dashed px-4 py-4">
          <p className="text-sm font-semibold text-dc-text">
            Falta configurar o Firebase
          </p>
          <p className="mt-1 text-sm text-dc-text-secondary">
            Veja <code className="text-xs">docs/ENV-SETUP.md</code> e o{" "}
            <code className="text-xs">.env.local</code>.
          </p>
        </div>
      ) : null}

      <section className="dc-panel overflow-hidden">
        <div className="border-b border-dc-border/80 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-tight text-dc-text">
            Ordens de exemplo
          </h2>
          <p className="mt-0.5 text-xs text-dc-text-secondary">
            Snapshot da fonte mock — não inventa status de negócio.
          </p>
        </div>
        <ul className="divide-y divide-dc-border/70">
          {mockOrders.map((op) => (
            <li
              key={op.externalId}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-dc-text">
                  {op.externalOrderNumber}
                </p>
                <p className="mt-0.5 truncate text-xs text-dc-text-secondary">
                  {op.externalProductName}
                </p>
              </div>
              <StatusPill tone="muted">
                {externalStatusLabel(op.externalStatus)}
              </StatusPill>
            </li>
          ))}
        </ul>
      </section>

      <section className="dc-panel border-dashed px-5 py-5">
        <h2 className="text-sm font-semibold tracking-tight text-dc-text">
          Reset produção demo (DC Pães)
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-dc-text-secondary">
          Apaga OPs, lotes, etapas e eventos antigos; sincroniza o catálogo com
          fotos reais e cria lotes já em etapas do fluxo (amassamento,
          fermentação, forno, embalagem…).
        </p>
        <div className="mt-4">
          <ResetDemoProductionButton />
        </div>
      </section>

      <section className="dc-panel border-dashed px-5 py-5">
        <h2 className="text-sm font-semibold tracking-tight text-dc-text">
          Sincronizar OPs
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-dc-text-secondary">
          Idempotente (<code className="text-xs">sourceSystem + externalId</code>
          ). Grava em{" "}
          <code className="text-xs">factory_production_orders</code>.
        </p>
        <div className="mt-4">
          <SyncOrdersButton />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-dc-text-muted">
          Se falhar com permission-denied: publique{" "}
          <code>firestore.rules</code> no Console (projeto único: cole o arquivo
          inteiro) ou{" "}
          <code>CONFIRM_FIRESTORE_DEPLOY=1 npm run deploy:firestore</code>.
        </p>
      </section>

      <section className="dc-panel-muted px-5 py-5">
        <h2 className="text-sm font-semibold tracking-tight text-dc-text">
          Security Rules (V1 + papéis)
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dc-text-secondary">
          <code className="text-xs">firestore.rules</code>: Auth corporativo,
          rejeita anônimo, lê papel em{" "}
          <code className="text-xs">factory_users</code>. Escrita por coleção
          (chão, liberação, qualidade, catálogo, sync). Viewer só lê; Admin
          gerencia papéis e coleções novas.
        </p>
        <p className="mt-3">
          <Link
            href="/app/settings/roles"
            className="text-sm font-medium text-dc-orange"
          >
            Ver matriz de papéis →
          </Link>
        </p>
      </section>
    </div>
  );
}
