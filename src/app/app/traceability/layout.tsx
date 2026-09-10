import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function TraceabilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CockpitShell>{children}</CockpitShell>;
}
