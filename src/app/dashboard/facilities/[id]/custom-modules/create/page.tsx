"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CustomServiceWizard } from "@/components/custom-services/wizard/CustomServiceWizard";
import { facilities } from "@/data/facilities";

/**
 * Facility-scoped custom module creation (super-admin Facility detail). The
 * facility is pre-filled from the route and NOT selectable
 * (`showFacilitySelector={false}`); on save/cancel the wizard returns to the
 * facility's Modules tab. This is the ONLY custom-module creation flow.
 */
export default function FacilityCreateCustomModulePage() {
  const params = useParams<{ id: string }>();
  const facilityId = Number(params.id);
  const facility = facilities.find((f) => f.id === facilityId);
  const backHref = `/dashboard/facilities/${facilityId}?tab=modules`;

  return (
    <div>
      {/* Breadcrumb header */}
      <div className="border-border bg-card border-b px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2 text-sm">
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="size-4" />
            {facility?.name ?? `Facility #${facilityId}`} · Modules
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">New Custom Module</span>
        </div>
      </div>

      <CustomServiceWizard
        facilityId={facilityId}
        showFacilitySelector={false}
        redirectPath={backHref}
      />
    </div>
  );
}
