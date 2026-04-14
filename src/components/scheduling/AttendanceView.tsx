"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  Hourglass,
  TimerOff,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  attendanceStatusLabels,
  reconcileBatch,
  type AttendanceStatus,
} from "@/lib/scheduling-attendance";
import {
  departments,
  positions as allPositions,
  scheduleEmployees,
  scheduleShifts,
  timeClockEntries,
} from "@/data/scheduling";

const statusColor: Record<AttendanceStatus, string> = {
  on_time:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  late: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  early_departure:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  left_late: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  early_arrival:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  no_show: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  missing_clock_out:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  scheduled:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

export function AttendanceView() {
  const [days, setDays] = useState("14");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString().split("T")[0];
  }, [days]);

  const today = new Date().toISOString().split("T")[0];

  const scopedShifts = useMemo(
    () =>
      scheduleShifts.filter(
        (s) =>
          s.date >= cutoffDate &&
          s.date <= today &&
          (departmentFilter === "all" || s.departmentId === departmentFilter),
      ),
    [cutoffDate, today, departmentFilter],
  );

  const { records, summary } = useMemo(
    () => reconcileBatch(scopedShifts, timeClockEntries),
    [scopedShifts],
  );

  const visible = useMemo(() => {
    return records
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .sort((a, b) => {
        if (a.shift.date !== b.shift.date)
          return b.shift.date.localeCompare(a.shift.date);
        return a.shift.startTime.localeCompare(b.shift.startTime);
      });
  }, [records, statusFilter]);

  const reliabilityPct =
    summary.total > 0
      ? Math.round(((summary.onTime + summary.leftLate) / summary.total) * 100)
      : 100;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground text-sm">
            Compare scheduled shifts against actual clock-in / clock-out times.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="On time"
          value={summary.onTime}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard label="Late" value={summary.late} icon={Clock} accent="red" />
        <StatCard
          label="No-show"
          value={summary.noShow}
          icon={TimerOff}
          accent="red"
        />
        <StatCard
          label="Left early"
          value={summary.earlyDeparture}
          icon={AlertCircle}
          accent="amber"
        />
        <StatCard
          label="Overtime hrs"
          value={summary.totalOvertimeHours.toFixed(1)}
          icon={TrendingUp}
          accent="blue"
        />
        <StatCard
          label="On-time rate"
          value={`${reliabilityPct}%`}
          icon={Hourglass}
          accent={
            reliabilityPct >= 85
              ? "emerald"
              : reliabilityPct >= 70
                ? "amber"
                : "red"
          }
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        {(
          [
            "on_time",
            "late",
            "no_show",
            "early_departure",
            "left_late",
            "missing_clock_out",
          ] as AttendanceStatus[]
        ).map((s) => (
          <FilterChip
            key={s}
            label={attendanceStatusLabels[s]}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {/* Records table */}
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
              <ClipboardList className="mb-3 size-10 opacity-30" />
              <p className="font-medium">No attendance records</p>
              <p className="text-sm">
                Try a wider date range or a different filter.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => {
                  const emp = scheduleEmployees.find(
                    (e) => e.id === r.shift.employeeId,
                  );
                  const pos = allPositions.find(
                    (p) => p.id === r.shift.positionId,
                  );
                  const dept = departments.find(
                    (d) => d.id === r.shift.departmentId,
                  );
                  return (
                    <TableRow key={r.shift.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarImage src={emp?.avatar} alt={emp?.name} />
                            <AvatarFallback className="text-[10px]">
                              {emp?.initials ?? "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="text-sm font-medium">
                              {emp?.name ?? "Unassigned"}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              {pos?.name}
                              {departmentFilter === "all" && dept
                                ? ` · ${dept.name}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.shift.date}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.shift.startTime}–{r.shift.endTime}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.entry?.clockedInAt ? (
                          <>
                            {new Date(r.entry.clockedInAt).toLocaleTimeString(
                              "en-CA",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              },
                            )}
                            –
                            {r.entry.clockedOutAt
                              ? new Date(
                                  r.entry.clockedOutAt,
                                ).toLocaleTimeString("en-CA", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : "—"}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            No clock-in
                          </span>
                        )}
                        {r.clockInDeltaMin !== null && (
                          <span
                            className={`ml-1.5 text-[10px] ${
                              r.clockInDeltaMin > 5
                                ? "text-red-600 dark:text-red-400"
                                : r.clockInDeltaMin < -5
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            ({r.clockInDeltaMin > 0 ? "+" : ""}
                            {r.clockInDeltaMin}m)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColor[r.status]} text-[10px]`}
                        >
                          {attendanceStatusLabels[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {r.actualHours !== null
                          ? `${r.actualHours.toFixed(1)} / ${r.scheduledHours.toFixed(1)}`
                          : `— / ${r.scheduledHours.toFixed(1)}`}
                        {r.overtimeHours > 0 && (
                          <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400">
                            (+{r.overtimeHours.toFixed(1)} OT)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: typeof Clock;
  accent: "emerald" | "blue" | "amber" | "red";
}) {
  const accentMap = {
    emerald:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    amber:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-3">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${accentMap[accent]}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xl/tight font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground truncate text-[11px]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
