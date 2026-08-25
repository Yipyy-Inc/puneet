"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Settings,
  Plus,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacilityLocations } from "@/lib/api/locations";
import type { FacilityLocation, LocationStatus } from "@/types/location";
import { AddLocationDialog } from "@/components/hq/AddLocationDialog";

// ============================================================================
// The branches this business actually has.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// A list of three fictional Montreal branches from `src/data/locations.ts`,
// merged with `added-locations-store` — a module-level array that died with the
// tab — and decorated with occupancy read from a fixture metrics block and a
// "last activity" timestamp computed against a hardcoded `hqActivityNow`.
//
// None of it was true of any real facility, and every facility saw the same
// three cards regardless of who they were.
//
// ── WHAT A CARD SHOWS NOW ─────────────────────────────────────────────────
//
// What the row holds, and nothing it does not. Occupancy is deliberately gone
// rather than left reading a fixture: it is a real question with a real answer
// in `bookings`, and a plausible invented number beside real addresses is
// worse than an absent one — that is the whole hardcoded-values rule.
// ============================================================================

const STATUS_META: Record<
  LocationStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
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

function initialsOf(location: FacilityLocation): string {
  if (location.shortCode) return location.shortCode;
  return location.name.slice(0, 3).toUpperCase();
}

function LocationCard({ location }: { location: FacilityLocation }) {
  const status = STATUS_META[location.status];
  const address = location.address;

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <div
        className="h-1"
        style={{ backgroundColor: location.color ?? "#475569" }}
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
              style={{ backgroundColor: location.color ?? "#475569" }}
            >
              {initialsOf(location)}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                {location.name}
                {location.isPrimary && (
                  <Star
                    className="size-3 shrink-0 fill-amber-400 text-amber-400"
                    aria-label="Primary location"
                  />
                )}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">
                  {address
                    ? [address.street, address.city]
                        .filter(Boolean)
                        .join(", ") || "No address yet"
                    : "No address yet"}
                </span>
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

        <div className="space-y-1 text-[11px]">
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Phone className="size-3 shrink-0" />
            {location.phone ?? "No phone"}
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{location.email ?? "No email"}</span>
          </p>
        </div>

        <p className="text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2 text-[11px]">
          {location.bookingCount === 0
            ? "No bookings recorded here yet"
            : `${location.bookingCount.toLocaleString()} booking${
                location.bookingCount === 1 ? "" : "s"
              } recorded here`}
        </p>

        <div className="mt-auto pt-1">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
          >
            <Link href={`/facility/hq/locations/${location.id}`}>
              <Settings className="size-3.5" />
              Manage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LocationsHubClient() {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { data, isPending, error } = useFacilityLocations();

  const locations = data ?? [];
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? locations.filter((location) =>
        `${location.name} ${location.shortCode ?? ""} ${
          location.address?.city ?? ""
        }`
          .toLowerCase()
          .includes(needle),
      )
    : locations;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground text-sm">
              {isPending
                ? "Loading…"
                : `${locations.length} ${
                    locations.length === 1 ? "branch" : "branches"
                  } in this business`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations…"
            className="border-input bg-background focus-visible:ring-ring h-9 w-full max-w-xs rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Add Location
          </Button>
        </div>
      </div>

      <AddLocationDialog open={addOpen} onOpenChange={setAddOpen} />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-800">
          {error.message}
        </p>
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border p-10 text-center text-sm">
          {needle
            ? `No locations match “${query}”.`
            : "This business has no locations yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}
    </div>
  );
}
