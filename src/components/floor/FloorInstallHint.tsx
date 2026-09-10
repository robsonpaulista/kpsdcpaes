"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Sugestão de instalação PWA no Floor (tablet).
 * Só aparece se o browser disparar beforeinstallprompt.
 */
export function FloorInstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("dc_factory_pwa_dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem("dc_factory_pwa_dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dc-orange/30 bg-dc-orange/5 px-3 py-2.5 text-sm">
      <p className="text-dc-text">
        Instalar no tablet — atalho na Home, tela cheia.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-lg bg-dc-orange px-3 py-1.5 text-xs font-semibold text-white"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-medium text-dc-text-secondary"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
