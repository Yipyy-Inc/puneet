"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  UserRound,
  Clock,
  Settings,
  ArrowUpRight,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import { Button } from "@/components/ui/button";
import { locationStyles } from "@/lib/hq/location-styles";
import { liveCount } from "@/lib/hq/location-status";
import { useLocationContext } from "@/hooks/use-location-context";
import { hqActivityFeed, hqActivityNow } from "@/data/hq-activity";
import {
  addedLocationsStore,
  useAddedLocations,
} from "@/data/added-locations-store";
import { AddLocationDialog } from "@/components/hq/AddLocationDialog";

type Status = "active" | "inactive" | "coming_soon";

const STATUS_META: Record<Status, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  coming_soon: {
    label: "Coming Soon",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
};

function statusOf(loc: Location): Status {
  return loc.status ?? (loc.isActive ? "active" : "inactive");
}

const SERVICE_LABEL: Record<string, string> = {
  daycare: "Daycare",
  boarding: "Boarding",
  grooming: "Grooming",
  training: "Training",
};

const NOW_MS = new Date(hqActivityNow).getTime();

// Most recent network-activity event for a location → its "last activity".
function lastActivityTs(locationId: string): string | null {
  let latest: string | null = null;
  for (const e of hqActivityFeed) {
    if (e.locationId === locationId && (!latest || e.timestamp > latest)) {
      latest = e.timestamp;
    }
  }
  return latest;
}

function relativeTime(iso: string): string {
  const mins = Math.round((NOW_MS - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

interface Props {
  locations: Location[];
}

function LocationCard({ loc }: { loc: Location }) {
  const router = useRouter();
  const { setLocation } = useLocationContext();
  const s = locationStyles(loc);
  const status = statusOf(loc);
  const statusMeta = STATUS_META[status];

  const occ = loc.metrics?.occupancyRate ?? 0;
  const boarding = liveCount(loc.capacity.boarding, occ);
  const daycare = liveCount(loc.capacity.daycare, occ);

  const manager =
    loc.staffAssignments.find((a) => a.isPrimary && a.role === "manager") ??
    loc.staffAssignments.find((a) => a.isPrimary);

  const activityTs = lastActivityTs(loc.id);

  function goToDashboard() {
    setLocation(loc.id);
    router.push("/facility/dashboard");
  }

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <div className={cn("h-1", s.bg)} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white",
                s.bg,
              )}
            >
              {loc.shortCode}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{loc.name}</p>
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">
                  {loc.address}, {loc.city}
                </span>
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* Services */}
        <div className="flex flex-wrap gap-1">
          {loc.services.map((svc) => (
            <span
              key={svc}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                s.borderSoft,
                s.text,
              )}
            >
              {SERVICE_LABEL[svc] ?? svc}
            </span>
          ))}
        </div>

        {/* Occupancy */}
        <div className="bg-muted/40 rounded-lg px-2.5 py-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Current occupancy
          </p>
          <p className="mt-0.5 text-xs tabular-nums">
            {boarding === null && daycare === null ? (
              <span className="text-muted-foreground italic">
                No occupancy tracked
              </span>
            ) : (
              <>
                {boarding !== null && (
                  <span className="font-medium">
                    Boarding {boarding}/{loc.capacity.boarding}
                  </span>
                )}
                {boarding !== null && daycare !== null && (
                  <span className="text-muted-foreground"> · </span>
                )}
                {daycare !== null && (
                  <span className="font-medium">
                    Daycare {daycare}/{loc.capacity.daycare}
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Manager + contact */}
        <div className="space-y-1 text-[11px]">
          <p className="flex items-center gap-1.5">
            <UserRound className="text-muted-foreground size-3 shrink-0" />
            <span className="font-medium">
              {manager?.staffName ?? "Unassigned"}
            </span>
            <span className="text-muted-foreground">· Manager</span>
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Phone className="size-3 shrink-0" />
            {loc.phone}
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3 shrink-0" />
            {activityTs
              ? `Last activity ${relativeTime(activityTs)}`
              : "No recent activity"}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Link href={`/facility/hq/locations/${loc.id}`} className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
            >
              <Settings className="size-3.5" />
              Manage
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={goToDashboard}
            className="w-full gap-1.5 text-xs"
          >
            Go to Dashboard
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LocationsHubClient({ locations }: Props) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const added = useAddedLocations();

  // Base (server) locations plus any created via the wizard this session.
  const allLocations = [...locations, ...added];

  const filtered = query.trim()
    ? allLocations.filter((l) =>
        `${l.name} ${l.city} ${l.shortCode}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : allLocations;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground text-sm">
              {allLocations.length} branches across the network
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

      <AddLocationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={(loc) => addedLocationsStore.add(loc)}
      />

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border p-10 text-center text-sm">
          No locations match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((loc) => (
            <LocationCard key={loc.id} loc={loc} />
          ))}
        </div>
      )}
    </div>
  );
}
