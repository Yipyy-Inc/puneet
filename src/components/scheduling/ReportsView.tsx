"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarOff,
  Clock,
  Download,
  Hand,
  Repeat,
  TrendingUp,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  hoursByEmployee,
  hoursByDepartment,
  coverageByDayHour,
  timeOffByType,
  frequentSwappers,
  openShiftAnalytics,
  dailyLaborCost,
} from "@/lib/scheduling-reports";
import {
  departments,
  positions as allPositions,
  scheduleEmployees,
  scheduleShifts,
  enhancedTimeOffRequests,
  enhancedShiftSwaps,
  shiftOpportunities,
  timeClockEntries,
} from "@/data/scheduling";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  sick_leave: "Sick",
  personal: "Personal",
  bereavement: "Bereavement",
  parental: "Parental",
  unpaid: "Unpaid",
  other: "Other",
};

const LaborCostChart = dynamic(
  () =>
    import("@/components/scheduling/charts/LaborCostChart").then(
      (m) => m.LaborCostChart,
    ),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded bg-muted" /> },
);

const DeptHoursChart = dynamic(
  () =>
    import("@/components/scheduling/charts/DeptHoursChart").then(
      (m) => m.DeptHoursChart,
    ),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded bg-muted" /> },
);

export function ReportsView() {
  const [days, setDays] = useState("30");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - parseInt(days));
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }, [days]);

  const scopedShifts = useMemo(
    () =>
      scheduleShifts.filter(
        (s) =>
          departmentFilter === "all" || s.departmentId === departmentFilter,
      ),
    [departmentFilter],
  );
  const scopedEmployees = useMemo(
    () =>
      scheduleEmployees.filter(
        (e) =>
          departmentFilter === "all" ||
          e.departmentIds.includes(departmentFilter),
      ),
    [departmentFilter],
  );

  const empHours = useMemo(
    () =>
      hoursByEmployee(
        scopedShifts,
        scopedEmployees,
        allPositions,
        timeClockEntries,
        range,
      ),
    [scopedShifts, scopedEmployees, range],
  );

  const deptHours = useMemo(
    () => hoursByDepartment(scheduleShifts, departments, allPositions, range),
    [range],
  );

  const coverage = useMemo(
    () => coverageByDayHour(scopedShifts, range),
    [scopedShifts, range],
  );

  const timeOff = useMemo(
    () =>
      timeOffByType(
        enhancedTimeOffRequests.filter(
          (r) =>
            departmentFilter === "all" || r.departmentId === departmentFilter,
        ),
        range,
      ),
    [departmentFilter, range],
  );

  const swappers = useMemo(
    () =>
      frequentSwappers(
        enhancedShiftSwaps.filter(
          (s) =>
            departmentFilter === "all" || s.departmentId === departmentFilter,
        ),
        scopedEmployees,
        range,
      ),
    [departmentFilter, range, scopedEmployees],
  );

  const openShifts = useMemo(
    () =>
      openShiftAnalytics(
        shiftOpportunities.filter(
          (o) =>
            departmentFilter === "all" || o.departmentId === departmentFilter,
        ),
        range,
      ),
    [departmentFilter, range],
  );

  const costSeries = useMemo(
    () => dailyLaborCost(scopedShifts, allPositions, range),
    [scopedShifts, range],
  );

  // ─── Top-line metrics
  const totalHours = empHours.reduce((s, r) => s + r.scheduledHours, 0);
  const totalCost = empHours.reduce((s, r) => s + r.cost, 0);
  const totalOvertime = empHours.reduce((s, r) => s + r.overtimeHours, 0);
  const overtimePct = totalHours > 0 ? (totalOvertime / totalHours) * 100 : 0;

  // ─── Coverage heatmap min/max for color scaling
  const maxStaff = Math.max(1, ...coverage.map((c) => c.staffCount));

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Reports & Analytics
          </h2>
          <p className="text-muted-foreground text-sm">
            Workforce performance, labor cost trends, and coverage health.
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
              <SelectValue />
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
          <Button variant="outline" size="sm">
            <Download className="mr-1 size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={Clock}
          label="Scheduled hours"
          value={`${totalHours.toFixed(0)}h`}
          accent="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="Labor cost"
          value={`$${totalCost.toFixed(0)}`}
          accent="emerald"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Overtime"
          value={`${totalOvertime.toFixed(1)}h (${overtimePct.toFixed(1)}%)`}
          accent={overtimePct > 5 ? "red" : "amber"}
        />
        <KpiCard
          icon={Hand}
          label="Open shift fill rate"
          value={`${(openShifts.fillRate * 100).toFixed(0)}%`}
          accent={openShifts.fillRate >= 0.7 ? "emerald" : "amber"}
        />
      </div>

      <Tabs defaultValue="hours" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hours">
            <Users className="mr-1 size-3.5" /> Hours
          </TabsTrigger>
          <TabsTrigger value="cost">
            <BarChart3 className="mr-1 size-3.5" /> Labor cost
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <Activity className="mr-1 size-3.5" /> Coverage
          </TabsTrigger>
          <TabsTrigger value="requests">
            <CalendarOff className="mr-1 size-3.5" /> Requests
          </TabsTrigger>
          <TabsTrigger value="open">
            <Hand className="mr-1 size-3.5" /> Open shifts
          </TabsTrigger>
        </TabsList>

        {/* ── Hours tab ───────────────────────────────────────────── */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hours by employee</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead className="text-right">Scheduled</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empHours.slice(0, 20).map((row) => (
                    <TableRow key={row.employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarImage
                              src={row.employee.avatar}
                              alt={row.employee.name}
                            />
                            <AvatarFallback className="text-[10px]">
                              {row.employee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="text-sm font-medium">
                              {row.employee.name}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              {row.employee.role}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.shiftCount}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.scheduledHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.actualHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.overtimeHours > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {row.overtimeHours.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        ${row.cost.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hours by department</CardTitle>
            </CardHeader>
            <CardContent>
              <DeptHoursChart
                data={deptHours.map((d) => ({
                  name: d.department.name,
                  hours: Math.round(d.scheduledHours),
                  cost: Math.round(d.laborCost),
                }))}
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {deptHours.map((d) => (
                  <div
                    key={d.department.id}
                    className="rounded-md border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: d.department.color }}
                      />
                      <span className="text-sm font-medium">
                        {d.department.name}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {d.scheduledHours.toFixed(0)}h · {d.shiftCount} shifts ·{" "}
                      {d.uniqueEmployees} staff
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="font-medium">${d.laborCost.toFixed(0)}</span>
                      <span className="text-muted-foreground"> labor cost</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cost tab ────────────────────────────────────────────── */}
        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily labor cost</CardTitle>
            </CardHeader>
            <CardContent>
              <LaborCostChart data={costSeries} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Coverage tab ────────────────────────────────────────── */}
        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Coverage by day & hour
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Heatmap of staff scheduled on each day-of-week × hour over the
                period. Darker = more staff.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="grid grid-cols-[40px_repeat(24,minmax(22px,1fr))] gap-0.5 text-[10px]">
                    <div />
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div
                        key={h}
                        className="text-muted-foreground text-center tabular-nums"
                      >
                        {h}
                      </div>
                    ))}
                    {DAY_LABELS.map((label, dow) => (
                      <>
                        <div
                          key={`label-${dow}`}
                          className="flex items-center text-muted-foreground"
                        >
                          {label}
                        </div>
                        {Array.from({ length: 24 }).map((_, h) => {
                          const cell = coverage.find(
                            (c) => c.dayOfWeek === dow && c.hour === h,
                          );
                          const intensity = cell
                            ? cell.staffCount / maxStaff
                            : 0;
                          const bg =
                            intensity === 0
                              ? "bg-slate-100 dark:bg-slate-900"
                              : intensity < 0.25
                                ? "bg-emerald-100 dark:bg-emerald-950/50"
                                : intensity < 0.5
                                  ? "bg-emerald-200 dark:bg-emerald-900/60"
                                  : intensity < 0.75
                                    ? "bg-emerald-400 dark:bg-emerald-700"
                                    : "bg-emerald-600 text-white dark:bg-emerald-500";
                          return (
                            <div
                              key={`${dow}-${h}`}
                              title={`${DAY_LABELS[dow]} ${h}:00 — ${cell?.staffCount ?? 0} staff`}
                              className={`flex h-6 items-center justify-center rounded-sm tabular-nums ${bg}`}
                            >
                              {cell && cell.staffCount > 0 ? cell.staffCount : ""}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Requests tab ────────────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time-off by type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {timeOff.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No approved time-off in this period.
                  </p>
                ) : (
                  timeOff.map((t) => (
                    <div
                      key={t.type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{TYPE_LABELS[t.type] ?? t.type}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {t.count} req · {t.days}d
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Frequent shift-swappers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {swappers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No swap requests in this period.
                  </p>
                ) : (
                  swappers.slice(0, 8).map((s) => (
                    <div
                      key={s.employee.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage
                            src={s.employee.avatar}
                            alt={s.employee.name}
                          />
                          <AvatarFallback className="text-[9px]">
                            {s.employee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{s.employee.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        <Repeat className="mr-1 size-3" />
                        {s.count}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Open shifts tab ─────────────────────────────────────── */}
        <TabsContent value="open" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard
              icon={Hand}
              label="Posted"
              value={openShifts.postedTotal}
              accent="blue"
            />
            <KpiCard
              icon={Hand}
              label="Claimed"
              value={openShifts.claimedTotal}
              accent="emerald"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Expired"
              value={openShifts.expiredTotal}
              accent="amber"
            />
            <KpiCard
              icon={CalendarOff}
              label="Cancelled"
              value={openShifts.cancelledTotal}
              accent="red"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top claimers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openShifts.topClaimers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No claimed shifts in this period.
                </p>
              ) : (
                openShifts.topClaimers.map((c) => (
                  <div
                    key={c.employeeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{c.employeeName}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {c.count} shifts
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: number | string;
  accent: "emerald" | "blue" | "amber" | "red";
}) {
  const accentMap = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${accentMap[accent]}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums leading-tight">
            {value}
          </p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
