"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { facilityStaff } from "@/data/facility-staff";
import {
  deriveVanLiveStatus,
  describeVanStatus,
  DELAY_FLAG_GRACE_MIN,
} from "@/lib/grooming-van-tracking";
import {
  generateMockVanPings,
  trackingScenarios,
} from "@/data/grooming-van-tracking";
import {
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatRelativeFromNow(iso: string, nowIso: string): string {
  const mins = Math.max(
    0,
    Math.round((new Date(nowIso).getTime() - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

function formatTimeLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Real-time staff tracking for mobile grooming vans. Pure derived UI — the
 * ping store auto-clears yesterday's data on each render so the privacy
 * contract holds without any server-side cron. The "now" cursor advances
 * every minute so a manager who leaves the page open sees status changes
 * roll in.
 */
export function LiveTrackingPage() {
  const { enabled: mobileEnabled, vans } = useMobileGrooming();
  const { data: appointments = [] } = useQuery(groomingQueries.appointments());

  // Tick "now" every minute so derived statuses update without a refresh.
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  useEffect(() => {
    setNowIso(new Date().toISOString());
    const id = setInterval(
      () => setNowIso(new Date().toISOString()),
      60_000,
    );
    return () => clearInterval(id);
  }, []);

  const today = nowIso.split("T")[0];
  const nowMinutes = useMemo(() => {
    const d = new Date(nowIso);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowIso]);

  // Generate ping data for each van. Yesterday's pings are simply never
  // generated — there is no persistent store of historical tracking.
  const allPings = useMemo(() => {
    return vans.flatMap((van) => {
      const scenario = trackingScenarios[van.id] ?? {};
      if (scenario.noTrackingAllDay) return [];

      // Find today's appointments for the van's staff. The mock generator
      // doesn't know about appointments-per-stylist; pick the appointments
      // assigned to any stylist riding in this van as a stand-in.
      const staffIds = van.assignedStaffIds ?? [];
      const stylistsInVan = staffIds.length === 0 ? [] : staffIds;
      const dayAppointments = appointments.filter(
        (a) =>
          a.date === today &&
          (stylistsInVan.length === 0 ||
            stylistsInVan.includes(a.stylistId)) &&
          a.status !== "cancelled" &&
          a.status !== "no-show",
      );
      return generateMockVanPings({
        vanId: van.id,
        date: today,
        appointments: dayAppointments.map((a) => ({
          id: a.id,
          startTime: a.startTime,
          endTime: a.endTime,
          address: `${a.petName} · ${a.ownerName}`,
        })),
        nowMinutes,
        extraDelayPerStopMin: scenario.extraDelayPerStopMin,
      });
    });
  }, [vans, appointments, today, nowMinutes]);

  // Derive a live summary per van.
  const summaries = useMemo(
    () =>
      vans.map((van) => ({
        van,
        summary: deriveVanLiveStatus({
          vanId: van.id,
          pings: allPings,
          appointments,
          nowIso,
          todayDate: today,
        }),
      })),
    [vans, allPings, appointments, nowIso, today],
  );

  const activeDelayCount = summaries.filter((s) => s.summary.delay).length;

  if (!mobileEnabled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Truck className="size-10 text-muted-foreground" />
          <p className="font-medium">Mobile grooming isn&apos;t enabled</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Live tracking is only available for mobile grooming vans. Enable
            mobile grooming in settings to start tracking staff in the field.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Activity className="size-6 text-sky-600" />
            Live Tracking
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            Real-time location of mobile grooming vans during the working
            day. Tracking is active only during scheduled hours and{" "}
            <strong>all location data is deleted after the day ends</strong>{" "}
            — operationally useful without storing personal movement
            histories.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Right now
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums">
            {formatTimeLocal(nowIso)}
          </p>
        </div>
      </div>

      {/* Delay banner */}
      {activeDelayCount > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">
                Possible delay on {activeDelayCount}{" "}
                {activeDelayCount === 1 ? "van" : "vans"}
              </p>
              <p className="text-xs">
                A van has been at a stop more than{" "}
                {DELAY_FLAG_GRACE_MIN} minutes past the scheduled appointment
                duration. Check the affected van card below — this is a heads
                up, not an alarm.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-van cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {summaries.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Truck className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No vans configured</p>
              <p className="text-xs text-muted-foreground">
                Add a van in Mobile Grooming Settings to start tracking.
              </p>
            </CardContent>
          </Card>
        )}
        {summaries.map(({ van, summary }) => {
          const meta = describeVanStatus(summary.status);
          const driverName = (() => {
            if (!van.primaryDriverId) return "—";
            const staff = facilityStaff.find(
              (s) => s.id === van.primaryDriverId,
            );
            return staff ? `${staff.firstName} ${staff.lastName}` : "—";
          })();
          return (
            <Card
              key={van.id}
              className={cn(
                "border",
                summary.delay
                  ? "border-amber-300 dark:border-amber-900"
                  : "",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck
                      className="size-4"
                      style={{ color: van.calendarColor ?? "#0ea5e9" }}
                    />
                    {van.name}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      · {van.licensePlate}
                    </span>
                  </CardTitle>
                  <Badge
                    className={cn(
                      "gap-1.5 border-0",
                      meta.bg,
                      meta.text,
                    )}
                  >
                    <span
                      className={cn("size-1.5 rounded-full", meta.dot)}
                    />
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Driver: <strong>{driverName}</strong>
                </p>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs">
                {summary.status === "driving" && summary.latestPing && (
                  <Row
                    icon={Activity}
                    label="Moving"
                    value={
                      <>
                        Last ping{" "}
                        <strong>
                          {formatRelativeFromNow(
                            summary.latestPing.recordedAt,
                            nowIso,
                          )}
                        </strong>
                        {" · between stops"}
                      </>
                    }
                  />
                )}

                {summary.status === "stopped" && summary.latestPing && (
                  <>
                    <Row
                      icon={MapPin}
                      label="At stop"
                      value={
                        summary.latestPing.address ?? "Location withheld"
                      }
                    />
                    <Row
                      icon={Clock}
                      label="Duration"
                      value={
                        <strong>
                          {summary.stoppedForMin ?? 0} min at this stop
                        </strong>
                      }
                    />
                  </>
                )}

                {summary.status === "no-location" && summary.latestPing && (
                  <>
                    <Row
                      icon={MapPin}
                      label="Last known"
                      value={
                        summary.latestPing.address ??
                        "Coordinates only — no address resolved"
                      }
                    />
                    <Row
                      icon={Clock}
                      label="Last ping"
                      value={formatRelativeFromNow(
                        summary.latestPing.recordedAt,
                        nowIso,
                      )}
                    />
                  </>
                )}

                {summary.status === "no-data-all-day" && (
                  <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-center text-muted-foreground italic">
                    No tracking data received today. Confirm the driver has
                    tracking enabled in the mobile app.
                  </p>
                )}

                {/* Delay heads-up */}
                {summary.delay && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="size-3" />
                      Running long
                    </p>
                    <p className="mt-0.5 text-[12px] text-amber-900 dark:text-amber-100">
                      {driverName !== "—"
                        ? driverName.split(" ")[0]
                        : van.name}{" "}
                      has been at{" "}
                      <strong>
                        {summary.latestPing?.address ?? "this stop"}
                      </strong>{" "}
                      for <strong>{summary.delay.actualMin} minutes</strong>.
                      The appointment was scheduled for{" "}
                      {summary.delay.scheduledMin} minutes — they should be
                      finishing up.
                    </p>
                  </div>
                )}

                {/* Pings count footer — confirms the privacy contract */}
                <p className="flex items-center gap-1 border-t pt-2 text-[10px] text-muted-foreground">
                  <ShieldCheck className="size-3" />
                  Today&apos;s data only · auto-deletes overnight
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-xs">{value}</p>
      </div>
    </div>
  );
}
