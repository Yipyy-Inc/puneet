"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { locationStyles } from "@/lib/hq/location-styles";
import { useFacilityLocations } from "@/lib/api/locations";
import { useStaffHomeLocations } from "@/lib/api/staff";
import { useLocationContext } from "@/hooks/use-location-context";

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: {
    label: "Open",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  inactive: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  coming_soon: {
    label: "Coming soon",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
};

// ============================================================================
// Network Status Bar — a row of compact chips, one per branch.
//
// Open/closed hours, occupancy, today's revenue and the incident-derived
// alert dot are gone, not converted: `FacilityLocation` (the real row) has no
// hours field, occupancy was dropped app-wide (no real per-location source),
// and the alert dot read a fixture incidents array hashed onto a location
// with no real relationship. Real staff-on-site now comes from
// `useStaffHomeLocations()`. Clicking a chip switches the shared location
// context for real -- it used to navigate only, because the ids it had were
// fixture ids that would not have matched anything.
// ============================================================================

export function NetworkStatusBar() {
  const router = useRouter();
  const { data: locations } = useFacilityLocations();
  const { data: staff } = useStaffHomeLocations();
  const { setLocation } = useLocationContext();

  const staffCountByLocation = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of staff ?? []) {
      if (!s.homeLocationId) continue;
      counts.set(s.homeLocationId, (counts.get(s.homeLocationId) ?? 0) + 1);
    }
    return counts;
  }, [staff]);

  function openLocation(id: string) {
    setLocation(id);
    router.push("/facility/dashboard");
  }

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {(locations ?? []).map((loc) => {
        const s = locationStyles(loc);
        const status = STATUS_META[loc.status] ?? STATUS_META.active;
        const staffIn = staffCountByLocation.get(loc.id) ?? 0;

        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => openLocation(loc.id)}
            aria-label={`Open ${loc.name} dashboard`}
            className="bg-card hover:border-primary/40 group flex min-w-52 shrink-0 flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white",
                    s.bg,
                  )}
                >
                  {(loc.shortCode ?? loc.name).slice(0, 3)}
                </span>
                <span className="truncate text-xs font-semibold">
                  {loc.name}
                </span>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                status.className,
              )}
            >
              {status.label}
            </span>

            <p className="text-muted-foreground text-[11px] tabular-nums">
              <span className="text-foreground font-medium">{staffIn}</span>{" "}
              staff based here
            </p>
          </button>
        );
      })}
    </div>
  );
}
