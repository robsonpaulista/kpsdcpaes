"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";

/**
 * Gate corporativo: sem usuário autenticado → /login.
 * Não usa Auth anônimo.
 */
export function AuthGate({
  children,
  label = "KPS DC Pães",
}: {
  children: ReactNode;
  label?: string;
}) {
  const { status, error } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed_out") {
      const next = encodeURIComponent(pathname || "/app/cockpit");
      router.replace(`/login?next=${next}`);
    }
  }, [status, router, pathname]);

  if (status === "loading" || status === "signed_out") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dc-bg text-sm text-dc-text-secondary">
        {status === "signed_out" ? "Redirecionando para login…" : "Verificando acesso…"}
      </div>
    );
  }

  if (status === "missing_config") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-dc-bg px-6 text-center">
        <p className="text-sm font-semibold text-dc-text">{label}</p>
        <p className="text-sm text-dc-text-secondary">
          Firebase não configurado. Preencha o{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-dc-bg px-6 text-center">
        <p className="text-sm font-semibold text-dc-text">Falha na autenticação</p>
        <p className="max-w-md text-sm text-danger">{error}</p>
      </div>
    );
  }

  return children;
}
