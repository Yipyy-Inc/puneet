"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { CustomServiceWizard } from "@/components/custom-services/wizard/CustomServiceWizard";
import type { CustomServiceModule, FacilityResource } from "@/types/facility";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { normalizeCustomServiceModule } from "@/data/custom-services";

/**
 * Facility-scoped custom module creation (super-admin Facility detail). The
 * facility is pre-filled from the route and NOT selectable
 * (`showFacilitySelector={false}`); on save/cancel the wizard returns to the
 * facility's Modules tab. This is the ONLY custom-module creation flow.
 *
 * ── IT SAVES INTO THAT FACILITY ───────────────────────────────────────────
 *
 * The page read the facility with `Number(params.id)` — NaN for every real
 * facility, whose ids are uuids — looked its name up in a fixture, and the
 * wizard saved into the ADMIN's browser. It saves through
 * /api/facilities/[id]/custom-services now, into the facility's own
 * `custom_services` setting, and offers that facility's resources.
 */
export default function FacilityCreateCustomModulePage() {
  const params = useParams<{ id: string }>();
  const facilityId = params.id;
  const backHref = `/dashboard/facilities/${facilityId}?tab=modules`;
  const base = `/api/facilities/${encodeURIComponent(facilityId)}`;
  const { t, fill } = useStaffText("customModuleCreate");

  const { data: facility } = useQuery({
    queryKey: ["admin", "facility", facilityId],
    queryFn: async (): Promise<{ name?: string } | null> => {
      const response = await fetch(base);
      return response.ok
        ? ((await response.json()) as { name?: string })
        : null;
    },
  });
  const { data: lists } = useQuery({
    queryKey: ["admin", "facility", facilityId, "custom-services"],
    queryFn: async (): Promise<{
      modules: CustomServiceModule[];
      resources: FacilityResource[];
    }> => {
      const response = await fetch(`${base}/custom-services`);
      if (!response.ok) return { modules: [], resources: [] };
      return (await response.json()) as {
        modules: CustomServiceModule[];
        resources: FacilityResource[];
      };
    },
  });

  async function saveModule(module: CustomServiceModule) {
    const response = await fetch(`${base}/custom-services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Normalized as the facility's own saves are, so `onlineBooking.enabled`
      // and the rest agree with the workflow answers the moment it is stored.
      body: JSON.stringify({ module: normalizeCustomServiceModule(module) }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        body?.error ?? fill("notSaved", { status: response.status }),
      );
    }
  }

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
            {fill("backToModules", {
              facility: facility?.name ?? t("facility"),
            })}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{t("newCustomModule")}</span>
        </div>
      </div>

      <CustomServiceWizard
        showFacilitySelector={false}
        redirectPath={backHref}
        saveModule={saveModule}
        resources={lists?.resources}
      />
    </div>
  );
}
