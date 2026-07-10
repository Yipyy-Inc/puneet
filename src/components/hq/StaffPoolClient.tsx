"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  Star,
  TrendingUp,
  Search,
  Network,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Location, LocationWeeklyHours } from "@/types/location";
import {
  locationStyles,
  utilizationKey,
  utilizationHealth,
  styleFromKey,
} from "@/lib/hq/location-styles";
import {
  findShiftConflicts,
  formatConflictWindow,
  type CrossLocationShift,
} from "@/lib/hq/schedule-conflicts";
import { ManageLocationsDialog } from "@/components/hq/ManageLocationsDialog";
import {
  SendToLocationDialog,
  type DispatchPayload,
} from "@/components/hq/SendToLocationDialog";
import { PayrollExportDialog } from "@/components/hq/PayrollExportDialog";
import { LastUpdated } from "@/components/hq/LastUpdated";
import { staffCrossLocationPerformance } from "@/data/hq-analytics";
import { getRatingDivergence } from "@/lib/hq/staff-performance";

type Shift = {
  locationId: string;
  date: string;
  start: string;
  end: string;
  /** True for a temporary cross-location dispatch (vs. a regular shift). */
  dispatched?: boolean;
};

type StaffDispatch = {
  id: string;
  staffId: string;
  staffName: string;
  fromLocationId: string;
  toLocationId: string;
  date: string;
  start: string;
  end: string;
  createdAt: string;
};

type StaffMember = {
  staffId: string;
  name: string;
  role: string;
  primaryLocation: string;
  primaryLocationName: string;
  assignedLocations: string[];
  hoursThisWeek: number;
  utilizationRate: number;
  upcomingShifts: Shift[];
};

