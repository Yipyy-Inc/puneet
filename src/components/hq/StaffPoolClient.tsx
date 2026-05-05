"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Download,
  CheckCircle2,
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
import { toast } from "sonner";
import type { Location } from "@/types/location";
import {
  locationStyles,
  utilizationKey,
  styleFromKey,
} from "@/lib/hq/location-styles";
import { MetricBar } from "@/components/hq/charts/MetricBar";
import {
  findShiftConflicts,
  formatConflictWindow,
  type CrossLocationShift,
} from "@/lib/hq/schedule-conflicts";

type Shift = { locationId: string; date: string; start: string; end: string };

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

const ROLES = ["Manager", "Groomer", "Trainer", "Kennel Tech", "Front Desk"] as const;

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getDayIndex(iso: string): number {
  // 0=Mon ... 6=Sun
  const day = new Date(iso).getUTCDay();
  return (day + 6) % 7;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function StaffPoolClient({ staff, locations }: Props) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [view, setView] = useState<"cards" | "schedule" | "coverage">("cards");

  const getLocation = (id: string) => locations.find((l) => l.id === id);

  const isShared = (m: StaffMember) => m.assignedLocations.length > 1;

  const filtered = useMemo(
    () =>
      staff.filter((s) => {
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
    [staff, search, locationFilter],
  );

  const sharedCount = staff.filter(isShared).length;
  const avgUtilization = Math.round(
    staff.reduce((sum, m) => sum + m.utilizationRate, 0) / Math.max(staff.length, 1),
  );

  // Coverage matrix: roles x locations
  const coverage = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    ROLES.forEach((role) => {
      matrix[role] = {};
      locations.forEach((l) => (matrix[role][l.id] = 0));
    });
    staff.forEach((m) => {
      const role = ROLES.find((r) => r.toLowerCase() === m.role.toLowerCase()) ?? m.role;
      m.assignedLocations.forEach((locId) => {
        if (!matrix[role]) matrix[role] = {};
        matrix[role][locId] = (matrix[role][locId] ?? 0) + 1;
      });
    });
    return matrix;
  }, [staff, locations]);

  // Find coverage gaps (zero coverage where service is offered)
  const gaps = useMemo(() => {
    const out: { role: string; locationId: string; locationName: string }[] = [];
    locations.forEach((loc) => {
      ROLES.forEach((role) => {
        const count = coverage[role]?.[loc.id] ?? 0;
        // Skip role if location doesn't offer the related service
        if (role === "Groomer" && !loc.services.includes("grooming")) return;
        if (role === "Trainer" && !loc.services.includes("training")) return;
        if (count === 0) {
          out.push({ role, locationId: loc.id, locationName: loc.name });
        }
      });
    });
    return out;
  }, [coverage, locations]);

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
              <Link href="/facility/hq/overview" className="hover:text-foreground transition-colors">
                HQ
              </Link>
              <ChevronRight className="size-3" />
              <span>Staff Pool</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Shared Staff Pool</h1>
            <p className="text-muted-foreground text-sm">
              Cross-location scheduling · {staff.length} active members · Conflict detection on
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <CardContent className="relative pt-4 pb-4">
            <div className="absolute inset-0 bg-linear-to-br from-sky-500/10 to-sky-500/0 opacity-70" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Total Pool
                </p>
                <p className="mt-1 text-2xl font-bold">{staff.length}</p>
                <p className="text-muted-foreground text-[11px]">across {locations.length} locations</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15">
                <Users className="size-4.5 text-sky-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="relative pt-4 pb-4">
            <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 to-violet-500/0 opacity-70" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Cross-Location
                </p>
                <p className="mt-1 text-2xl font-bold">{sharedCount}</p>
                <p className="text-muted-foreground text-[11px]">
                  {((sharedCount / staff.length) * 100).toFixed(0)}% of pool
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15">
                <Network className="size-4.5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="relative pt-4 pb-4">
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
                <MetricBar
                  percent={avgUtilization}
                  fillClassName={styleFromKey(utilizationKey(avgUtilization)).bg}
                  size="xs"
                  className="mt-1.5"
                />
              </div>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  styleFromKey(utilizationKey(avgUtilization)).bgSoft,
                )}
              >
                <Clock className={cn("size-4.5", styleFromKey(utilizationKey(avgUtilization)).text)} />
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
          <CardContent className="relative pt-4 pb-4">
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
                  {gaps.length === 0 ? "Fully covered" : "roles need attention"}
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
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
            {([
              { v: "cards", label: "Members", icon: Users },
              { v: "schedule", label: "Schedule", icon: CalendarDays },
              { v: "coverage", label: "Coverage", icon: Sparkles },
            ] as const).map((opt) => (
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
                const primaryS = primaryLoc ? locationStyles(primaryLoc) : styleFromKey("sky");
                const utilS = styleFromKey(utilizationKey(member.utilizationRate));
                const shared = isShared(member);
                return (
                  <Card
                    key={member.staffId}
                    className={cn(
                      "overflow-hidden transition-all duration-200 hover:shadow-md",
                      shared && "ring-1 ring-violet-300/50 dark:ring-violet-900/40",
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
                            <CardTitle className="text-sm font-semibold truncate">
                              {member.name}
                            </CardTitle>
                            <p className="text-muted-foreground text-[11px]">{member.role}</p>
                          </div>
                        </div>
                        {shared ? (
                          <Badge className="gap-1 bg-violet-500/15 text-[10px] font-semibold text-violet-700 hover:bg-violet-500/15 dark:text-violet-300">
                            <Network className="size-2.5" />
                            {member.assignedLocations.length} locations
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={cn("text-[10px]", primaryS.text)}>
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
                                isPrimary ? cn(s.bg, "text-white") : cn(s.badge),
                              )}
                            >
                              <MapPin className="size-2.5" />
                              {loc.shortCode}
                              {isPrimary && <CheckCircle2 className="size-2.5 opacity-90" />}
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
                          <span className={cn("font-semibold", utilS.text)}>
                            {member.utilizationRate}% utilization
                          </span>
                        </div>
                        <MetricBar
                          percent={member.utilizationRate}
                          fillClassName={utilS.bg}
                          size="xs"
                        />
                      </div>

                      <div>
                        <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                          Upcoming shifts
                        </p>
                        {member.upcomingShifts.length === 0 ? (
                          <p className="text-muted-foreground text-[11px]">No upcoming shifts</p>
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
                                {member.upcomingShifts.slice(0, 3).map((shift, i) => {
                                  const shiftLoc = getLocation(shift.locationId);
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
                                          hasConflict ? "text-red-700" : sS.text,
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
                          Conflict detection active across {member.assignedLocations.length} locations
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-full gap-1.5 text-xs"
                        onClick={() => toast.info(`Managing ${member.name}'s locations`)}
                      >
                        Manage Locations
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Users className="text-muted-foreground/40 mx-auto mb-3 size-10" />
                  <p className="text-muted-foreground text-sm">No staff match your filters</p>
                </div>
              )}
            </div>
          </CardContent>
        )}

        {/* ── SCHEDULE VIEW ── */}
        {view === "schedule" && (
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-lg border bg-border">
                  <div className="bg-muted/40 px-3 py-2 text-[10px] font-semibold tracking-wider uppercase">
                    Staff member
                  </div>
                  {WEEK_DAYS.map((d) => (
                    <div
                      key={d}
                      className="bg-muted/40 px-2 py-2 text-center text-[10px] font-semibold tracking-wider uppercase"
                    >
                      {d}
                    </div>
                  ))}

                  {filtered.map((member) => {
                    const primaryLoc = getLocation(member.primaryLocation);
                    const primaryS = primaryLoc ? locationStyles(primaryLoc) : styleFromKey("sky");
                    return (
                      <Row
                        key={member.staffId}
                        member={member}
                        getLocation={getLocation}
                        primaryS={primaryS}
                      />
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="bg-background col-span-8 px-4 py-12 text-center">
                      <Users className="text-muted-foreground/40 mx-auto mb-3 size-10" />
                      <p className="text-muted-foreground text-sm">No staff match your filters</p>
                    </div>
                  )}
                </div>

                <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="font-semibold">Legend:</span>
                  {locations.map((loc) => {
                    const s = locationStyles(loc);
                    return (
                      <span key={loc.id} className="inline-flex items-center gap-1.5">
                        <span className={cn("size-2.5 rounded-sm", s.bg)} />
                        {loc.shortCode} · {loc.name.split("–")[1]?.trim() ?? loc.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {/* ── COVERAGE VIEW ── */}
        {view === "coverage" && (
          <CardContent className="space-y-4 p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-muted/30 text-muted-foreground rounded-tl-lg border px-3 py-2 text-left text-[10px] font-semibold tracking-wider uppercase">
                      Role / Location
                    </th>
                    {locations.map((loc) => {
                      const s = locationStyles(loc);
                      return (
                        <th
                          key={loc.id}
                          className="bg-muted/30 border px-3 py-2 text-center text-[10px] font-semibold tracking-wider uppercase"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={cn(
                                "flex size-6 items-center justify-center rounded-md text-[10px] text-white",
                                s.bg,
                              )}
                            >
                              {loc.shortCode}
                            </span>
                            <span className={cn("text-[10px]", s.text)}>
                              {loc.name.split("–")[1]?.trim() ?? loc.name}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="bg-muted/30 text-muted-foreground rounded-tr-lg border px-3 py-2 text-center text-[10px] font-semibold tracking-wider uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => {
                    const total = locations.reduce(
                      (sum, l) => sum + (coverage[role]?.[l.id] ?? 0),
                      0,
                    );
                    return (
                      <tr key={role}>
                        <td className="border px-3 py-2.5 text-xs font-semibold">{role}</td>
                        {locations.map((loc) => {
                          const count = coverage[role]?.[loc.id] ?? 0;
                          const offered =
                            (role === "Groomer" && !loc.services.includes("grooming")) ||
                            (role === "Trainer" && !loc.services.includes("training"))
                              ? false
                              : true;
                          return (
                            <td
                              key={loc.id}
                              className={cn(
                                "border px-3 py-2.5 text-center text-sm font-bold tabular-nums",
                                !offered &&
                                  "text-muted-foreground/60 bg-muted/20",
                                offered && count === 0 &&
                                  "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                                offered && count > 0 && "text-foreground",
                              )}
                            >
                              {!offered ? "—" : count === 0 ? (
                                <AlertTriangle className="mx-auto size-3.5 text-amber-500" />
                              ) : (
                                count
                              )}
                            </td>
                          );
                        })}
                        <td className="border px-3 py-2.5 text-center text-sm font-bold tabular-nums">
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {gaps.length > 0 ? (
              <Card className="border-amber-300/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 text-amber-500" />
                    Coverage gaps detected
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These role/location pairs offer the service but currently have no assigned staff.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {gaps.map((g, i) => {
                      const loc = getLocation(g.locationId);
                      const s = loc ? locationStyles(loc) : styleFromKey("sky");
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs"
                        >
                          <span className={cn("size-2 rounded-full", s.bg)} />
                          <span className="font-semibold">{g.role}</span>
                          <span className="text-muted-foreground">at</span>
                          <span className={cn("font-semibold", s.text)}>{g.locationName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 gap-1 text-[11px]"
                            onClick={() => toast.info(`Assigning a ${g.role} to ${g.locationName}`)}
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
                <CardContent className="flex items-center gap-3 pt-4 pb-4">
                  <Shield className="size-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold">All roles covered</p>
                    <p className="text-muted-foreground text-xs">
                      Every active service has at least one assigned staff member.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        )}
      </Card>

      <Card className="border-amber-200/60 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <Filter className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium">Cross-Location Conflict Detection</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Staff assigned to multiple locations are automatically checked for overlapping shifts.
              Configure detection sensitivity in{" "}
              <Link href="/facility/hq/settings" className="underline">
                HQ Settings
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  member,
  getLocation,
  primaryS,
}: {
  member: StaffMember;
  getLocation: (id: string) => Location | undefined;
  primaryS: ReturnType<typeof locationStyles>;
}) {
  const cells: React.ReactNode[] = [];
  for (let day = 0; day < 7; day++) {
    const shifts = member.upcomingShifts.filter((s) => getDayIndex(s.date) === day);
    cells.push(
      <div key={day} className="bg-background min-h-[58px] space-y-1 px-1.5 py-1.5">
        {shifts.length === 0 ? (
          <div className="bg-muted/20 h-full rounded-md" />
        ) : (
          shifts.map((shift, i) => {
            const loc = getLocation(shift.locationId);
            const s = loc ? locationStyles(loc) : primaryS;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-md border-l-2 px-1.5 py-1 text-[10px] leading-tight",
                  s.borderSoft,
                  s.bgSofter,
                )}
              >
                <p className={cn("font-semibold", s.text)}>{loc?.shortCode}</p>
                <p className="text-muted-foreground tabular-nums">
                  {shift.start}–{shift.end}
                </p>
              </div>
            );
          })
        )}
      </div>,
    );
  }
  return (
    <>
      <div className="bg-background flex items-center gap-2 px-3 py-2">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white",
            primaryS.bg,
          )}
        >
          {initialsOf(member.name)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{member.name}</p>
          <p className="text-muted-foreground text-[10px]">{member.role}</p>
        </div>
      </div>
      {cells}
    </>
  );
}
