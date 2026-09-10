import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function EquipmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CockpitShell>{children}</CockpitShell>;
}
