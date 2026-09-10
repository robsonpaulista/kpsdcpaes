import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CockpitShell>{children}</CockpitShell>;
}
