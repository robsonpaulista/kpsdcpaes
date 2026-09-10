"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CockpitPageHeader } from "@/components/shared/CockpitUi";
import { QaCycleStrip } from "@/components/shared/QaCycleStrip";

const STORAGE_KEY = "dc_factory_qa_checklist_v2";
const LEGACY_STORAGE_KEY = "dc_factory_qa_checklist_v1";

type QaLink = {
  href: string;
  label: string;
};

type QaStep = {
  id: string;
  title: string;
  detail: string;
  links?: QaLink[];
};

type QaScenario = {
  id: string;
  title: string;
  detail: string;
  links?: QaLink[];
};

/** Roteiro ordenado — Doc 11 §31. */
const GOLDEN_PATH: QaStep[] = [
  {
    id: "golden-rules",
    title: "0. Publicar / mesclar Firestore rules",
    detail:
      "Projeto compartilhado: mescle o bloco FACTORY OS. Depois CONFIRM_FIRESTORE_DEPLOY=1 npm run deploy:firestore (ou Console). Sem isso, sync e Floor falham com permission-denied.",
    links: [
      { href: "/app/settings/integrations/dev", label: "Pré go-live →" },
    ],
  },
  {
    id: "golden-sync",
    title: "1. Sincronizar OPs",
    detail:
      "Integração (dev): garantir OP mock no PCP. Estado e última sync visíveis.",
    links: [{ href: "/app/settings/integrations/dev", label: "Integração →" }],
  },
  {
    id: "golden-pcp",
    title: "2. Conferir OP no PCP",
    detail:
      "OP aparece como PRONTA PARA PRODUÇÃO ou REQUER ATENÇÃO (mapping).",
    links: [{ href: "/app/pcp", label: "PCP →" }],
  },
  {
    id: "golden-map",
    title: "3. Mapear produto (se necessário)",
    detail:
      "Produto externo → catálogo factory. Sem mapping inventado — usar mock.",
    links: [{ href: "/app/products", label: "Produtos →" }],
  },
  {
    id: "golden-release",
    title: "4. Liberar OP → gerar lote",
    detail:
      "Liberar gera lote + snapshot de rota. Conferir QR/etiqueta no detalhe.",
    links: [
      { href: "/app/pcp", label: "PCP →" },
      { href: "/app/cockpit/production/lots", label: "Lotes →" },
    ],
  },
  {
    id: "golden-floor-prep",
    title: "5. Floor — prep (amasso → bandeja)",
    detail:
      "Configurar tablet (pesagem/amasso/modelagem/bandeja). QR ou código → iniciar → finalizar cada etapa.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "golden-floor-proof",
    title: "6. Floor — fermentação",
    detail: "Iniciar fermentação → timer → LIBERAR PARA FORNO.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "golden-floor-bake",
    title: "7. Floor — forno",
    detail: "Iniciar forno → finalizar → resfriamento auto-inicia.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "golden-floor-cool",
    title: "8. Floor — resfriamento",
    detail:
      "Aguardar mínimo → LIBERAR PARA EMBALAGEM. Botão bloqueado antes do tempo.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "golden-floor-pack",
    title: "9. Floor — embalagem",
    detail: "Finalizar embalagem. Lote vai para COMPLETED.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "golden-monitor",
    title: "10. Cockpit + Display",
    detail:
      "Lote some do ao vivo ou vai ao histórico. Display reflete filas e atenção.",
    links: [
      { href: "/app/cockpit/production", label: "Produção ao vivo →" },
      { href: "/display/production", label: "Display TV →" },
    ],
  },
  {
    id: "golden-trace",
    title: "11. Rastreabilidade completa",
    detail:
      "Timeline: OP, etapas, equipamentos, operadores, eventos. Painel Auditoria E2E verde.",
    links: [{ href: "/app/traceability", label: "Rastreabilidade →" }],
  },
];

