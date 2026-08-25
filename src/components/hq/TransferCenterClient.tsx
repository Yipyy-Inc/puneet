"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  History,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { auditLogQueries, type AuditLogEntry } from "@/lib/api/audit-log";
import { useFacilityLocations } from "@/lib/api/locations";

// ============================================================================
// Where a booking has actually moved.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// A 4-step wizard (select, availability check, confirm, done) with a pricing
// policy and a customer-approval workflow, over `location-transfers.ts` — a
// module-level array that reset on every reload. None of the workflow had
// anywhere real to live: no availability model, no transfer-pricing concept,
// no approval step anywhere in Postgres.
//
// What's real: `bookings_audit_location` (20260825150000) records a "Booking
// transferred" entry, with the from/to branch, every time
// `bookings.location_id` actually changes. This reads that trail — the same
// one `ScheduleAuditTrail` reads for the roster, filtered to `entityTypes=
// booking` instead of the scheduling entity types.
//
// ── NAMES, NOT IDS ─────────────────────────────────────────────────────────
//
// `toAuditLogEntry`'s `changes` mapping is a blind stringify — it does not
// know `location_id`'s value is a location id. So the raw uuids are resolved
// against the real location list here, client-side, rather than in the mapper
// (which has no way to know which fields on which entities are locations).
// ============================================================================

function when(timestamp: string): string {
  const at = new Date(timestamp);
  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransferRow({
  entry,
  locationName,
}: {
  entry: AuditLogEntry;
  locationName: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const move = entry.changes.find((c) => c.field === "location_id");
  const hasDetail = Boolean(move);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left",
          hasDetail && "hover:bg-muted/50",
        )}
      >
        <ArrowLeftRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              Booking {entry.entityName}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {entry.severity}
            </Badge>
          </div>
          {move && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {locationName(move.oldValue)} → {locationName(move.newValue)}
            </p>
          )}
        </div>
        <div className="text-muted-foreground shrink-0 text-right text-xs">
          <div>{when(entry.timestamp)}</div>
          <div>{entry.userName}</div>
        </div>
        {hasDetail && (
          <ChevronDown
            className={cn(
              "text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && move && (
        <div className="bg-muted/30 space-y-1 px-11 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground w-16 shrink-0">From</span>
            <span className="text-muted-foreground line-through">
              {locationName(move.oldValue)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground w-16 shrink-0">To</span>
            <span className="font-medium">{locationName(move.newValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function TransferCenterClient() {
  const [search, setSearch] = useState("");

  const { data, isPending, isError, error } = useQuery(
    auditLogQueries.bookings(),
  );
  const { data: locations } = useFacilityLocations();

  const locationName = useMemo(() => {
    const byId = new Map((locations ?? []).map((l) => [l.id, l.name]));
    return (id: string) => byId.get(id) ?? (id === "—" ? "no branch" : id);
  }, [locations]);

  const entries = useMemo<AuditLogEntry[]>(
    () => (data ?? []).filter((e) => e.action === "Booking transferred"),
    [data],
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.entityName.toLowerCase().includes(needle) ||
        entry.userName.toLowerCase().includes(needle) ||
        entry.description.toLowerCase().includes(needle),
    );
  }, [entries, search]);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ArrowLeftRight className="size-5" />
          Transfers
        </h1>
        <p className="text-muted-foreground text-sm">
          Every booking moved between branches, recorded by the database as it
          happened. Entries cannot be edited or removed by anyone.
        </p>
      </div>

      <div className="max-w-sm space-y-1">
        <Label htmlFor="transfer-search" className="text-[11px] font-normal">
          Search
        </Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            id="transfer-search"
            className="pl-8"
            placeholder="A booking, or who moved it"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
              <AlertTriangle className="mb-3 size-8 text-red-500 opacity-70" />
              <p>Could not read the transfer history.</p>
              <p className="mt-1 text-sm">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
          ) : shown.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
              <History className="mb-3 size-8 opacity-50" />
              <p>
                {entries.length === 0
                  ? "No booking has ever moved branch."
                  : "No entries match that."}
              </p>
              <p className="mt-1 max-w-sm text-sm">
                {entries.length === 0
                  ? "Moving a booking to another branch, from its detail page, appears here as it happens."
                  : "Try a different search."}
              </p>
            </div>
          ) : (
            <>
              {shown.map((entry) => (
                <TransferRow
                  key={entry.id}
                  entry={entry}
                  locationName={locationName}
                />
              ))}
              {entries.length >= 500 && (
                <p className="text-muted-foreground border-t px-4 py-2 text-xs">
                  Showing the 500 most recent entries.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
