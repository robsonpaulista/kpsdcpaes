"use client";

import Link from "next/link";

export function AccessDeniedNote({ action }: { action: string }) {
  return (
    <p className="rounded-xl bg-dc-surface-secondary px-3 py-2 text-xs text-dc-text-secondary">
      Sem permissão para {action} com o seu papel atual. Peça a um admin em{" "}
      <Link href="/app/settings/users" className="font-medium text-dc-orange">
        Configurações → Usuários
      </Link>
      .
    </p>
  );
}
