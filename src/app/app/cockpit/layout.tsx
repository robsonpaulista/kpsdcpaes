import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function CockpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CockpitShell>{children}</CockpitShell>;
}
