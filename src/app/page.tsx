import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-dc-black text-dc-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-dc-orange/15 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 lg:px-10">
        <BrandMark href="/" tone="dark" size="lg" />

        <h1 className="mt-12 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          DC Pães
          <span className="mt-2 block text-2xl font-medium tracking-tight text-white/50 sm:text-3xl lg:text-4xl">
            Sistema operacional da fábrica
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
          Cockpit, chão de fábrica e display TV — do planejamento à
          rastreabilidade, com o ritmo da produção.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/app/cockpit" className="dc-btn-primary h-12 px-6">
            Central de produção
          </Link>
          <Link
            href="/app/floor"
            className="inline-flex h-12 items-center justify-center rounded-[14px] border border-white/15 bg-white/5 px-6 font-semibold text-white transition hover:bg-white/10"
          >
            Chão de fábrica
          </Link>
          <Link
            href="/display/production"
            className="inline-flex h-12 items-center justify-center rounded-[14px] border border-white/10 px-6 font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
          >
            Painel de exibição
          </Link>
        </div>

        <p className="mt-12 text-sm text-white/40">
          Já tem acesso?{" "}
          <Link href="/login" className="font-semibold text-dc-orange hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
