"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FacilityPicker } from "@/app/dashboard/commercial/credits/_components/facility-picker";
import {
  resolved,
  setFacilityModule,
  usePlatformFlags,
} from "@/lib/platform-flags-store";
import { ModuleToggleList } from "./module-toggle-list";
import {
  facilityEnabledLongIds,
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
    const baseEnabled = facilityEnabledLongIds(facilityId);
    return MODULE_CATALOG.map((m) => {
      const enabled = resolved(
        overrides.facilityModules,
        `${facilityId}:${m.id}`,
        baseEnabled.has(m.id),
      );
      const tierIncluded = defaults.has(m.id);
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
