import { CockpitShell } from "@/components/cockpit/CockpitShell";
import { QualitySubnav } from "@/components/quality/QualitySubnav";

export default function QualityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CockpitShell>
      <div className="space-y-5">
        <QualitySubnav />
        {children}
      </div>
    </CockpitShell>
  );
}
