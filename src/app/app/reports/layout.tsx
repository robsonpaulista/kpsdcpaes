import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CockpitShell>{children}</CockpitShell>;
}
