import { CockpitShell } from "@/components/cockpit/CockpitShell";

export default function PcpLayout({ children }: { children: React.ReactNode }) {
  return <CockpitShell>{children}</CockpitShell>;
}
