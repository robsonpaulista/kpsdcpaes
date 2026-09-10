import { Suspense } from "react";
import { LoginClient } from "@/components/auth/LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dc-bg text-sm text-dc-text-secondary">
          Carregando…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
