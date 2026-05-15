"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Route,
  Truck,
  MapPin,
  Clock,
  Users,
  Home,
  Sparkles,
  Map as MapIcon,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { groomingQueries } from "@/lib/api/grooming";
import { facilityStaff } from "@/data/facility-staff";
import {
  getActiveServiceAreasForDay,
  formatDaysOfWeek,
} from "@/lib/service-areas";
import type { GroomingAppointment } from "@/types/grooming";
import {
  arrivalWindow,
  chainScheduledStops,
  driveKilometres,
  isNearAnyStop,
  optimizeNearestNeighbor,
  pseudoCoord,
  type Coord,
  type RouteStop,
  type ScheduledStop,
} from "@/lib/route-planning";
import { clients } from "@/data/clients";
import { Switch } from "@/components/ui/switch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Pretend every owner has a unique address — synthesised from their name so
// pseudoCoord stays deterministic per pet/owner across renders.
function addressFor(apt: GroomingAppointment): string {
  return `${apt.petName}-${apt.ownerName}-${apt.ownerPhone}`;
}

// Home base sits at a fixed bottom-centre slot so the route reads as
// "leave the depot → run stops → return".
const HOME_COORD: Coord = { x: 50, y: 92 };

// ─── Map (SVG) ────────────────────────────────────────────────────────────────

