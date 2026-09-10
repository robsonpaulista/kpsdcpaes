import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CockpitShell>{children}</CockpitShell>;
}
