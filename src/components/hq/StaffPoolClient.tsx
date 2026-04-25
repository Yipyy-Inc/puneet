"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Location } from "@/types/location";

type StaffMember = {
  staffId: string;
  name: string;
  role: string;
  primaryLocation: string;
  primaryLocationName: string;
  assignedLocations: string[];
  hoursThisWeek: number;
  utilizationRate: number;
  upcomingShifts: { locationId: string; date: string; start: string; end: string }[];
};

interface Props {
  staff: StaffMember[];
  locations: Location[];
}

function UtilizationBar({ rate, color }: { rate: number; color: string }) {
  const barColor = rate >= 85 ? "#22c55e" : rate >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-foreground text-[10px]">Utilization</span>
        <span
          className={cn(
            "text-[10px] font-semibold",
            rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-500",
          )}
        >
          {rate}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rate}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function StaffPoolClient({ staff, locations }: Props) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const getLocation = (id: string) => locations.find((l) => l.id === id);

  const isSharedStaff = (member: StaffMember) => member.assignedLocations.length > 1;

  const filtered = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase());
    const matchesLoc =
      locationFilter === "all" ||
      (locationFilter === "shared" && isSharedStaff(s)) ||
      s.assignedLocations.includes(locationFilter);
    return matchesSearch && matchesLoc;
  });

  const sharedCount = staff.filter(isSharedStaff).length;
  const avgUtilization = Math.round(staff.reduce((s, m) => s + m.utilizationRate, 0) / staff.length);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shared Staff Pool</h1>
            <p className="text-muted-foreground text-sm">
              Cross-location scheduling · Conflict detection active
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

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10">
                <Users className="size-4.5 text-sky-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Pool</p>
                <p className="text-xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10">
                <MapPin className="size-4.5 text-purple-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cross-Location</p>
                <p className="text-xl font-bold">{sharedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <Clock className="size-4.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Avg Utilization</p>
                <p className="text-xl font-bold">{avgUtilization}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Filter className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setLocationFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
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
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              locationFilter === "shared"
                ? "bg-purple-500 text-white"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            Cross-location
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(loc.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                locationFilter === loc.id
                  ? "text-white"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
              style={locationFilter === loc.id ? { backgroundColor: loc.color } : {}}
            >
              {loc.shortCode}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => {
          const primaryLoc = getLocation(member.primaryLocation);
          const isShared = isSharedStaff(member);
          return (
            <Card
              key={member.staffId}
              className={cn(
                "overflow-hidden transition-all duration-200 hover:shadow-md",
                isShared && "ring-1 ring-purple-200 dark:ring-purple-900/40",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar placeholder */}
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: primaryLoc?.color ?? "#94a3b8" }}
                    >
                      {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{member.name}</CardTitle>
                      <p className="text-muted-foreground text-[11px]">{member.role}</p>
                    </div>
                  </div>
                  {isShared ? (
                    <Badge className="gap-1 bg-purple-100 text-[10px] text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      <MapPin className="size-2.5" />
                      Multi-loc
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {primaryLoc?.shortCode ?? "—"}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Assigned Locations */}
                <div className="flex flex-wrap gap-1.5">
                  {member.assignedLocations.map((locId) => {
                    const loc = getLocation(locId);
                    if (!loc) return null;
                    return (
                      <div
                        key={locId}
                        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: loc.color }}
                      >
                        <MapPin className="size-2.5" />
                        {loc.name.split("–")[1]?.trim() ?? loc.shortCode}
                        {locId === member.primaryLocation && (
                          <CheckCircle2 className="size-2.5 opacity-80" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hours & Utilization */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    <Clock className="mr-1 inline-block size-3" />
                    {member.hoursThisWeek}h this week
                  </span>
                </div>
                <UtilizationBar rate={member.utilizationRate} color={primaryLoc?.color ?? "#94a3b8"} />

                {/* Upcoming Shifts */}
                <div>
                  <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                    Upcoming Shifts
                  </p>
                  {member.upcomingShifts.length === 0 ? (
                    <p className="text-muted-foreground text-[11px]">No upcoming shifts</p>
                  ) : (
                    <div className="space-y-1">
                      {member.upcomingShifts.slice(0, 3).map((shift, i) => {
                        const shiftLoc = getLocation(shift.locationId);
                        return (
                          <div key={i} className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 dark:bg-gray-900/50">
                            <div
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: shiftLoc?.color ?? "#94a3b8" }}
                            />
                            <span className="text-[11px] font-medium">{shift.date}</span>
                            <span className="text-muted-foreground text-[11px]">
                              {shift.start}–{shift.end}
                            </span>
                            <span
                              className="ml-auto text-[10px] font-semibold"
                              style={{ color: shiftLoc?.color }}
                            >
                              {shiftLoc?.shortCode}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Conflict detection */}
                {isShared && (
                  <div className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[10px] text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400">
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

      {/* Conflict detection info */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/10">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <AlertTriangle className="size-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium">Cross-Location Conflict Detection</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Staff assigned to multiple locations are automatically checked for scheduling conflicts.
              Overlapping shifts trigger a warning before confirmation. Configure detection sensitivity
              in{" "}
              <Link href="/facility/hq/settings" className="underline">
                HQ Settings
              </Link>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
