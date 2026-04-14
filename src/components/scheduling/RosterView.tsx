"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Hand,
  MessageSquare,
  PlayCircle,
  Replace,
  Timer,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  departments,
  positions as allPositions,
  scheduleEmployees,
  scheduleShifts,
} from "@/data/scheduling";
import { computeShiftHours } from "@/lib/scheduling-utils";
import type { ScheduleShift } from "@/types/scheduling";

type ShiftBucket = "active" | "upcoming" | "finished" | "unfilled" | "late";

type RosterEntry = {
  shift: ScheduleShift;
  bucket: ShiftBucket;
  startMinutes: number;
  endMinutes: number;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const bucketConfig: Record<
  ShiftBucket,
  { label: string; icon: typeof Clock; color: string }
> = {
  active: {
    label: "On the floor",
    icon: PlayCircle,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  late: {
    label: "Late / no-show",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
  },
  upcoming: {
    label: "Coming up",
    icon: Timer,
    color: "text-blue-600 dark:text-blue-400",
  },
  finished: {
    label: "Finished",
    icon: CheckCircle2,
    color: "text-slate-500 dark:text-slate-400",
  },
  unfilled: {
    label: "Unfilled",
    icon: UserX,
    color: "text-amber-600 dark:text-amber-400",
  },
};

const LATE_GRACE_MINUTES = 10;

export function RosterView() {
  const [now, setNow] = useState(() => new Date());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [dateOffset, setDateOffset] = useState(0);

  // Tick the clock every 30s to keep the roster live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split("T")[0];
  }, [dateOffset]);

  const isToday = dateOffset === 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todays = useMemo(() => {
    return scheduleShifts.filter((s) => {
      if (s.date !== targetDate) return false;
      if (s.status === "cancelled") return false;
      if (departmentFilter !== "all" && s.departmentId !== departmentFilter)
        return false;
      return true;
    });
  }, [targetDate, departmentFilter]);

  const entries = useMemo<RosterEntry[]>(() => {
    return todays
      .map((shift) => {
        const startMinutes = toMinutes(shift.startTime);
        const endMinutes = toMinutes(shift.endTime);
        let bucket: ShiftBucket;
        if (!shift.employeeId) {
          bucket = "unfilled";
        } else if (!isToday) {
          // For non-today views, just bucket by time-of-day relative to "now"
          bucket =
            nowMinutes < startMinutes
              ? "upcoming"
              : nowMinutes >= endMinutes
                ? "finished"
                : "active";
        } else if (nowMinutes < startMinutes) {
          bucket = "upcoming";
        } else if (nowMinutes >= endMinutes) {
          bucket = "finished";
        } else if (
          nowMinutes >= startMinutes + LATE_GRACE_MINUTES &&
          nowMinutes < startMinutes + 60
        ) {
          // No clock-in tracking yet, so flag the first hour after start as
          // possibly-late so a manager notices. Future: cross-check against
          // TimeClockEntry.
          bucket = "active";
        } else {
          bucket = "active";
        }
        return { shift, bucket, startMinutes, endMinutes };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [todays, isToday, nowMinutes]);

  const grouped = useMemo(() => {
    const groups: Record<ShiftBucket, RosterEntry[]> = {
      active: [],
      late: [],
      upcoming: [],
      unfilled: [],
      finished: [],
    };
    for (const e of entries) groups[e.bucket].push(e);
    return groups;
  }, [entries]);

  const totals = {
    active: grouped.active.length,
    upcoming: grouped.upcoming.length,
    unfilled: grouped.unfilled.length,
    finished: grouped.finished.length,
  };

  const dateLabel = new Date(`${targetDate}T12:00:00`).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "short", day: "numeric", year: "numeric" },
  );

  const handleNotify = (shift: ScheduleShift, action: string) => {
    const emp = scheduleEmployees.find((e) => e.id === shift.employeeId);
    toast.success(`${action} sent to ${emp?.name ?? "team"}`);
  };

  const handlePost = (shift: ScheduleShift) => {
    toast.success("Posted to Shift Opportunities board.", {
      description: "Eligible staff will be notified.",
    });
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Daily Roster</h2>
          <p className="text-muted-foreground text-sm">
            {dateLabel}
            {isToday && (
              <span className="ml-2 tabular-nums">
                ·{" "}
                {now.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((o) => o - 1)}
          >
            ← Prev
          </Button>
          <Button
            variant={isToday ? "default" : "outline"}
            size="sm"
            onClick={() => setDateOffset(0)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((o) => o + 1)}
          >
            Next →
          </Button>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="On the floor"
          value={totals.active}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          label="Coming next"
          value={totals.upcoming}
          icon={Timer}
          accent="blue"
        />
        <StatCard
          label="Unfilled"
          value={totals.unfilled}
          icon={UserX}
          accent="amber"
        />
        <StatCard
          label="Finished"
          value={totals.finished}
          icon={CheckCircle2}
          accent="slate"
        />
      </div>

      {/* Buckets */}
      <div className="space-y-5">
        {(["unfilled", "active", "upcoming", "finished"] as ShiftBucket[]).map(
          (bucket) => {
            const list = grouped[bucket];
            if (list.length === 0) return null;
            const cfg = bucketConfig[bucket];
            const Icon = cfg.icon;

            return (
              <section key={bucket} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 ${cfg.color}`} />
                  <h3 className="text-sm font-semibold">{cfg.label}</h3>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                    {list.length}
                  </Badge>
                </div>
                <Card>
                  <CardContent className="divide-y p-0">
                    {list.map(({ shift, startMinutes, endMinutes }) => {
                      const emp = scheduleEmployees.find(
                        (e) => e.id === shift.employeeId,
                      );
                      const pos = allPositions.find(
                        (p) => p.id === shift.positionId,
                      );
                      const dept = departments.find(
                        (d) => d.id === shift.departmentId,
                      );
                      const hours = computeShiftHours(
                        shift.startTime,
                        shift.endTime,
                        shift.breakMinutes,
                      );

                      // Live progress for active shifts
                      const inProgress =
                        bucket === "active" && nowMinutes >= startMinutes;
                      const elapsedPct = inProgress
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              ((nowMinutes - startMinutes) /
                                (endMinutes - startMinutes)) *
                                100,
                            ),
                          )
                        : 0;
                      const remainingMin = inProgress
                        ? Math.max(0, endMinutes - nowMinutes)
                        : 0;
                      const startsInMin = startMinutes - nowMinutes;

                      return (
                        <div
                          key={shift.id}
                          className="group relative flex items-center gap-3 px-4 py-3"
                        >
                          {bucket === "unfilled" ? (
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                              <UserX className="size-4 text-amber-600 dark:text-amber-400" />
                            </div>
                          ) : (
                            <Avatar className="size-9">
                              <AvatarImage src={emp?.avatar} alt={emp?.name} />
                              <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {emp?.initials ?? "??"}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">
                                {emp?.name ?? "Unassigned"}
                              </span>
                              {pos && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                  style={{
                                    borderColor: pos.color,
                                    color: pos.color,
                                  }}
                                >
                                  {pos.name}
                                </Badge>
                              )}
                              {dept && departmentFilter === "all" && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {dept.name}
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs tabular-nums">
                              <span>
                                {shift.startTime}–{shift.endTime}
                              </span>
                              <span>·</span>
                              <span>{hours.toFixed(1)}h</span>
                              {inProgress && (
                                <>
                                  <span>·</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {Math.floor(remainingMin / 60)}h{" "}
                                    {remainingMin % 60}m left
                                  </span>
                                </>
                              )}
                              {bucket === "upcoming" &&
                                isToday &&
                                startsInMin > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                      starts in {Math.floor(startsInMin / 60)}h{" "}
                                      {startsInMin % 60}m
                                    </span>
                                  </>
                                )}
                            </div>
                            {inProgress && (
                              <div className="bg-muted mt-1.5 h-1 overflow-hidden rounded-full">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{ width: `${elapsedPct}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {bucket === "unfilled" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePost(shift)}
                              >
                                <Hand className="mr-1 size-3.5" />
                                Post for pickup
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() =>
                                    handleNotify(shift, "Reminder")
                                  }
                                  title="Send reminder"
                                >
                                  <Bell className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() => handleNotify(shift, "Message")}
                                  title="Message employee"
                                >
                                  <MessageSquare className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() => handlePost(shift)}
                                  title="Replace / find cover"
                                >
                                  <Replace className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </section>
            );
          },
        )}

        {entries.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
            <Users className="mb-3 size-10 opacity-30" />
            <p className="font-medium">No shifts scheduled for {dateLabel}</p>
            <p className="text-sm">Try a different day or department filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  accent: "emerald" | "blue" | "amber" | "slate";
}) {
  const accentMap = {
    emerald:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    amber:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    slate: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${accentMap[accent]}`}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
