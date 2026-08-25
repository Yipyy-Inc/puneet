"use client";

import { ArrowRight, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FacilityLocation } from "@/types/location";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { locationStyles } from "@/lib/hq/location-styles";
import type { StaffHomeLocationSummary } from "@/lib/api/staff";
import { useLocationContext } from "@/hooks/use-location-context";
import { useRouter } from "next/navigation";

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

interface Props {
  location: FacilityLocation;
  /** The whole roster, filtered to this branch here rather than by the
   *  parent -- there's only ever a handful of locations, so N small filters
   *  beat threading a pre-grouped map through. */
  staff: StaffHomeLocationSummary[];
  /** This branch's revenue in whatever window the page's KPI tiles are
   *  currently showing -- passed down so the grid shares ONE report fetch
   *  rather than each card making its own. */
  revenue: number | undefined;
  bookings: number | undefined;
}

// ============================================================================
// Operational location card for the HQ Command Center grid.
//
// Occupancy, the alerts banner and "Next up" booking chips are gone, not
// converted: none has a real per-location source (occupancy was dropped
// app-wide; alerts and upcoming-bookings both read the fixture incidents/
// bookings arrays through `deriveLocationId`, a hash with no real
// relationship to a location). Staff-on-site now shows real names.
// ============================================================================

export function LocationCard({ location, staff, revenue, bookings }: Props) {
  const router = useRouter();
  const { setLocation } = useLocationContext();
  const s = locationStyles(location);
  const status = STATUS_META[location.status] ?? STATUS_META.active;
  const onSite = staff.filter((m) => m.homeLocationId === location.id);

  function openDashboard() {
    setLocation(location.id);
    router.push("/facility/dashboard");
  }

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <div className={cn("h-0.5", s.bg)} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white",
                s.bg,
              )}
            >
              {(location.shortCode ?? location.name).slice(0, 3)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{location.name}</p>
              <p className="text-muted-foreground truncate text-[11px]">
                {location.address?.city ?? "No address yet"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={cn("rounded-lg px-2.5 py-1.5", s.bgSofter)}>
            <p className="text-muted-foreground text-[10px]">Revenue</p>
            <p className="text-sm font-bold tabular-nums">
              ${(revenue ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg px-2.5 py-1.5">
            <p className="text-muted-foreground text-[10px]">Bookings</p>
            <p className="text-sm font-bold tabular-nums">
              {(bookings ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted/50 flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
            >
              <Users className={cn("size-3.5", s.text)} />
              {onSite.length} staff based here
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-wider uppercase">
              Based at {location.shortCode ?? location.name}
            </p>
            {onSite.length === 0 ? (
              <p className="text-muted-foreground px-1 py-1 text-xs italic">
                Nobody&apos;s home branch is set to this one yet.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {onSite.map((m) => (
                  <li
                    key={m.staffId}
                    className="truncate rounded-md px-1 py-1 text-xs font-medium"
                  >
                    {m.name}
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={openDashboard}
          className="mt-auto w-full gap-1.5 text-xs"
        >
          View Location
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
