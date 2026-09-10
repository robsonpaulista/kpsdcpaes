"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";

export type AuthStatus =
  | "loading"
  | "ready"
  | "signed_out"
  | "missing_config"
  | "error";

function isAnonymousUser(user: User): boolean {
  return user.isAnonymous;
}

/**
 * Sessão corporativa: exige usuário autenticado (não anônimo).
 * Operador no Floor (nome) continua conceito separado quando o tablet é compartilhado.
 */
export function useRequireAuth(): {
  status: AuthStatus;
  user: User | null;
  error: string | null;
} {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setStatus("missing_config");
      return;
    }

    try {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(
        auth,
        (next) => {
          if (!next || isAnonymousUser(next)) {
            setUser(null);
            setError(null);
            setStatus("signed_out");
            return;
          }
          setUser(next);
          setError(null);
          setStatus("ready");
        },
        (err) => {
          setUser(null);
          setError(err.message);
          setStatus("error");
        },
      );
      return () => unsub();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no Auth");
      setStatus("error");
    }
  }, []);

  return { status, user, error };
}
