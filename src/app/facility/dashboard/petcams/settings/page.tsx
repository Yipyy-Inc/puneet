"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraIntegrationSettings } from "@/components/camera-integration/CameraIntegrationSettings";

export default function PetCamSettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/facility/dashboard/petcams">
            <ChevronLeft className="mr-1 size-4" />
            Back to Live Pet Cams
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Live Pet Cam Settings</h2>
        <p className="text-muted-foreground">
          Configure your camera provider, credentials, and access rules.
        </p>
      </div>

      <CameraIntegrationSettings />
    </div>
  );
}
