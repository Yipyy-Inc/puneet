"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacilityLocations } from "@/lib/api/locations";
import {
  LOCATION_CAPACITY_KEYS,
  type FacilityLocation,
} from "@/types/location";

// ============================================================================
// THE FACILITY'S BRANCHES — FROM POSTGRES, NOT FROM A FIXTURE.
//
// This card read `locations` out of `src/data/settings` — three invented
// Montreal branches — and its Edit button called `alert("Opens location
// editor")`. Both had been wrong for a while rather than unfinished:
// `public.locations` has existed since 20260726120000 with full RLS, three
// tables already point at it (bookings.location_id,
// facility_memberships.home_location_id, facility_terminals.location_id), and
// `/api/locations` plus `useFacilityLocations()` were already serving eleven
// other screens. The screen and its own data had simply never been introduced.
//
// ── EDIT IS A LINK, BECAUSE THE EDITOR ALREADY EXISTS ────────────────────
//
// `/facility/hq/locations/<id>` is a real screen with the real form — name,
// address, hours, capacity, colour — writing through `useUpdateLocation()`.
// Building a second editor here would be the same mistake in a new place: two
// forms over one table, drifting.
// ============================================================================

function addressLine(location: FacilityLocation): string {
  const a = location.address;
  if (!a) return "No address yet";
  return [a.street, a.city, a.state, a.zipCode].filter(Boolean).join(", ");
}

/** "Daycare 40 · Boarding 25", or nothing when no limit is stated. */
function capacityLine(location: FacilityLocation): string | null {
  const parts = LOCATION_CAPACITY_KEYS.filter(
    (key) => location.capacity[key] !== undefined,
  ).map(
    (key) => `${key[0].toUpperCase()}${key.slice(1)} ${location.capacity[key]}`,
  );
  // An absent key means no stated limit, which is not the same as zero — so an
  // empty list says nothing rather than "0 pets".
  return parts.length ? parts.join(" · ") : null;
}

export function LocationsSection() {
  const { data: locations, isPending, isError, error } = useFacilityLocations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-5" />
          Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending ? (
          <>
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </>
        ) : isError ? (
          <p className="text-destructive text-sm">
            {error instanceof Error
              ? error.message
              : "Could not read your locations."}
          </p>
        ) : locations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You have one location. Add another from Multi-location (HQ) when you
            open a second branch.
          </p>
        ) : (
          locations.map((location) => {
            const capacity = capacityLine(location);
            return (
              <div key={location.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                      {location.name}
                      {location.status === "active" && (
                        <Badge variant="default">Active</Badge>
                      )}
                      {location.isPrimary && (
                        <Badge variant="outline">Primary</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1 text-sm">
                      {addressLine(location)}
                    </div>
                    <div className="mt-2 text-sm">
                      {location.phone ?? "No phone"}
                      {capacity ? ` • ${capacity}` : ""}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/facility/hq/locations/${location.id}`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
