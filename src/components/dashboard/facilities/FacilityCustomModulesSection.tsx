"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Puzzle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomServiceModuleCard } from "@/components/custom-services/CustomServiceModuleCard";
import { CustomModuleDetailDrawer } from "@/components/custom-services/CustomModuleDetailDrawer";
import { useCustomServices } from "@/hooks/use-custom-services";
import type { CustomServiceModule } from "@/types/facility";

/**
 * Facility-scoped custom modules (super-admin Facility detail → Modules tab).
 * The ONLY place a custom module can be created — the "+ Add Custom Module"
 * button launches the 12-step wizard with THIS facility pre-filled (not
 * selectable). Existing modules render read-only; "View" opens a detail drawer.
 * Once published they also surface (read-only) in the global Custom Module
 * Registry.
 */
export function FacilityCustomModulesSection({
  facilityId,
  facilityName,
}: {
  facilityId: number;
  facilityName: string;
}) {
  const { modules } = useCustomServices();
  const [viewModule, setViewModule] = useState<CustomServiceModule | null>(
    null,
  );

  const facilityModules = useMemo(
    () =>
      modules.filter((m) =>
        (m.facilityIds?.length ? m.facilityIds : [m.facilityId]).includes(
          facilityId,
        ),
      ),
    [modules, facilityId],
  );

  const createHref = `/dashboard/facilities/${facilityId}/custom-modules/create`;

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Puzzle className="size-5" />
          Custom Modules
        </CardTitle>
        <Button
          asChild
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Link href={createHref}>
            <Plus className="mr-1.5 size-4" />
            Add Custom Module
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {facilityModules.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {facilityModules.map((mod) => (
              <CustomServiceModuleCard
                key={mod.id}
                module={mod}
                onView={setViewModule}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed py-8 text-center">
            <Puzzle className="text-muted-foreground mx-auto mb-3 size-10" />
            <p className="text-muted-foreground text-sm">
              No custom modules for {facilityName} yet.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={createHref}>
                <Plus className="mr-1.5 size-4" />
                Add Custom Module
              </Link>
            </Button>
          </div>
        )}
      </CardContent>

      <CustomModuleDetailDrawer
        module={viewModule}
        open={!!viewModule}
        onOpenChange={(o) => !o && setViewModule(null)}
      />
    </Card>
  );
}