/** Cenários de borda — Doc 11 §32. */
const EDGE_CASES: QaScenario[] = [
  {
    id: "qr-invalid-wrong",
    title: "QR inválido · QR na estação errada",
    detail:
      "No Floor: código inexistente e lote de outra etapa. Mensagens sem jargão técnico.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "concurrency",
    title: "Duplo clique · dois tablets no mesmo lote",
    detail:
      "INICIANDO/FINALIZANDO desabilitam o botão; segundo tablet vê ESTE LOTE JÁ FOI ATUALIZADO + ATUALIZAR.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "offline",
    title: "Internet cai / volta",
    detail:
      "Badge Sem conexão no Floor/Cockpit/Display; iniciar/finalizar bloqueados até reconectar.",
    links: [
      { href: "/app/floor", label: "Floor →" },
      { href: "/app/cockpit", label: "Cockpit →" },
    ],
  },
  {
    id: "equipment-late",
    title: "Equipamento indisponível · etapa atrasada",
    detail:
      "Parar equipamento; fila do Floor sem recurso parado. Atraso no Display/Cockpit.",
    links: [
      { href: "/app/equipment", label: "Equipamentos →" },
      { href: "/display/production", label: "Display →" },
    ],
  },
  {
    id: "occurrence-loss",
    title: "Ocorrência · perda",
    detail:
      "Finalizar com perda + motivo; fila em Qualidade/Perdas; ocorrência no Floor e no módulo.",
    links: [
      { href: "/app/quality/losses", label: "Perdas →" },
      { href: "/app/quality/incidents", label: "Ocorrências →" },
    ],
  },
  {
    id: "cooling-gate",
    title: "Resfriamento ainda bloqueado",
    detail:
      "Após forno, resfriamento auto-inicia; FINALIZAR bloqueado até o mínimo.",
    links: [{ href: "/app/floor", label: "Floor →" }],
  },
  {
    id: "integration-edge",
    title: "OP alterada · produto sem mapping · API indisponível",
    detail:
      "Mock: OP sem mapping bloqueia liberação; sync e estado em Integração.",
    links: [{ href: "/app/settings/integrations/dev", label: "Integração →" }],
  },
  {
    id: "permissions",
    title: "Papéis e Firestore rules",
    detail:
      "Viewer só lê; Operador executa chão; PCP libera; Qualidade gerencia ocorrências. Testar permission-denied.",
    links: [
      { href: "/app/settings/roles", label: "Papéis →" },
      { href: "/app/settings/users", label: "Usuários →" },
    ],
  },
];

const ALL_IDS = [
  ...GOLDEN_PATH.map((s) => s.id),
  ...EDGE_CASES.map((s) => s.id),
];

