"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraIntegrationSettings } from "@/components/camera-integration/CameraIntegrationSettings";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Live Pet Cam Settings"
        description="Configure your camera provider, credentials, and access rules."
      />

      <CameraIntegrationSettings />
    </div>
  );
}
