"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FacilityPicker } from "@/app/dashboard/commercial/credits/_components/facility-picker";
import {
  resetFacilityModules,
  resolved,
  setFacilityModule,
  usePlatformFlags,
} from "@/lib/platform-flags-store";
import { ModuleToggleList } from "./module-toggle-list";
import {
  facilityTierType,
  MODULE_CATALOG,
  type ModuleToggleItem,
  TIER_BADGE,
  tierDefaultModuleIds,
  tierName,
  TOTAL_MODULES,
} from "./flags-utils";

export function PerFacilityTab() {
  const overrides = usePlatformFlags();
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [facilityName, setFacilityName] = useState("");

  const items: ModuleToggleItem[] = useMemo(() => {
    if (facilityId === null) return [];
    const defaults = tierDefaultModuleIds(facilityTierType(facilityId));
    return MODULE_CATALOG.map((m) => {
      // Baseline is the facility's TIER DEFAULT; a per-facility override in the
      // store flips it. So "override" == the effective state deviates from the
      // tier default (and "Reset to Tier Defaults" clears exactly those).
      const tierIncluded = defaults.has(m.id);
      const enabled = resolved(
        overrides.facilityModules,
        `${facilityId}:${m.id}`,
        tierIncluded,
      );
      return {
        moduleId: m.id,
        name: m.name,
        category: m.category,
        enabled,
        tierIncluded,
        override: enabled !== tierIncluded,
      };
    });
  }, [facilityId, overrides]);

  const enabledCount = items.filter((i) => i.enabled).length;
  const overrideCount = items.filter((i) => i.override).length;
  const tierType = facilityId !== null ? facilityTierType(facilityId) : null;

  return (
    <div className="space-y-4">
      <div className="max-w-md space-y-1.5">
        <Label>Facility</Label>
        <FacilityPicker
          value={facilityId}
          onChange={(id, name) => {
            setFacilityId(id);
            setFacilityName(name);
          }}
        />
      </div>

      {facilityId === null ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Search and select a facility to view and override its modules.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{facilityName}</h3>
            {tierType && (
              <Badge variant="outline" className={cn(TIER_BADGE[tierType])}>
                {tierName(tierType)}
              </Badge>
            )}
            <Badge variant="secondary" className="tabular-nums">
              {enabledCount}/{TOTAL_MODULES} enabled
            </Badge>
            {overrideCount > 0 && (
              <Badge className="bg-violet-600 text-white tabular-nums hover:bg-violet-600">
                {overrideCount} override{overrideCount === 1 ? "" : "s"}
              </Badge>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={overrideCount === 0}
                  className="ml-auto"
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Reset to Tier Defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to tier defaults?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears {overrideCount} override
                    {overrideCount === 1 ? "" : "s"} for{" "}
                    <span className="font-medium">{facilityName}</span> and
                    restores its {tierType ? tierName(tierType) : ""} plan
                    defaults. Other facilities on the same plan are unaffected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() => {
                      resetFacilityModules(facilityId, facilityName);
                      toast.success(`Overrides reset for ${facilityName}`);
                    }}
                  >
                    Reset {overrideCount} override
                    {overrideCount === 1 ? "" : "s"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <ModuleToggleList
            items={items}
            onToggle={(moduleId, enabled) => {
              const mod = MODULE_CATALOG.find((m) => m.id === moduleId);
              const name = mod?.name ?? "Module";
              setFacilityModule(
                facilityId,
                moduleId,
                enabled,
                `${name} · ${facilityName}`,
              );
              toast.success(
                `${name} ${enabled ? "enabled" : "disabled"} for ${facilityName}`,
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
