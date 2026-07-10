"use client";

import { Crown, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import type { Location } from "@/types/location";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sharedStaffPool } from "@/data/hq-analytics";
import {
  locationDetailStore,
  useLocationPatch,
} from "@/data/location-detail-store";

function prettyRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Upcoming shifts scheduled for a staff member at this location.
function shiftsAtLocation(staffId: string, locationId: string): number {
  const member = sharedStaffPool.find((s) => s.staffId === staffId);
  if (!member) return 0;
  return member.upcomingShifts.filter((sh) => sh.locationId === locationId)
    .length;
}

interface Props {
  location: Location;
}

export function StaffTab({ location }: Props) {
  const patch = useLocationPatch(location.id);
  const staff = location.staffAssignments;

  const defaultManager =
    staff.find((a) => a.isPrimary && a.role === "manager") ??
    staff.find((a) => a.isPrimary);
  const managerId = patch.managerStaffId ?? defaultManager?.staffId;

  const totalCoverage = staff.reduce(
    (sum, a) => sum + shiftsAtLocation(a.staffId, location.id),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <p className="text-sm font-semibold">Schedule coverage</p>
          <p className="text-muted-foreground text-xs">
            Upcoming shifts assigned at this location
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
          <CalendarClock className="text-muted-foreground size-4" />
          {totalCoverage} shifts
        </span>
      </div>

      <div className="rounded-xl border">
        <p className="text-muted-foreground border-b px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
          Assigned staff ({staff.length})
        </p>
        <ul className="divide-y">
          {staff.map((a) => {
            const isManager = a.staffId === managerId;
            const shifts = shiftsAtLocation(a.staffId, location.id);
            return (
              <li
                key={a.staffId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {initials(a.staffName)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {a.staffName}
                      {isManager && (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                          <Crown className="size-3" />
                          Manager
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {prettyRole(a.role)} · {shifts} upcoming shift
                      {shifts === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isManager}
                  className={cn("h-7 text-xs", isManager && "opacity-50")}
                  onClick={() => {
                    locationDetailStore.setManager(location.id, a.staffId);
                    toast.success(`${a.staffName} set as location manager`);
                  }}
                >
                  {isManager ? "Current manager" : "Set as manager"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
