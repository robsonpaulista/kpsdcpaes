import type { MetadataRoute } from "next";

/**
 * PWA — Doc 11 §29.
 * Prioridade: Floor tablet (standalone). Não substitui estratégia offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KPS DC Pães",
    short_name: "KPS DC Pães",
    description:
      "Sistema operacional da fábrica DC Pães — Cockpit, Floor e Display.",
    start_url: "/app/floor",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f5f2",
    theme_color: "#563f30",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Chão de fábrica",
        short_name: "Floor",
        url: "/app/floor",
        description: "Estação operacional",
      },
      {
        name: "Cockpit",
        short_name: "Cockpit",
        url: "/app/cockpit",
        description: "Central de produção",
      },
      {
        name: "Display",
        short_name: "TV",
        url: "/display/production",
        description: "Painel de produção",
      },
    ],
  };
}
