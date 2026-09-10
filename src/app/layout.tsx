import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/tokens.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DC Pães · Factory OS",
    template: "%s · DC Pães",
  },
  description: "Sistema operacional da fábrica DC Pães",
  applicationName: "DC Factory OS",
  appleWebApp: {
    capable: true,
    title: "DC Floor",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e85d04" },
    { media: "(prefers-color-scheme: dark)", color: "#e85d04" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