function RouteMap({
  vanColor,
  stops,
  nearbyClients,
  onNearbyClick,
}: {
  vanColor: string;
  stops: { coord: Coord; label: number; petName: string }[];
  nearbyClients?: { id: number; name: string; coord: Coord }[];
  onNearbyClick?: (clientId: number) => void;
}) {
  const linePoints = [HOME_COORD, ...stops.map((s) => s.coord), HOME_COORD]
    .map((c) => `${c.x},${c.y}`)
    .join(" ");

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-gradient-to-br from-sky-50/60 via-emerald-50/40 to-violet-50/40 dark:from-sky-950/30 dark:via-emerald-950/20 dark:to-violet-950/20">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
          backgroundSize: "10% 10%",
        }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        {stops.length > 0 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={vanColor}
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2,1.5"
            opacity={0.85}
          />
        )}

        {/* Home base pin */}
        <g>
          <circle
            cx={HOME_COORD.x}
            cy={HOME_COORD.y}
            r={3.5}
            fill="#0f172a"
            stroke="white"
            strokeWidth={1}
          />
          <text
            x={HOME_COORD.x}
            y={HOME_COORD.y + 1.1}
            textAnchor="middle"
            fontSize={3.2}
            fill="white"
            fontWeight={700}
          >
            H
          </text>
        </g>

        {/* Nearby clients rendered BEHIND the route pins so they don't cover them */}
        {nearbyClients?.map((c) => (
          <g
            key={`near-${c.id}`}
            className="cursor-pointer"
            onClick={() => onNearbyClick?.(c.id)}
          >
            <circle
              cx={c.coord.x}
              cy={c.coord.y}
              r={2.2}
              fill="#fbbf24"
              fillOpacity={0.55}
              stroke="#b45309"
              strokeWidth={0.6}
            />
            <title>{c.name} — nearby client</title>
          </g>
        ))}

        {stops.map((s) => (
          <g key={s.label}>
            <circle
              cx={s.coord.x}
              cy={s.coord.y}
              r={4}
              fill={vanColor}
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={s.coord.x}
              y={s.coord.y + 1.3}
              textAnchor="middle"
              fontSize={3.4}
              fill="white"
              fontWeight={700}
            >
              {s.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-slate-700 shadow-sm dark:bg-slate-900/85 dark:text-slate-200">
        <Home className="size-3" /> Home base
      </div>
      <div
        className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-slate-700 shadow-sm dark:bg-slate-900/85 dark:text-slate-200"
        title="Pseudo-map. Pins are derived from address; real geocoding later."
      >
        <MapIcon className="size-3" /> Pseudo-map
      </div>
    </div>
  );
}

// ─── Confirm time-change dialog ──────────────────────────────────────────────

type ChainItem = ReturnType<
  typeof chainScheduledStops<ScheduledStop & { apt: GroomingAppointment }>
>[number];

function TimeChangeConfirm({
  open,
  onOpenChange,
  vanName,
  changes,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vanName: string;
  changes: ChainItem[];
  onConfirm: () => void;
}) {
  const flagged = changes.filter((c) => c.changed);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-emerald-600" />
            Confirm Route Changes — {vanName}
          </DialogTitle>
        </DialogHeader>
        {flagged.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">
            The optimised order produces the same appointment times — nothing to
            confirm.
          </p>
        ) : (
          <div className="space-y-2 py-2">
            <p className="text-muted-foreground text-xs">
              {flagged.length} appointment{flagged.length === 1 ? "" : "s"} will
              shift. Clients will receive an updated confirmation when you
              approve.
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-2">
              {flagged.map((c) => (
                <li
                  key={c.payload.apt.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate font-medium">
                    {c.payload.apt.petName}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {c.payload.apt.ownerName}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0 tabular-nums">
                    <span className="text-muted-foreground line-through">
                      {formatTime(c.payload.originalStart)}
                    </span>
                    <ArrowRight className="size-3" />
                    <span className="font-semibold">
                      {formatTime(c.newStart)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Sparkles className="mr-1.5 size-4" />
            {flagged.length > 0
              ? "Confirm & Notify Clients"
              : "Apply New Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RoutePlannerPage() {
  const { enabled, vans, serviceAreas, arrivalWindowMinutes } =
    useMobileGrooming();
  const { data: appointments = [] } = useQuery(groomingQueries.appointments());

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showNearbyClients, setShowNearbyClients] = useState(false);
  useEffect(() => {
    setSelectedDate(todayIso());
  }, []);

  // Per-van overrides — ordered apt ids and per-apt new times once optimised.
  const [routeOrders, setRouteOrders] = useState<Record<string, string[]>>({});
  const [timeOverrides, setTimeOverrides] = useState<
    Record<string, { startTime: string; endTime: string }>
  >({});
  const [confirmFor, setConfirmFor] = useState<{
    vanId: string;
    vanName: string;
    chain: ChainItem[];
  } | null>(null);

  const activeVans = useMemo(() => vans.filter((v) => v.active), [vans]);
  const [activeVanId, setActiveVanId] = useState<string>("");

  useEffect(() => {
    if (!activeVanId && activeVans.length > 0) {
      setActiveVanId(activeVans[0].id);
    }
  }, [activeVans, activeVanId]);

  const activeAreasForDay = useMemo(() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate + "T00:00:00");
    return getActiveServiceAreasForDay(serviceAreas, d.getDay());
  }, [selectedDate, serviceAreas]);

  // Build the chained route for a van — applies any saved order + time
  // overrides, so once the manager confirms an optimisation the page reflects
  // the new state immediately.
  function buildChainForVan(vanId: string) {
    const stops = appointments
      .filter((a) => a.date === selectedDate && a.stylistId === vanId)
      .filter((a) => a.status !== "cancelled" && a.status !== "no-show");

    const orderOverride = routeOrders[vanId];
    const ordered = orderOverride
      ? (orderOverride
          .map((id) => stops.find((s) => s.id === id))
          .filter(Boolean) as GroomingAppointment[])
      : [...stops].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const withCoords = ordered.map((apt) => ({
      apt,
      coord: pseudoCoord(addressFor(apt)),
      originalStart: timeOverrides[apt.id]?.startTime ?? apt.startTime,
      originalEnd: timeOverrides[apt.id]?.endTime ?? apt.endTime,
    }));

    return chainScheduledStops(HOME_COORD, withCoords);
  }

  function handleOptimize(vanId: string, vanName: string) {
    const stops = appointments
      .filter((a) => a.date === selectedDate && a.stylistId === vanId)
      .filter((a) => a.status !== "cancelled" && a.status !== "no-show");
    if (stops.length < 2) {
      toast.info("Need at least two stops to optimise");
      return;
    }
    const routeStops: RouteStop<GroomingAppointment>[] = stops.map((a) => ({
      payload: a,
      coord: pseudoCoord(addressFor(a)),
    }));
    const optimised = optimizeNearestNeighbor(HOME_COORD, routeStops);
    const orderedApts = optimised.map((s) => s.payload);
    const chain = chainScheduledStops(
      HOME_COORD,
      orderedApts.map((apt) => ({
        apt,
        coord: pseudoCoord(addressFor(apt)),
        originalStart: timeOverrides[apt.id]?.startTime ?? apt.startTime,
        originalEnd: timeOverrides[apt.id]?.endTime ?? apt.endTime,
      })),
    );
    setConfirmFor({ vanId, vanName, chain });
  }

  function applyOptimisation() {
    if (!confirmFor) return;
    const { vanId, chain } = confirmFor;
    setRouteOrders((prev) => ({
      ...prev,
      [vanId]: chain.map((c) => c.payload.apt.id),
    }));
    const newTimes: Record<
      string,
      { startTime: string; endTime: string }
    > = { ...timeOverrides };
    let notifiedCount = 0;
    for (const c of chain) {
      newTimes[c.payload.apt.id] = {
        startTime: c.newStart,
        endTime: c.newEnd,
      };
      if (c.changed) notifiedCount++;
    }
    setTimeOverrides(newTimes);
    if (notifiedCount > 0) {
      toast.success(
        `Route optimised — ${notifiedCount} client${notifiedCount === 1 ? "" : "s"} notified of new times`,
      );
    } else {
      toast.success("Route reordered (no time changes needed)");
    }
    setConfirmFor(null);
  }

  if (!enabled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Truck className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Mobile grooming isn&apos;t enabled</p>
            <p className="text-muted-foreground text-sm">
              Turn it on in Settings to start using the Route Planner.
            </p>
          </div>
          <Button asChild>
            <Link href="/facility/dashboard/settings?section=grooming">
              Open Mobile Grooming Settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Route className="size-6 text-sky-600" />
            Route Planner
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Per-van stop list on the left, route map on the right. Click
            Optimise to reorder stops and minimise drive time.
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        />
      </div>

      {/* Service areas for this date */}
      {serviceAreas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapIcon className="size-4 text-muted-foreground" />
              Service Areas Active This Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAreasForDay.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">
                No service areas scheduled for this day.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeAreasForDay.map((a) => (
                  <div
                    key={a.id}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                    style={{
                      borderColor: a.color ?? undefined,
                      backgroundColor: a.color ? `${a.color}15` : undefined,
                    }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: a.color ?? "#10b981" }}
                    />
                    <span className="font-semibold">{a.name}</span>
                    <span className="text-muted-foreground">
                      ·{" "}
                      {a.type === "postal"
                        ? `${(a.postalCodes ?? []).length} codes`
                        : `${a.radiusKm} km radius`}
                    </span>
                    <span className="text-muted-foreground/70">
                      · {formatDaysOfWeek(a.daysOfWeek)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeVans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Truck className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">No active vans</p>
              <p className="text-muted-foreground text-sm">
                Add or activate at least one van in Settings to see routes.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/facility/dashboard/settings?section=grooming">
                Manage vans
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={activeVanId || activeVans[0].id}
          onValueChange={setActiveVanId}
        >
          <TabsList className="flex-wrap">
            {activeVans.map((v) => (
              <TabsTrigger key={v.id} value={v.id} className="gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: v.calendarColor ?? "#0ea5e9" }}
                />
                {v.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeVans.map((v) => {
            const chain = buildChainForVan(v.id);
            const primaryName = v.primaryDriverId
              ? (() => {
                  const s = facilityStaff.find(
                    (p) => p.id === v.primaryDriverId,
                  );
                  return s ? `${s.firstName} ${s.lastName}` : null;
                })()
              : null;
            const secondName = v.secondGroomerId
              ? (() => {
                  const s = facilityStaff.find(
                    (p) => p.id === v.secondGroomerId,
                  );
                  return s ? `${s.firstName} ${s.lastName}` : null;
                })()
              : null;
            const totalDriveMin = chain.reduce(
              (sum, c) => sum + c.driveMinutesIn,
              0,
            );
            const vanColor = v.calendarColor ?? "#0ea5e9";

            // Nearby clients: pseudo-coord each client and check against the
            // van's route stops within 2 km.
            const stopCoords = chain.map((c) => c.coord);
            const nearby = showNearbyClients
              ? clients
                  .map((cl) => {
                    const addr =
                      `${cl.address?.street ?? ""} ${cl.address?.city ?? ""}`.trim() ||
                      cl.name;
                    return {
                      id: cl.id,
                      name: cl.name,
                      coord: pseudoCoord(addr),
                    };
                  })
                  .filter(
                    (cl) =>
                      stopCoords.length > 0 &&
                      isNearAnyStop(cl.coord, stopCoords, 2),
                  )
                  .slice(0, 30) // safety cap on render
              : [];

            return (
              <TabsContent key={v.id} value={v.id} className="mt-4 space-y-4">
                <Card className="overflow-hidden">
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: vanColor }}
                    aria-hidden
                  />
                  <CardHeader className="flex flex-col gap-2 pb-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Truck className="size-4 text-muted-foreground" />
                        {v.name}
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {chain.length} stop{chain.length === 1 ? "" : "s"}
                        </Badge>
                      </CardTitle>
                      <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        <MapPin className="size-3" />
                        {v.homeBaseAddress || "No home base set"}
                      </p>
                      {(primaryName || secondName) && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Users className="size-3" />
                          {primaryName ? (
                            <span>
                              <span className="font-medium text-foreground">
                                {primaryName}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                · driver
                              </span>
                            </span>
                          ) : (
                            <span className="italic">No driver assigned</span>
                          )}
                          {secondName && (
                            <>
                              <span>·</span>
                              <span>
                                <span className="font-medium text-foreground">
                                  {secondName}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  · 2nd groomer
                                </span>
                              </span>
                            </>
                          )}
                        </p>
                      )}
                      {chain.length > 0 && (
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                          <Clock className="size-3" />
                          ~{totalDriveMin} min total drive time
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleOptimize(v.id, v.name)}
                      disabled={chain.length < 2}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Sparkles className="mr-1.5 size-4" />
                      Optimise Route
                    </Button>
                  </CardHeader>

                  <CardContent>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                      {/* ── Left: ordered stop list ── */}
                      <div>
                        {chain.length === 0 ? (
                          <p className="text-muted-foreground py-8 text-center text-sm">
                            No stops scheduled for this date.
                          </p>
                        ) : (
                          <ol className="space-y-2">
                            <li className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                              <Home className="text-muted-foreground size-3.5" />
                              <span className="font-medium">
                                Depart home base
                              </span>
                              <span className="text-muted-foreground ml-auto">
                                {v.homeBaseAddress || "—"}
                              </span>
                            </li>

                            {chain.map((c, i) => {
                              // Drive distance from the previous stop's coord
                              // (or home for the first one). Mirrors the chain
                              // input the helper used to compute drive time.
                              const prevCoord =
                                i === 0
                                  ? HOME_COORD
                                  : chain[i - 1].coord;
                              const km = driveKilometres(prevCoord, c.coord);
                              const window =
                                arrivalWindowMinutes > 0
                                  ? arrivalWindow(
                                      c.newStart,
                                      arrivalWindowMinutes,
                                    )
                                  : null;
                              return (
                              <li key={c.payload.apt.id} className="space-y-1">
                                {/* Drive segment from previous stop — time + km */}
                                <div className="text-muted-foreground ml-3 flex items-center gap-1.5 border-l-2 border-dashed pl-3 text-[11px]">
                                  <ArrowRight className="size-3" />
                                  <span className="font-medium">
                                    {c.driveMinutesIn} min drive
                                  </span>
                                  <span>·</span>
                                  <span>{km.toFixed(1)} km</span>
                                </div>
                                <div
                                  className="flex items-start gap-3 rounded-lg border p-3"
                                  style={{
                                    borderLeftWidth: 4,
                                    borderLeftColor: vanColor,
                                  }}
                                >
                                  <div
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm"
                                    style={{ backgroundColor: vanColor }}
                                  >
                                    {i + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="truncate text-sm font-semibold">
                                        {c.payload.apt.petName}
                                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                                          · {c.payload.apt.packageName}
                                        </span>
                                      </p>
                                      <span
                                        className={cn(
                                          "shrink-0 text-xs font-semibold tabular-nums",
                                          c.changed
                                            ? "text-emerald-700"
                                            : "text-foreground",
                                        )}
                                      >
                                        {formatTime(c.newStart)} –{" "}
                                        {formatTime(c.newEnd)}
                                      </span>
                                    </div>
                                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                      <MapPin className="size-3" />
                                      {c.payload.apt.ownerName} ·{" "}
                                      {c.payload.apt.ownerPhone}
                                    </p>
                                    {c.changed && (
                                      <p className="mt-0.5 text-[10px] text-emerald-700">
                                        Updated from{" "}
                                        {formatTime(c.payload.originalStart)}
                                      </p>
                                    )}
                                    {window && (
                                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                                        <Clock className="size-2.5" />
                                        Client sees:{" "}
                                        {formatTime(window.start)} –{" "}
                                        {formatTime(window.end)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </li>
                              );
                            })}

                            <li className="text-muted-foreground flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                              <Home className="size-3.5" />
                              <span className="font-medium">
                                Return to home base
                              </span>
                            </li>
                          </ol>
                        )}
                      </div>

                      {/* ── Right: map ── */}
                      <div className="lg:sticky lg:top-4 lg:self-start">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-xs">
                            <Switch
                              checked={showNearbyClients}
                              onCheckedChange={setShowNearbyClients}
                              className="scale-75"
                            />
                            Show nearby clients (within 2 km)
                          </label>
                          {showNearbyClients && nearby.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {nearby.length} nearby
                            </Badge>
                          )}
                        </div>
                        <RouteMap
                          vanColor={vanColor}
                          stops={chain.map((c, i) => ({
                            coord: c.coord,
                            label: i + 1,
                            petName: c.payload.apt.petName,
                          }))}
                          nearbyClients={
                            showNearbyClients ? nearby : undefined
                          }
                          onNearbyClick={(id) => {
                            // Real wiring goes to a client profile route; toast
                            // the intent so the gesture is visible in mock.
                            const cl = clients.find((c) => c.id === id);
                            toast.message(
                              `Nearby client: ${cl?.name ?? "Client"}`,
                              {
                                description:
                                  "Opens their profile (use it to suggest a same-day add-on).",
                              },
                            );
                          }}
                        />
                        {chain.length > 0 && (
                          <p className="text-muted-foreground mt-2 text-[11px]">
                            Pins are numbered in route order. The dashed line
                            shows the drive sequence from home base through
                            every stop and back.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {confirmFor && (
        <TimeChangeConfirm
          open={!!confirmFor}
          onOpenChange={(o) => {
            if (!o) setConfirmFor(null);
          }}
          vanName={confirmFor.vanName}
          changes={confirmFor.chain}
          onConfirm={applyOptimisation}
        />
      )}
    </div>
  );
}