function loadChecked(): Record<string, boolean> {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function QaLinks({ links }: { links?: QaLink[] }) {
  if (!links?.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-xs font-semibold text-dc-orange transition hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function CheckButton({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border text-xs font-bold transition ${
        on
          ? "border-success bg-success text-white shadow-sm"
          : "border-dc-border bg-dc-bg text-transparent hover:border-dc-orange/50"
      }`}
      aria-pressed={on}
      aria-label={label}
    >
      ✓
    </button>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-dc-surface-secondary">
      <div
        className="h-full rounded-full bg-dc-orange transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function QaChecklistClient() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChecked(loadChecked());
    setReady(true);
  }, []);

  const persist = useCallback((next: Record<string, boolean>) => {
    setChecked(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const goldenDone = useMemo(
    () => GOLDEN_PATH.filter((s) => checked[s.id]).length,
    [checked],
  );
  const edgeDone = useMemo(
    () => EDGE_CASES.filter((s) => checked[s.id]).length,
    [checked],
  );
  const totalDone = goldenDone + edgeDone;
  const totalItems = ALL_IDS.length;
  const goldenComplete = goldenDone === GOLDEN_PATH.length;
  const edgeComplete = edgeDone === EDGE_CASES.length;
  const allComplete = totalDone === totalItems;
  const nextGolden = GOLDEN_PATH.find((s) => !checked[s.id]) ?? null;
  const nextEdge = EDGE_CASES.find((s) => !checked[s.id]) ?? null;

  function toggle(id: string) {
    persist({ ...checked, [id]: !checked[id] });
  }

  function resetAll() {
    persist({});
  }

  function markGoldenPath() {
    const next = { ...checked };
    for (const step of GOLDEN_PATH) next[step.id] = true;
    persist(next);
  }

  function markEdgeCases() {
    const next = { ...checked };
    for (const step of EDGE_CASES) next[step.id] = true;
    persist(next);
  }

  if (!ready) {
    return (
      <p className="text-sm text-dc-text-secondary">Carregando checklist…</p>
    );
  }

  return (
    <div className="space-y-8">
      <CockpitPageHeader
        eyebrow="Operação"
        title="QA · Cenários MVP"
        description="Roteiro E2E + casos de borda (Doc 11 §31–32). Marque após validar — progresso fica neste navegador."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/settings" className="dc-btn-secondary h-10 px-3 text-sm">
              ← Configurações
            </Link>
            <button
              type="button"
              onClick={markGoldenPath}
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Marcar roteiro
            </button>
            <button
              type="button"
              onClick={markEdgeCases}
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Marcar bordas
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Limpar
            </button>
          </div>
        }
      />

      <QaCycleStrip note="Use os atalhos abaixo enquanto marca cada passo validado." />

      {allComplete ? (
        <div className="dc-panel border-success/35 bg-success-soft/50 px-5 py-5">
          <p className="dc-eyebrow text-success">V1 validável</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-dc-text">
            Checklist completo neste navegador
          </h2>
          <p className="mt-1.5 text-sm text-dc-text-secondary">
            Roteiro E2E e casos de borda marcados. Código V1 está pronto para
            revisão operacional — ainda não é go-live de fábrica (ERP, turno e
            ficha oficial ficam depois).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/cockpit" className="dc-btn-primary h-10 px-3 text-sm">
              Central →
            </Link>
            <Link
              href="/app/settings/integrations/dev"
              className="dc-btn-secondary h-10 px-3 text-sm"
            >
              Pré go-live →
            </Link>
          </div>
        </div>
      ) : goldenComplete ? (
        <div className="dc-panel border-success/30 bg-success-soft/40 px-5 py-4">
          <p className="text-sm font-semibold text-success">
            Roteiro E2E concluído
          </p>
          <p className="mt-1 text-sm text-dc-text-secondary">
            Faltam {EDGE_CASES.length - edgeDone} caso(s) de borda antes do
            go-live (Doc 11 §32).
            {nextEdge ? (
              <>
                {" "}
                Próximo: <strong className="text-dc-text">{nextEdge.title}</strong>
              </>
            ) : null}
          </p>
        </div>
      ) : nextGolden ? (
        <div className="dc-panel border-dc-orange/25 bg-dc-orange/[0.04] px-5 py-4">
          <p className="text-sm font-semibold text-dc-text">Próximo passo</p>
          <p className="mt-1 text-sm text-dc-text-secondary">
            <strong className="text-dc-text">
              {nextGolden.title.replace(/^\d+\.\s*/, "")}
            </strong>
            {" — "}
            {nextGolden.detail}
          </p>
          <QaLinks links={nextGolden.links} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Total</p>
          <p className="dc-metric mt-2 text-dc-text">
            {totalDone}
            <span className="text-lg font-semibold text-dc-text-muted">
              /{totalItems}
            </span>
          </p>
          <div className="mt-3">
            <ProgressBar value={totalDone} max={totalItems} />
          </div>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Roteiro E2E</p>
          <p className="dc-metric mt-2 text-dc-text">
            {goldenDone}
            <span className="text-lg font-semibold text-dc-text-muted">
              /{GOLDEN_PATH.length}
            </span>
          </p>
          <div className="mt-3">
            <ProgressBar value={goldenDone} max={GOLDEN_PATH.length} />
          </div>
        </div>
        <div className="dc-panel px-4 py-4">
          <p className="dc-eyebrow">Casos de borda</p>
          <p className="dc-metric mt-2 text-dc-text">
            {edgeDone}
            <span className="text-lg font-semibold text-dc-text-muted">
              /{EDGE_CASES.length}
            </span>
          </p>
          <div className="mt-3">
            <ProgressBar value={edgeDone} max={EDGE_CASES.length} />
          </div>
        </div>
      </div>

      <section className="dc-panel border-dc-orange/25 bg-dc-orange/[0.04] px-5 py-4">
        <p className="text-sm font-semibold tracking-tight text-dc-text">
          Fluxo de referência (Doc 11 §31)
        </p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-dc-text-secondary">
          OP importada → lote liberado → QR → batida → timer → finalização →
          modelagem → perda → fermentação → forno → resfriamento → embalagem →
          rastreabilidade completa
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <p className="dc-eyebrow">Roteiro</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-dc-text">
            Fluxo normal E2E
          </h2>
          <p className="mt-0.5 text-xs text-dc-text-secondary">
            Siga em ordem. Cada passo abre as telas certas.
          </p>
        </div>
        <ol className="space-y-2">
          {GOLDEN_PATH.map((step, index) => {
            const on = Boolean(checked[step.id]);
            return (
              <li
                key={step.id}
                className={`dc-panel px-4 py-4 transition ${
                  on ? "border-success/35 bg-success-soft/35" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckButton
                    on={on}
                    onToggle={() => toggle(step.id)}
                    label={
                      on
                        ? "Desmarcar passo do roteiro"
                        : "Marcar passo como validado"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight text-dc-text">
                      <span className="mr-2 tabular-nums text-dc-text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {step.title.replace(/^\d+\.\s*/, "")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-dc-text-secondary">
                      {step.detail}
                    </p>
                    <QaLinks links={step.links} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3">
        <div>
          <p className="dc-eyebrow">Bordas</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-dc-text">
            Casos de borda
          </h2>
          <p className="mt-0.5 text-xs text-dc-text-secondary">
            Obrigatórios antes do go-live (Doc 11 §32).
          </p>
        </div>
        <ul className="space-y-2">
          {EDGE_CASES.map((item) => {
            const on = Boolean(checked[item.id]);
            return (
              <li
                key={item.id}
                className={`dc-panel px-4 py-4 transition ${
                  on ? "border-success/35 bg-success-soft/35" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckButton
                    on={on}
                    onToggle={() => toggle(item.id)}
                    label={
                      on ? "Desmarcar cenário" : "Marcar cenário como validado"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight text-dc-text">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-dc-text-secondary">
                      {item.detail}
                    </p>
                    <QaLinks links={item.links} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
