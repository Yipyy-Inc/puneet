"use client";

import { DigitalWaiversManager } from "@/components/additional-features/DigitalWaiversManager";
import { PageHeader } from "@/components/ui/page-header";

export default function WaiversPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <PageHeader
          title="Digital Waivers"
          description="Manage liability waiver templates. Signed waivers are stored in each customer's file."
        />
      </div>

      <DigitalWaiversManager />
    </div>
  );
}
