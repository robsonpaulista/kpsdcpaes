"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getFirebaseStatus,
  getPublicProjectId,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { getProductionOrderSourceKind } from "@/integrations/production-orders/production-order-source";
import { useFactoryRole } from "@/hooks/useFactoryRole";

type CheckTone = "ok" | "warn" | "block";

type Check = {
  id: string;
  title: string;
  detail: string;
  tone: CheckTone;
};

const QA_STORAGE_KEY = "dc_factory_qa_checklist_v2";
const QA_LEGACY_KEY = "dc_factory_qa_checklist_v1";

function toneClass(tone: CheckTone): string {
  if (tone === "ok") return "border-success/30 bg-success-soft text-success";
  if (tone === "block") return "border-danger/30 bg-danger-soft text-danger";
  return "border-dc-orange/30 bg-dc-orange/10 text-dc-orange";
}

function toneLabel(tone: CheckTone): string {
  if (tone === "ok") return "OK";
  if (tone === "block") return "Bloqueia";
  return "Ação";
}

function readQaProgress(): { done: number; total: number } | null {
  try {
    const raw =
      window.localStorage.getItem(QA_STORAGE_KEY) ??
      window.localStorage.getItem(QA_LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (!parsed || typeof parsed !== "object") return null;
    const ids = Object.keys(parsed);
    const done = ids.filter((id) => parsed[id]).length;
    // Roteiro atual: 12 golden (com passo 0) + 8 bordas = 20
    return { done, total: Math.max(20, ids.length) };
  } catch {
    return null;
  }
}

/**
 * Pré go-live — bloqueios reais antes do roteiro QA (Doc 11).
 * Não inventa status de rules remotas; aponta o que falta no ambiente.
 */
export function GoLivePreflight() {
  const { role, can, profileStatus, profileError } = useFactoryRole();
  const firebaseStatus = getFirebaseStatus();
  const projectId = getPublicProjectId();
  const sourceKind = getProductionOrderSourceKind();
  const [qaProgress, setQaProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    setQaProgress(readQaProgress());
    function onStorage() {
      setQaProgress(readQaProgress());
    }
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(onStorage, 4000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  const checks = useMemo((): Check[] => {
    const list: Check[] = [];

    list.push({
      id: "env",
      title: "Firebase client (.env.local)",
      detail:
        firebaseStatus === "ready"
          ? `Configurado · projeto ${projectId ?? "—"}`
          : firebaseStatus === "missing_config"
            ? "Falta preencher .env.local (veja docs/ENV-SETUP.md)"
            : "Erro ao inicializar o SDK",
      tone: firebaseStatus === "ready" ? "ok" : "block",
    });

    const profileTone: CheckTone = !isFirebaseConfigured()
      ? "block"
      : profileStatus === "ready"
        ? "ok"
        : profileStatus === "error"
          ? "block"
          : "warn";

    list.push({
      id: "auth-profile",
      title: "Sessão + factory_users",
      detail: !isFirebaseConfigured()
        ? "Configure o Firebase primeiro"
        : profileStatus === "ready"
          ? `Papel ${role} · syncIntegration=${can("syncIntegration") ? "sim" : "não"}`
          : profileStatus === "error"
            ? (profileError ??
              "Falha ao carregar perfil — rules podem estar desatualizadas")
            : profileStatus === "signed_out"
              ? "Faça login no Cockpit"
              : "Aguardando perfil…",
      tone: profileTone,
    });

    list.push({
      id: "rules-deploy",
      title: "Firestore rules publicadas",
      detail:
        "Se o sync de OPs já funcionou, as rules de integração estão ok. Projeto único: arquivo inteiro no Console.",
      tone: "ok",
    });

    list.push({
      id: "admin",
      title: "Admin WIP (dev)",
      detail:
        profileStatus === "ready" && role === "ADMIN"
          ? "Sessão ADMIN ativa"
          : "Garantir admin@dcpaes.dev: npm run ensure:admin (se ainda não logou).",
      tone: profileStatus === "ready" && role === "ADMIN" ? "ok" : "warn",
    });

    list.push({
      id: "source",
      title: "Fonte de OPs",
      detail:
        sourceKind === "mock"
          ? "Mock ativo — adequado para QA E2E local"
          : "ERP selecionado — só use com contrato real",
      tone: sourceKind === "mock" ? "ok" : "warn",
    });

    const qaDone = qaProgress?.done ?? 0;
    const qaTotal = qaProgress?.total ?? 20;
    list.push({
      id: "qa",
      title: "Roteiro QA E2E",
      detail:
        qaProgress == null
          ? "Ainda sem marcas neste navegador — abra Configurações → QA."
          : qaDone >= qaTotal
            ? `Checklist completo (${qaDone}/${qaTotal}) neste navegador`
            : `Progresso ${qaDone}/${qaTotal} neste navegador — continue o checklist`,
      tone:
        qaProgress != null && qaDone >= qaTotal
          ? "ok"
          : qaProgress != null && qaDone > 0
            ? "warn"
            : "warn",
    });

    return list;
  }, [
    can,
    firebaseStatus,
    profileError,
    profileStatus,
    projectId,
    qaProgress,
    role,
    sourceKind,
  ]);

  const blockers = checks.filter((c) => c.tone === "block").length;
  const actions = checks.filter((c) => c.tone === "warn").length;
  const qaAllDone =
    qaProgress != null && qaProgress.done >= qaProgress.total;

  return (
    <section className="dc-panel space-y-4 px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dc-eyebrow">Pré go-live</p>
          <h2 className="mt-1 text-sm font-semibold tracking-tight text-dc-text">
            Prontidão operacional
          </h2>
          <p className="mt-1 text-xs text-dc-text-secondary">
            {blockers > 0
              ? `${blockers} bloqueio(s) · ${actions} ação(ões) pendente(s)`
              : qaAllDone
                ? "Ambiente pronto · checklist QA completo neste navegador"
                : `${actions} ação(ões) ainda pendente(s) no ambiente`}
          </p>
        </div>
        <Link
          href="/app/settings/qa"
          className="dc-btn-secondary h-10 px-3 text-sm"
        >
          Abrir QA →
        </Link>
      </div>

      {qaAllDone && blockers === 0 ? (
        <div className="rounded-[12px] border border-success/30 bg-success-soft px-3.5 py-3 text-sm text-success">
          V1 validável neste ambiente. Próximo: backup do código / revisão com a
          operação (ERP e ficha oficial ficam fora desta V1).
        </div>
      ) : null}

      <ul className="space-y-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-dc-border/70 bg-dc-bg/40 px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-dc-text">{check.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-dc-text-secondary">
                {check.detail}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClass(check.tone)}`}
            >
              {toneLabel(check.tone)}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-[12px] border border-dashed border-dc-border bg-dc-surface-secondary/50 px-3.5 py-3 text-xs leading-relaxed text-dc-text-muted">
        <p className="font-semibold text-dc-text">Ordem segura</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Sync OK →{" "}
            <Link href="/app/pcp" className="font-medium text-dc-orange">
              PCP
            </Link>{" "}
            → abrir OP → Liberar para produção
          </li>
          <li>
            Semear equipamentos (se ainda não):{" "}
            <Link
              href="/app/settings/equipment"
              className="font-medium text-dc-orange"
            >
              cadastro
            </Link>
          </li>
          <li>
            <Link href="/app/floor" className="font-medium text-dc-orange">
              Floor
            </Link>{" "}
            (estação) → executar etapas do lote
          </li>
          <li>
            Conferir Display +{" "}
            <Link
              href="/app/traceability"
              className="font-medium text-dc-orange"
            >
              rastreabilidade
            </Link>{" "}
            · marcar em{" "}
            <Link href="/app/settings/qa" className="font-medium text-dc-orange">
              QA E2E
            </Link>
          </li>
        </ol>
      </div>
    </section>
  );
}
