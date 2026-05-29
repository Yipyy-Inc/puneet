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
  BellRing,
  UserX,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  // Per-van sent-reminder bookkeeping so the button switches to "Reminder
  // sent" after one tap (and won't fire repeatedly during the same session).
  const [remindersSent, setRemindersSent] = useState<Record<string, string>>(
    {},
  );
  // Per-van auto-alert state — set once the no-data window crosses 30 min so
  // the "manager alert" banner pulses for visibility without re-firing.
  const [autoAlertedVans, setAutoAlertedVans] = useState<Set<string>>(
    () => new Set(),
  );

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
  const NO_DATA_ALERT_GRACE_MIN = 30;

  // Per-van computed flags driven by today's scheduled mobile bookings vs.
  // current time vs. tracking status. The earliest stop sets the deadline
  // beyond which the manager gets pinged automatically.
  const vanFlags = useMemo(() => {
    const map: Record<
      string,
      {
        firstStopMin: number | null;
        minutesPastFirstStop: number;
        noDataAlert: boolean;
        hasScheduledStops: boolean;
      }
    > = {};
    for (const { van, summary } of summaries) {
      const staffIds = van.assignedStaffIds ?? [];
      const todayAppts = appointments.filter(
        (a) =>
          a.date === today &&
          a.status !== "cancelled" &&
          a.status !== "no-show" &&
          (staffIds.length === 0 || staffIds.includes(a.stylistId)),
      );
      const startMinutes = todayAppts
        .map((a) => {
          const [h, m] = a.startTime.split(":").map(Number);
          return h * 60 + m;
        })
        .sort((x, y) => x - y);
      const firstStopMin = startMinutes[0] ?? null;
      const minutesPastFirstStop =
        firstStopMin !== null ? nowMinutes - firstStopMin : 0;
      const noDataAlert =
        summary.status === "no-data-all-day" &&
        todayAppts.length > 0 &&
        firstStopMin !== null &&
        minutesPastFirstStop > NO_DATA_ALERT_GRACE_MIN;
      map[van.id] = {
        firstStopMin,
        minutesPastFirstStop,
        noDataAlert,
        hasScheduledStops: todayAppts.length > 0,
      };
    }
    return map;
  }, [summaries, appointments, today, nowMinutes]);

  // Fire the auto-alert toast once per van per session — re-firing every
  // minute the manager kept the page open would be unbearable.
  useEffect(() => {
    for (const { van } of summaries) {
      const flags = vanFlags[van.id];
      if (!flags?.noDataAlert) continue;
      if (autoAlertedVans.has(van.id)) continue;
      setAutoAlertedVans((prev) => {
        const next = new Set(prev);
        next.add(van.id);
        return next;
      });
      toast.warning(`${van.name} — no location data`, {
        description: `${flags.minutesPastFirstStop} min past the first scheduled stop. Driver may not have tracking enabled.`,
        duration: 10000,
      });
    }
  }, [summaries, vanFlags, autoAlertedVans]);

  function handleSendDriverReminder(vanId: string, driverName: string) {
    setRemindersSent((prev) => ({
      ...prev,
      [vanId]: new Date().toISOString(),
    }));
    const target = driverName === "—" ? "the driver" : driverName.split(" ")[0];
    toast.message(`Reminder sent to ${target}`, {
      description:
        "Please enable location tracking in the Yipyy mobile app to start your route.",
      duration: 8000,
    });
  }

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
          // Resolve today's driver — primaryDriverId is the day's assigned
          // driver in the current mock; fall back to the secondGroomer if
          // present so a co-driving-only crew still surfaces a name.
          const driverName = (() => {
            const lookup = (id: string | undefined) => {
              if (!id) return null;
              const staff = facilityStaff.find((s) => s.id === id);
              return staff ? `${staff.firstName} ${staff.lastName}` : null;
            };
            return (
              lookup(van.primaryDriverId) ?? lookup(van.secondGroomerId) ?? "—"
            );
          })();
          const noDriverAssigned = driverName === "—";
          const flags = vanFlags[van.id];
          const reminderSentAt = remindersSent[van.id];
          return (
            <Card
              key={van.id}
              className={cn(
                "border",
                summary.delay
                  ? "border-amber-300 dark:border-amber-900"
                  : "",
                flags?.noDataAlert &&
                  "border-red-300 dark:border-red-900",
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
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Driver: <strong>{driverName}</strong>
                  </p>
                  {noDriverAssigned && (
                    <span
                      title="A van operating without a named driver is an operational problem — assign someone in Mobile Grooming Settings."
                      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200"
                    >
                      <UserX className="size-2.5" />
                      No driver assigned
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs">
                {summary.status === "driving" && summary.latestPing && (
                  <Row
                    icon={Activity}
                    label="Moving"
                    value={
                      <>
                        Last ping at{" "}
                        <strong>
                          {formatTimeLocal(summary.latestPing.recordedAt)}
                        </strong>{" "}
                        <span className="text-muted-foreground">
                          (
                          {formatRelativeFromNow(
                            summary.latestPing.recordedAt,
                            nowIso,
                          )}
                          )
                        </span>
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
                  <Row
                    icon={MapPin}
                    label="Last known"
                    value={
                      <>
                        Last seen at{" "}
                        <strong>
                          {summary.latestPing.address ??
                            "Coordinates only — no address resolved"}
                        </strong>{" "}
                        stop at{" "}
                        <strong>
                          {formatTimeLocal(summary.latestPing.recordedAt)}
                        </strong>{" "}
                        <span className="text-muted-foreground">
                          (
                          {formatRelativeFromNow(
                            summary.latestPing.recordedAt,
                            nowIso,
                          )}
                          )
                        </span>
                      </>
                    }
                  />
                )}

                {summary.status === "no-data-all-day" && (
                  <div className="space-y-2">
                    <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-center text-muted-foreground italic">
                      No tracking data received today. Confirm the driver has
                      tracking enabled in the mobile app.
                    </p>
                    {flags?.noDataAlert && (
                      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-800 dark:text-red-200">
                          <AlertTriangle className="size-3 animate-pulse" />
                          Manager alert · {flags.minutesPastFirstStop} min
                          past first stop
                        </p>
                        <p className="mt-0.5 text-[12px] text-red-900 dark:text-red-100">
                          {van.name} has scheduled mobile bookings today and
                          still hasn&apos;t pinged. Driver may have tracking
                          disabled or the device may be offline.
                        </p>
                      </div>
                    )}
                    {reminderSentAt ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <CheckCircle2 className="size-3" />
                        Reminder sent at {formatTimeLocal(reminderSentAt)}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-full justify-center gap-1.5 border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                        onClick={() =>
                          handleSendDriverReminder(van.id, driverName)
                        }
                        disabled={noDriverAssigned}
                        title={
                          noDriverAssigned
                            ? "Assign a driver before sending a reminder."
                            : undefined
                        }
                      >
                        <BellRing className="size-3.5" />
                        Send reminder to driver
                      </Button>
                    )}
                  </div>
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
