"use client";

import { LivePetCamGrid } from "@/components/additional-features/LivePetCamGrid";
import { PageHeader } from "@/components/ui/page-header";

export default function PetCamsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <PageHeader
        title="Live pet cameras"
        description="Monitor your facility with live camera feeds accessible to staff and customers"
      />

      <LivePetCamGrid />
    </div>
  );
}
