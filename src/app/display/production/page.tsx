"use client";

import { AuthGate } from "@/components/auth/AuthGate";
import { DisplayProductionClient } from "@/components/display/DisplayProductionClient";

export default function DisplayProductionPage() {
  return (
    <AuthGate label="DC Pães · Display">
      <DisplayProductionClient />
    </AuthGate>
  );
}