interface Props {
  staff: StaffMember[];
  locations: Location[];
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const WEEKDAY_HOURS_KEYS: (keyof LocationWeeklyHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getDayIndex(iso: string): number {
  // 0=Mon ... 6=Sun
  const day = new Date(iso).getUTCDay();
  return (day + 6) % 7;
}

function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function addDaysISO(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function weekdayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}
function hoursForDate(loc: Location, iso: string) {
  return loc.hours[WEEKDAY_HOURS_KEYS[parseISODate(iso).getUTCDay()]];
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Clean single-colour utilisation bar. Colour reflects health (teal ≥70 /
// amber 50–70 / red <50) via utilizationHealth. Hover shows the hours used.
function UtilizationBar({ rate }: { rate: number }) {
  const health = utilizationHealth(rate);
  const width = Math.max(0, Math.min(100, rate));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="progressbar"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Used ${rate}% of available hours this period`}
          className="bg-muted h-1.5 w-full cursor-default overflow-hidden rounded-full"
        >
          <div
            className={cn("h-full rounded-full transition-all", health.bar)}
            style={{ width: `${width}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Used {rate}% of available hours this period.
      </TooltipContent>
    </Tooltip>
  );
}

export function StaffPoolClient({ staff: initialStaff, locations }: Props) {
  const [members, setMembers] = useState(initialStaff);
  const [managing, setManaging] = useState<StaffMember | null>(null);
  const [dispatching, setDispatching] = useState<StaffMember | null>(null);
  const [dispatches, setDispatches] = useState<StaffDispatch[]>([]);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-location performance (ratings, completion, revenue) keyed by staffId.
  const perfById = useMemo(
    () => new Map(staffCrossLocationPerformance.map((p) => [p.staffId, p])),
    [],
  );
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [view, setView] = useState<"cards" | "schedule" | "coverage">("cards");

  const getLocation = (id: string) => locations.find((l) => l.id === id);

  const isShared = (m: StaffMember) => m.assignedLocations.length > 1;

  const filtered = useMemo(
    () =>
      members.filter((s) => {
        const matchesSearch =
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.role.toLowerCase().includes(search.toLowerCase());
        const matchesLoc =
          locationFilter === "all" ||
          (locationFilter === "shared" && isShared(s)) ||
          s.assignedLocations.includes(locationFilter);
        return matchesSearch && matchesLoc;
      }),
    [members, search, locationFilter],
  );

  const sharedCount = members.filter(isShared).length;
  const avgUtilization = Math.round(
    members.reduce((sum, m) => sum + m.utilizationRate, 0) /
      Math.max(members.length, 1),
  );

  // ── Cross-location shift model (reused for conflicts + coverage) ──
  const allShifts = useMemo<CrossLocationShift[]>(
    () =>
      members.flatMap((m) =>
        m.upcomingShifts.map((s, i) => ({
          id: `${m.staffId}-${i}`,
          staffId: m.staffId,
          locationId: s.locationId,
          date: s.date,
          start: s.start,
          end: s.end,
        })),
      ),
    [members],
  );

  // Shifts flagged by cross-location conflict detection (schedule-conflicts.ts).
  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    for (const sh of allShifts) {
      if (findShiftConflicts(sh, allShifts, sh.id).length > 0) set.add(sh.id);
    }
    return set;
  }, [allShifts]);

  // Schedule week-view: every filtered member's shifts bucketed by weekday.
  const shiftsByWeekday = useMemo(() => {
    const byDay: {
      id: string;
      staffName: string;
      role: string;
      locationId: string;
      start: string;
      end: string;
      dispatched: boolean;
    }[][] = [[], [], [], [], [], [], []];
    filtered.forEach((m) =>
      m.upcomingShifts.forEach((s, i) =>
        byDay[getDayIndex(s.date)].push({
          id: `${m.staffId}-${i}`,
          staffName: m.name,
          role: m.role,
          locationId: s.locationId,
          start: s.start,
          end: s.end,
          dispatched: s.dispatched ?? false,
        }),
      ),
    );
    byDay.forEach((a) => a.sort((x, y) => x.start.localeCompare(y.start)));
    return byDay;
  }, [filtered]);

  // Coverage: staffing gaps over the next 14 days from the pool's earliest shift.
  const referenceToday = useMemo(() => {
    const dates = members
      .flatMap((m) => m.upcomingShifts.map((s) => s.date))
      .sort();
    return dates[0] ?? "2026-04-25";
  }, [members]);

  const { coverageRows, gaps } = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) =>
      addDaysISO(referenceToday, i),
    );
    const rows = days.map((date) => ({
      date,
      cells: locations.map((loc) => {
        const h = hoursForDate(loc, date);
        const open = !h.closed;
        const scheduled = members.reduce(
          (n, m) =>
            n +
            m.upcomingShifts.filter(
              (s) => s.date === date && s.locationId === loc.id,
            ).length,
          0,
        );
        const required = loc.isPrimary ? 2 : 1;
        const status: "closed" | "zero" | "insufficient" | "ok" = !open
          ? "closed"
          : scheduled === 0
            ? "zero"
            : scheduled < required
              ? "insufficient"
              : "ok";
        return {
          loc,
          scheduled,
          required,
          status,
          window: open ? `${h.open}–${h.close}` : "",
        };
      }),
    }));
    const gapList = rows.flatMap((r) =>
      r.cells
        .filter((c) => c.status === "zero" || c.status === "insufficient")
        .map((c) => ({
          date: r.date,
          locationId: c.loc.id,
          locationName: c.loc.name,
          shortCode: c.loc.shortCode,
          scheduled: c.scheduled,
          required: c.required,
          window: c.window,
        })),
    );
    return { coverageRows: rows, gaps: gapList };
  }, [referenceToday, locations, members]);

  // Urgent: open days in the next 7 with a location left with no staff at all.
  const urgentGapCount = useMemo(
    () =>
      coverageRows
        .slice(0, 7)
        .reduce(
          (n, r) => n + r.cells.filter((c) => c.status === "zero").length,
          0,
        ),
    [coverageRows],
  );

  const coverageRef = useRef<HTMLDivElement>(null);
  const goToCoverage = () => {
    setView("coverage");
    coverageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
              <Link
                href="/facility/hq/overview"
                className="hover:text-foreground transition-colors"
              >
                HQ
              </Link>
              <ChevronRight className="size-3" />
              <span>Staff Pool</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Shared Staff Pool
            </h1>
            <p className="text-muted-foreground text-sm">
              Cross-location scheduling · {members.length} active members ·
              Conflict detection on
              {dispatches.length > 0 &&
                ` · ${dispatches.length} active dispatch${dispatches.length === 1 ? "" : "es"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LastUpdated label="Last updated" className="mr-1" />
          {urgentGapCount > 0 && (
            <button
              type="button"
              onClick={goToCoverage}
              aria-label={`${urgentGapCount} coverage gaps in the next 7 days`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
            >
              <AlertTriangle className="size-3.5" />
              {urgentGapCount} coverage gap{urgentGapCount === 1 ? "" : "s"}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setPayrollOpen(true)}
          >
            <FileSpreadsheet className="size-3.5" />
            Payroll CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.success("Staff report exported")}
          >
            <Download className="size-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Add staff to pool — coming soon")}
          >
            <Plus className="size-3.5" />
            Add to Pool
          </Button>
        </div>
      </div>

      {/* Stat banner */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="relative py-4">
            <div className="absolute inset-0 bg-linear-to-br from-sky-500/10 to-sky-500/0 opacity-70" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Total Pool
                </p>
                <p className="mt-1 text-2xl font-bold">{members.length}</p>
                <p className="text-muted-foreground text-[11px]">
                  across {locations.length} locations
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15">
                <Users className="size-4.5 text-sky-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="relative py-4">
            <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 to-violet-500/0 opacity-70" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Cross-Location
                </p>
                <p className="mt-1 text-2xl font-bold">{sharedCount}</p>
                <p className="text-muted-foreground text-[11px]">
                  {((sharedCount / members.length) * 100).toFixed(0)}% of pool
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15">
                <Network className="size-4.5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="relative py-4">
            <div
              className={cn(
                "absolute inset-0 bg-linear-to-br opacity-70",
                styleFromKey(utilizationKey(avgUtilization)).gradFrom,
                styleFromKey(utilizationKey(avgUtilization)).gradTo,
              )}
            />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Avg Utilization
                </p>
                <p className="mt-1 text-2xl font-bold">{avgUtilization}%</p>
                <div className="mt-1.5">
                  <UtilizationBar rate={avgUtilization} />
                </div>
              </div>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  styleFromKey(utilizationKey(avgUtilization)).bgSoft,
                )}
              >
                <Clock
                  className={cn(
                    "size-4.5",
                    styleFromKey(utilizationKey(avgUtilization)).text,
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "overflow-hidden",
            gaps.length > 0 && "border-amber-300/60 dark:border-amber-900/40",
          )}
        >
          <CardContent className="relative py-4">
            <div
              className={cn(
                "absolute inset-0 bg-linear-to-br opacity-70",
                gaps.length > 0
                  ? "from-amber-500/10 to-amber-500/0"
                  : "from-emerald-500/10 to-emerald-500/0",
              )}
            />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Coverage Gaps
                </p>
                <p className="mt-1 text-2xl font-bold">{gaps.length}</p>
                <p className="text-muted-foreground text-[11px]">
                  {gaps.length === 0 ? "Fully covered" : "gaps · next 14 days"}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  gaps.length > 0 ? "bg-amber-500/15" : "bg-emerald-500/15",
                )}
              >
                {gaps.length > 0 ? (
                  <AlertTriangle className="size-4.5 text-amber-500" />
                ) : (
                  <Shield className="size-4.5 text-emerald-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View switcher + filters */}
      <Card ref={coverageRef}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
            {(
              [
                { v: "cards", label: "Members", icon: Users },
                { v: "schedule", label: "Schedule", icon: CalendarDays },
                { v: "coverage", label: "Coverage", icon: Sparkles },
              ] as const
            ).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setView(opt.v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  view === opt.v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <opt.icon className="size-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search staff or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 pl-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setLocationFilter("all")}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  locationFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                All
              </button>
              <button
                onClick={() => setLocationFilter("shared")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  locationFilter === "shared"
                    ? "bg-violet-500 text-white"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <Network className="size-3" />
                Shared
              </button>
              {locations.map((loc) => {
                const s = locationStyles(loc);
                const active = locationFilter === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setLocationFilter(loc.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                      active
                        ? cn(s.bg, "text-white")
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {loc.shortCode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CARDS VIEW ── */}
        {view === "cards" && (
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((member) => {
                const primaryLoc = getLocation(member.primaryLocation);
                const primaryS = primaryLoc
                  ? locationStyles(primaryLoc)
                  : styleFromKey("sky");
                const utilHealth = utilizationHealth(member.utilizationRate);
                const shared = isShared(member);
                return (
                  <Card
                    key={member.staffId}
                    className={cn(
                      "overflow-hidden transition-all duration-200 hover:shadow-md",
                      shared &&
                        "ring-1 ring-violet-300/50 dark:ring-violet-900/40",
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm",
                              primaryS.bg,
                            )}
                          >
                            {initialsOf(member.name)}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-sm font-semibold">
                              {member.name}
                            </CardTitle>
                            <p className="text-muted-foreground text-[11px]">
                              {member.role}
                            </p>
                          </div>
                        </div>
                        {shared ? (
                          <Badge className="gap-1 bg-violet-500/15 text-[10px] font-semibold text-violet-700 hover:bg-violet-500/15 dark:text-violet-300">
                            <Network className="size-2.5" />
                            {member.assignedLocations.length} locations
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", primaryS.text)}
                          >
                            {primaryLoc?.shortCode ?? "—"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {member.assignedLocations.map((locId) => {
                          const loc = getLocation(locId);
                          if (!loc) return null;
                          const s = locationStyles(loc);
                          const isPrimary = locId === member.primaryLocation;
                          return (
                            <span
                              key={locId}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                isPrimary
                                  ? cn(s.bg, "text-white")
                                  : cn(s.badge),
                              )}
                            >
                              <MapPin className="size-2.5" />
                              {loc.shortCode}
                              {isPrimary && (
                                <CheckCircle2 className="size-2.5 opacity-90" />
                              )}
                            </span>
                          );
                        })}
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">
                            <Clock className="mr-1 inline-block size-3" />
                            {member.hoursThisWeek}h this week
                          </span>
                          <span
                            className={cn("font-semibold", utilHealth.text)}
                          >
                            {member.utilizationRate}% utilization
                          </span>
                        </div>
                        <UtilizationBar rate={member.utilizationRate} />
                      </div>

                      <div>
                        <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                          Upcoming shifts
                        </p>
                        {member.upcomingShifts.length === 0 ? (
                          <p className="text-muted-foreground text-[11px]">
                            No upcoming shifts
                          </p>
                        ) : (
                          (() => {
                            const allShifts: CrossLocationShift[] =
                              member.upcomingShifts.map((s, i) => ({
                                id: `${member.staffId}-${i}`,
                                staffId: member.staffId,
                                locationId: s.locationId,
                                date: s.date,
                                start: s.start,
                                end: s.end,
                              }));
                            return (
                              <div className="space-y-1">
                                {member.upcomingShifts
                                  .slice(0, 3)
                                  .map((shift, i) => {
                                    const shiftLoc = getLocation(
                                      shift.locationId,
                                    );
                                    const sS = shiftLoc
                                      ? locationStyles(shiftLoc)
                                      : styleFromKey("sky");
                                    const conflicts = findShiftConflicts(
                                      allShifts[i],
                                      allShifts,
                                    );
                                    const hasConflict = conflicts.length > 0;
                                    return (
                                      <div
                                        key={i}
                                        className={cn(
                                          "flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5",
                                          hasConflict
                                            ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                                            : `${sS.borderSoft} ${sS.bgSofter}`,
                                        )}
                                        title={
                                          hasConflict
                                            ? `Conflict ${formatConflictWindow(conflicts[0])} with ${getLocation(conflicts[0].conflictingShift.locationId)?.shortCode ?? "?"}`
                                            : undefined
                                        }
                                      >
                                        <div
                                          className={cn(
                                            "size-1.5 shrink-0 rounded-full",
                                            sS.bg,
                                          )}
                                        />
                                        <span className="text-[11px] font-medium">
                                          {shift.date}
                                        </span>
                                        <span className="text-muted-foreground text-[11px]">
                                          {shift.start}–{shift.end}
                                        </span>
                                        {hasConflict && (
                                          <AlertTriangle className="size-3 shrink-0 text-red-600" />
                                        )}
                                        <span
                                          className={cn(
                                            "ml-auto text-[10px] font-semibold",
                                            hasConflict
                                              ? "text-red-700"
                                              : sS.text,
                                          )}
                                        >
                                          {shiftLoc?.shortCode}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            );
                          })()
                        )}
                      </div>

                      {shared && (
                        <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                          <CheckCircle2 className="size-3 shrink-0" />
                          Conflict detection active across{" "}
                          {member.assignedLocations.length} locations
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => setManaging(member)}
                        >
                          <MapPin className="size-3.5" />
                          Manage
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => setDispatching(member)}
                        >
                          <ArrowLeftRight className="size-3.5" />
                          Send
                        </Button>
                      </div>

                      {/* Cross-location performance (inline, expandable) */}
                      {(() => {
                        const perf = perfById.get(member.staffId);
                        const isOpen = expandedId === member.staffId;
                        return (
                          <div className="border-t pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(isOpen ? null : member.staffId)
                              }
                              aria-expanded={isOpen}
                              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-[11px] font-medium"
                            >
                              Performance by location
                              <ChevronDown
                                className={cn(
                                  "size-3.5 transition-transform",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </button>
                            {isOpen && (
                              <div className="mt-2 space-y-1.5">
                                {!perf ? (
                                  <p className="text-muted-foreground text-[11px]">
                                    No cross-location performance data for this
                                    member.
                                  </p>
                                ) : (
                                  <>
                                    {(() => {
                                      const div = getRatingDivergence(
                                        perf,
                                        locations,
                                      );
                                      return div ? (
                                        <div className="flex items-start gap-1.5 rounded-md border border-amber-300/60 bg-amber-50/50 px-2 py-1.5 text-[10px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                                          <AlertTriangle className="mt-px size-3 shrink-0 text-amber-500" />
                                          <span>
                                            Rating gap:{" "}
                                            <strong>
                                              {div.bestLocation?.shortCode}{" "}
                                              {div.bestRating.toFixed(1)}★
                                            </strong>{" "}
                                            vs{" "}
                                            <strong>
                                              {div.worstLocation?.shortCode}{" "}
                                              {div.worstRating.toFixed(1)}★
                                            </strong>{" "}
                                            — worth a look.
                                          </span>
                                        </div>
                                      ) : null;
                                    })()}
                                    {perf.locations.map((lp) => {
                                      const loc = getLocation(lp.locationId);
                                      const ls = loc
                                        ? locationStyles(loc)
                                        : styleFromKey("sky");
                                      return (
                                        <div
                                          key={lp.locationId}
                                          className="rounded-md border p-2"
                                        >
                                          <div className="mb-1 flex items-center gap-1.5">
                                            <span
                                              className={cn(
                                                "flex size-5 items-center justify-center rounded-sm text-[9px] font-bold text-white",
                                                ls.bg,
                                              )}
                                            >
                                              {loc?.shortCode ?? "?"}
                                            </span>
                                            <span className="truncate text-[11px] font-medium">
                                              {loc?.name ?? lp.locationId}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-1 text-[10px]">
                                            <div>
                                              <p className="text-muted-foreground flex items-center gap-0.5">
                                                <Star className="size-2.5 fill-amber-500 text-amber-500" />
                                                Rating
                                              </p>
                                              <p className="font-semibold tabular-nums">
                                                {lp.avgRating.toFixed(1)}★
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">
                                                Completion
                                              </p>
                                              <p className="font-semibold tabular-nums">
                                                {lp.completionRate}%
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground flex items-center gap-0.5">
                                                <TrendingUp className="size-2.5 text-emerald-500" />
                                                Revenue
                                              </p>
                                              <p className="font-semibold tabular-nums">
                                                $
                                                {lp.revenueGenerated.toLocaleString()}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Users className="text-muted-foreground/40 mx-auto mb-3 size-10" />
                  <p className="text-muted-foreground text-sm">
                    No staff match your filters
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}

        {/* ── SCHEDULE VIEW — week calendar, whole pool, by location colour ── */}
        {view === "schedule" && (
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <div className="grid min-w-[900px] grid-cols-7 gap-2">
                {WEEK_DAYS.map((day, idx) => {
                  const dayShifts = shiftsByWeekday[idx];
                  return (
                    <div
                      key={day}
                      className="overflow-hidden rounded-lg border"
                    >
                      <div className="bg-muted/40 flex items-center justify-between px-2 py-1.5">
                        <span className="text-[11px] font-semibold tracking-wider uppercase">
                          {day}
                        </span>
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {dayShifts.length}
                        </span>
                      </div>
                      <div className="min-h-[130px] space-y-1.5 p-1.5">
                        {dayShifts.length === 0 ? (
                          <p className="text-muted-foreground/60 pt-8 text-center text-[10px]">
                            No shifts
                          </p>
                        ) : (
                          dayShifts.map((sh) => {
                            const loc = getLocation(sh.locationId);
                            const s = loc
                              ? locationStyles(loc)
                              : styleFromKey("sky");
                            const conflict = conflictIds.has(sh.id);
                            return (
                              <div
                                key={sh.id}
                                className={cn(
                                  "rounded-md border-l-2 px-1.5 py-1",
                                  conflict
                                    ? "border-red-500 bg-red-500/10"
                                    : cn(s.borderSoft, s.bgSofter),
                                  sh.dispatched && "border-dashed",
                                )}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold",
                                      conflict
                                        ? "text-red-600 dark:text-red-400"
                                        : s.text,
                                    )}
                                  >
                                    {loc?.shortCode ?? "?"}
                                  </span>
                                  <span className="flex items-center gap-0.5">
                                    {sh.dispatched && (
                                      <span className="rounded-sm bg-amber-500/15 px-1 text-[8px] font-bold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                                        Temp
                                      </span>
                                    )}
                                    {conflict && (
                                      <AlertTriangle className="size-3 text-red-500" />
                                    )}
                                  </span>
                                </div>
                                <p className="truncate text-[11px] font-medium">
                                  {sh.staffName}
                                </p>
                                <p className="text-muted-foreground text-[10px] tabular-nums">
                                  {sh.start}–{sh.end}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-[11px]">
              <span className="font-semibold">Legend:</span>
              {locations.map((loc) => {
                const s = locationStyles(loc);
                return (
                  <span
                    key={loc.id}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span className={cn("size-2.5 rounded-sm", s.bg)} />
                    {loc.shortCode} ·{" "}
                    {loc.name.split("–")[1]?.trim() ?? loc.name}
                  </span>
                );
              })}
              {conflictIds.size > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-3" /> Shift conflict
                </span>
              )}
            </div>
          </CardContent>
        )}

        {/* ── COVERAGE VIEW — staffing gaps over the next 14 days ── */}
        {view === "coverage" && (
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold">
                Staffing coverage · next 14 days
              </p>
              <p className="text-muted-foreground text-xs">
                Scheduled / required staff per open day. Red = no staff, amber =
                understaffed, — = closed.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="bg-muted/30 text-muted-foreground rounded-tl-lg border px-3 py-2 text-left text-[10px] font-semibold tracking-wider uppercase">
                      Date
                    </th>
                    {locations.map((loc) => {
                      const s = locationStyles(loc);
                      return (
                        <th
                          key={loc.id}
                          className="bg-muted/30 border px-3 py-2 text-center text-[10px] font-semibold tracking-wider uppercase"
                        >
                          <span
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded-md text-[10px] text-white",
                              s.bg,
                            )}
                          >
                            {loc.shortCode}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {coverageRows.map((row) => (
                    <tr key={row.date}>
                      <td className="border px-3 py-2 text-xs font-medium whitespace-nowrap">
                        {weekdayShort(row.date)} {formatShortDate(row.date)}
                      </td>
                      {row.cells.map((c) => (
                        <td
                          key={c.loc.id}
                          className={cn(
                            "border px-3 py-2 text-center text-xs font-bold tabular-nums",
                            c.status === "closed" &&
                              "text-muted-foreground/50 bg-muted/20",
                            c.status === "zero" &&
                              "bg-red-500/10 text-red-600 dark:text-red-400",
                            c.status === "insufficient" &&
                              "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            c.status === "ok" &&
                              "text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {c.status === "closed"
                            ? "—"
                            : `${c.scheduled}/${c.required}`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {gaps.length > 0 ? (
              <Card className="border-amber-300/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 text-amber-500" />
                    Coverage gaps detected ({gaps.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Open days in the next 14 days where a location is unstaffed
                    or understaffed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                    {gaps.map((g, i) => {
                      const loc = getLocation(g.locationId);
                      const s = loc ? locationStyles(loc) : styleFromKey("sky");
                      const zero = g.scheduled === 0;
                      return (
                        <li
                          key={`${g.date}-${g.locationId}-${i}`}
                          className="bg-background flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                        >
                          <span className={cn("size-2 rounded-full", s.bg)} />
                          <span className="font-semibold whitespace-nowrap">
                            {weekdayShort(g.date)} {formatShortDate(g.date)}
                          </span>
                          <span className={cn("font-semibold", s.text)}>
                            {g.locationName}
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-px text-[10px] font-semibold tabular-nums",
                              zero
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            )}
                          >
                            {g.scheduled}/{g.required} staff
                          </span>
                          {g.window && (
                            <span className="text-muted-foreground tabular-nums">
                              {g.window}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 gap-1 text-[11px]"
                            onClick={() =>
                              toast.info(
                                `Assigning staff to ${g.locationName} on ${weekdayShort(g.date)} ${formatShortDate(g.date)}`,
                              )
                            }
                          >
                            Assign staff <ChevronRight className="size-3" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <CardContent className="flex items-center gap-3 py-4">
                  <Shield className="size-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold">
                      Fully staffed for the next 14 days
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Every open day meets its required staffing level.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        )}
      </Card>

      <Card className="border-amber-200/60 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10">
        <CardContent className="flex items-start gap-3 py-4">
          <Filter className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium">
              Cross-Location Conflict Detection
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Staff assigned to multiple locations are automatically checked for
              overlapping shifts. Configure detection sensitivity in{" "}
              <Link href="/facility/hq/settings" className="underline">
                HQ Settings
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {managing && (
        <ManageLocationsDialog
          key={managing.staffId}
          member={managing}
          locations={locations}
          onOpenChange={(o) => {
            if (!o) setManaging(null);
          }}
          onSave={(assignedLocations, primaryLocationId) => {
            const target = managing;
            setMembers((prev) =>
              prev.map((m) =>
                m.staffId === target.staffId
                  ? {
                      ...m,
                      assignedLocations,
                      primaryLocation: primaryLocationId,
                      primaryLocationName:
                        locations.find((l) => l.id === primaryLocationId)
                          ?.name ?? m.primaryLocationName,
                    }
                  : m,
              ),
            );
            setManaging(null);
            toast.success(`${target.name}'s locations updated`);
          }}
        />
      )}

      {dispatching && (
        <SendToLocationDialog
          key={dispatching.staffId}
          member={dispatching}
          locations={locations}
          onOpenChange={(o) => {
            if (!o) setDispatching(null);
          }}
          onSend={(payload: DispatchPayload) => {
            const target = dispatching;
            const toName =
              locations.find((l) => l.id === payload.toLocationId)?.name ??
              payload.toLocationId;
            // Transfer record for the dispatch.
            setDispatches((prev) => [
              {
                id: `disp-${target.staffId}-${Date.now()}`,
                staffId: target.staffId,
                staffName: target.name,
                fromLocationId: target.primaryLocation,
                toLocationId: payload.toLocationId,
                date: payload.date,
                start: payload.start,
                end: payload.end,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
            // Add the temporary shift so it shows on the Schedule tab.
            setMembers((prev) =>
              prev.map((m) =>
                m.staffId === target.staffId
                  ? {
                      ...m,
                      upcomingShifts: [
                        ...m.upcomingShifts,
                        {
                          locationId: payload.toLocationId,
                          date: payload.date,
                          start: payload.start,
                          end: payload.end,
                          dispatched: true,
                        },
                      ],
                    }
                  : m,
              ),
            );
            setDispatching(null);
            toast.success(
              `${target.name} dispatched to ${toName} on ${payload.date}`,
            );
          }}
        />
      )}

      {payrollOpen && (
        <PayrollExportDialog
          members={members}
          locations={locations}
          onOpenChange={(o) => {
            if (!o) setPayrollOpen(false);
          }}
        />
      )}
    </div>
  );
}
