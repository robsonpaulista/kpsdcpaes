"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { TEMP_ADMIN } from "@/domain/access/temp-admin";
import { ensureTempAdminSession } from "@/lib/auth/temp-admin";
import {
  getFirebaseAuth,
  getFirebaseStatus,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { BrandMark } from "@/components/shared/BrandMark";

const SHOW_TEMP_ADMIN_HINTS = process.env.NODE_ENV === "development";

/**
 * Login corporativo — superfície industrial (Doc 03).
 */
export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const raw = searchParams.get("next") || "/app/cockpit";
    return raw.startsWith("/") ? raw : "/app/cockpit";
  }, [searchParams]);

  const [email, setEmail] = useState(
    SHOW_TEMP_ADMIN_HINTS ? TEMP_ADMIN.email : "",
  );
  const [password, setPassword] = useState(
    SHOW_TEMP_ADMIN_HINTS ? TEMP_ADMIN.password : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = getFirebaseStatus();

  function mapAuthError(err: unknown): string {
    const message = err instanceof Error ? err.message : "Falha ao entrar";
    if (message.includes("invalid-credential") || message.includes("wrong-password")) {
      return "E-mail ou senha inválidos.";
    }
    if (message.includes("user-not-found")) {
      return "Usuário não encontrado.";
    }
    if (message.includes("too-many-requests")) {
      return "Muitas tentativas. Aguarde e tente de novo.";
    }
    if (message.includes("operation-not-allowed")) {
      return "Ative E-mail/senha no Firebase Console → Authentication.";
    }
    return message;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isFirebaseConfigured()) {
      setError("Firebase não configurado (.env.local).");
      return;
    }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser?.isAnonymous) {
        await signOut(auth);
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(nextPath);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleTempAdmin() {
    setError(null);
    if (!isFirebaseConfigured()) {
      setError("Firebase não configurado (.env.local).");
      return;
    }
    setBusy(true);
    setEmail(TEMP_ADMIN.email);
    setPassword(TEMP_ADMIN.password);
    try {
      await ensureTempAdminSession(getFirebaseAuth());
      router.replace(nextPath);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-dc-black text-dc-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 h-[420px] w-[420px] rounded-full bg-dc-orange/20 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-between gap-12 px-6 py-10 lg:flex-row lg:items-center lg:px-12 lg:py-16">
        <div className="max-w-lg">
          <BrandMark href="/" tone="dark" size="lg" />
          <h1 className="mt-10 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
            Sistema operacional
            <span className="block text-white/55"> da fábrica</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/55 lg:text-lg">
            Planejar, executar e rastrear — do PCP ao chão, com precisão
            industrial.
          </p>
        </div>

        <div className="w-full max-w-md rounded-[20px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md lg:p-8">
          <p className="dc-eyebrow text-white/40">Acesso corporativo</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Entrar
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Somente usuários autenticados no Firebase Auth.
          </p>

          {status === "missing_config" ? (
            <p className="mt-6 text-sm text-danger">
              Configure o <code className="text-white/80">.env.local</code> antes
              de autenticar.
            </p>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => void handleSubmit(e)}
            >
              <label className="block text-xs font-medium text-white/45">
                E-mail
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 h-12 w-full rounded-[12px] border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-dc-orange"
                />
              </label>
              <label className="block text-xs font-medium text-white/45">
                Senha
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 h-12 w-full rounded-[12px] border border-white/15 bg-black/30 px-3 text-sm text-white outline-none focus:border-dc-orange"
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="dc-btn-primary h-12 w-full disabled:opacity-50"
              >
                {busy ? "ENTRANDO…" : "ENTRAR"}
              </button>
              {SHOW_TEMP_ADMIN_HINTS ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleTempAdmin()}
                  className="flex h-11 w-full items-center justify-center rounded-[12px] border border-white/15 text-sm font-semibold text-white/80 transition hover:bg-white/5 disabled:opacity-50"
                >
                  {busy ? "…" : "Criar / entrar como admin (temporário)"}
                </button>
              ) : null}
            </form>
          )}

          {SHOW_TEMP_ADMIN_HINTS ? (
            <div className="mt-5 rounded-[12px] border border-dashed border-white/15 bg-black/20 px-3 py-2.5 text-[11px] text-white/45">
              <p className="font-semibold text-white/70">{TEMP_ADMIN.label}</p>
              <p className="mt-1 tabular-nums">
                {TEMP_ADMIN.email} · {TEMP_ADMIN.password}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
