"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { staffQueries, useStaffHomeLocations } from "@/lib/api/staff";
import { useFacilityLocations } from "@/lib/api/locations";
import type { StaffProfile } from "@/types/facility-staff";

// ============================================================================
// Who works where, for real.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// 1354 lines over `sharedStaffPool`, a ten-person fixture with invented
// upcoming shifts, a "coverage" view and a "schedule" view. Nothing here
// persisted, and none of it had a real branch to belong to.
//
// ── WHY SCHEDULE AND COVERAGE ARE GONE, NOT CONVERTED ─────────────────────
//
// Shifts (`staff_shifts`) are real, but carry no location -- there is no
// column to group a roster's coverage by branch with. Building that is a
// real, separate feature (a location dimension on scheduling), not a
// conversion of what already exists here.
//
// ── THE ONE NEW THING THIS NEEDED ──────────────────────────────────────────
//
// `facility_memberships.home_location_id` is real but only ever answerable
// one staff member at a time (`useStaffHomeLocation`). Grouping a WHOLE
// roster by branch needed the bulk read, `useStaffHomeLocations()` -- see
// `src/app/api/staff/home-locations/route.ts`.
// ============================================================================

const NO_BRANCH = "__no_branch__";

function initialsOf(profile: StaffProfile): string {
  return `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StaffPoolClient() {
  const [query, setQuery] = useState("");
  const { data: profiles, isPending: profilesPending } = useQuery(
    staffQueries.profiles(),
  );
  const { data: homeLocations, isPending: homePending } =
    useStaffHomeLocations();
  const { data: locations, isPending: locationsPending } =
    useFacilityLocations();

  const isPending = profilesPending || homePending || locationsPending;

  const homeByStaffId = useMemo(() => {
    const map = new Map<
      string,
      { homeLocationId: string | null; claimed: boolean }
    >();
    for (const h of homeLocations ?? []) {
      map.set(h.staffId, {
        homeLocationId: h.homeLocationId,
        claimed: h.claimed,
      });
    }
    return map;
  }, [homeLocations]);

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return profiles ?? [];
    return (profiles ?? []).filter((p) =>
      `${p.firstName} ${p.lastName} ${p.jobTitle ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [profiles, needle]);

  const groups = useMemo(() => {
    const byLocation = new Map<string, StaffProfile[]>();
    for (const p of filtered) {
      const home = homeByStaffId.get(p.id);
      const key =
        home?.claimed && home.homeLocationId ? home.homeLocationId : NO_BRANCH;
      const list = byLocation.get(key) ?? [];
      list.push(p);
      byLocation.set(key, list);
    }
    const ordered = (locations ?? [])
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        staff: byLocation.get(loc.id) ?? [],
      }))
      .filter((g) => g.staff.length > 0);
    const unassigned = byLocation.get(NO_BRANCH) ?? [];
    if (unassigned.length > 0) {
      ordered.push({
        id: NO_BRANCH,
        name: "No home branch set",
        staff: unassigned,
      });
    }
    return ordered;
  }, [filtered, homeByStaffId, locations]);

  if (isPending) {
    return (
      <div className="space-y-4 p-4 pt-6 md:p-8">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
            <p className="text-muted-foreground text-sm">
              {filtered.length} across the business, grouped by home branch
            </p>
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff…"
            className="pl-8"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border p-10 text-center text-sm">
          {needle ? `No staff match "${query}".` : "No staff yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {group.name}
                <span className="text-muted-foreground font-normal">
                  {group.staff.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.staff.map((profile) => (
                  <div
                    key={profile.id}
                    className="bg-card flex items-start gap-3 rounded-xl border p-3.5"
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: profile.colorHex }}
                    >
                      {initialsOf(profile)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {profile.firstName} {profile.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {profile.jobTitle || roleLabel(profile.primaryRole)}
                      </p>
                      {profile.serviceAssignments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {profile.serviceAssignments.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {profile.status !== "active" && (
                        <Badge
                          variant="outline"
                          className="mt-2 text-[10px] capitalize"
                        >
                          {profile.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
