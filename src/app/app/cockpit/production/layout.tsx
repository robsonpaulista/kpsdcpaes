import { ProductionSubnav } from "@/components/cockpit/ProductionSubnav";

export default function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <ProductionSubnav />
      {children}
    </div>
  );
}
