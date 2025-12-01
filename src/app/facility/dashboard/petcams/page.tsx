"use client";

import { LivePetCamGrid } from "@/components/additional-features/LivePetCamGrid";

export default function PetCamsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Pet Cameras</h2>
          <p className="text-muted-foreground">
            Monitor your facility with live camera feeds accessible to staff and customers
          </p>
        </div>
      </div>

      <LivePetCamGrid />
    </div>
  );
}

