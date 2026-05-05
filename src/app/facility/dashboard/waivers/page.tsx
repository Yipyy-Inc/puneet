"use client";

import { DigitalWaiversManager } from "@/components/additional-features/DigitalWaiversManager";

export default function WaiversPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Digital Waivers
          </h2>
          <p className="text-muted-foreground">
            Manage liability waiver templates. Signed waivers are stored in
            each customer&apos;s file.
          </p>
        </div>
      </div>

      <DigitalWaiversManager />
    </div>
  );
}
