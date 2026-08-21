"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  BarChart3,
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
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  hoursByEmployee,
  hoursByDepartment,
  coverageByDayHour,
  timeOffByType,
  frequentSwappers,
  dailyLaborCost,
  punctuality,
} from "@/lib/scheduling-reports";
import { laborCost } from "@/lib/report-data-sources";
import { formatCurrency, formatCount, formatPercent } from "@/lib/format";
import { downloadReportCsv } from "@/lib/report-export";
import { useQuery } from "@tanstack/react-query";
import {
  clockQueries,
  schedulingQueries,
  swapQueries,
  timeOffQueries,
} from "@/lib/api/scheduling";
import { staffQueries } from "@/lib/api/staff";
import {
  toAttendanceEntries,
  toScheduleEmployees,
} from "@/lib/api/mappers/scheduling";

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
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-[200px] animate-pulse rounded-sm" />
    ),
  },
);

const DeptHoursChart = dynamic(
  () =>
    import("@/components/scheduling/charts/DeptHoursChart").then(
      (m) => m.DeptHoursChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-[200px] animate-pulse rounded-sm" />
    ),
  },
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

  // ── EVERY FIGURE ON THIS SCREEN CAME FROM src/data UNTIL 2026-08-21 ─────
  //
  // Shifts, clock entries, departments, positions, leave and swaps were all
  // fixtures, on the module's own Reports tab, while Payroll — one nav item
  // away — read the real tables. Same facility, two answers about the same
  // fortnight, and the fixture one looked more complete.
  //
  // The window is the report's range, so stepping it is a new query rather
  // than a refetch that blanks the numbers already on screen.
  const { data: roster, isPending: rosterPending } = useQuery(
    schedulingQueries.shifts(range.start, range.end),
  );
  const { data: structure } = useQuery(schedulingQueries.structure());
  const { data: staff } = useQuery(staffQueries.profiles());
  const { data: clock } = useQuery(clockQueries.state(range.start, range.end));
  const { data: leave } = useQuery(timeOffQueries.list("all"));
  const { data: swaps } = useQuery(swapQueries.list("all"));

  const departments = useMemo(() => structure?.departments ?? [], [structure]);
  const allPositions = useMemo(() => structure?.positions ?? [], [structure]);

  // The FACILITY's zone, carried by the shifts payload. Every reconciliation
  // below grades somebody late or absent, so doing it in the reader's zone is
  // the bug that put night shifts on the wrong day in the attendance view.
  const timeZone = roster?.timeZone ?? "UTC";

  const allShifts = useMemo(() => roster?.shifts ?? [], [roster]);
  // Bridged to the shape the attendance math speaks, in the FACILITY's zone —
  // one shared adapter, so this screen and AttendanceView cannot come to
  // different conclusions about who was late.
  const clockEntries = useMemo(
    () => toAttendanceEntries(clock?.entries ?? [], timeZone),
    [clock, timeZone],
  );
  const employees = useMemo(() => toScheduleEmployees(staff ?? []), [staff]);

  // Scoping by department filters the SHIFTS, not the people. A shift carries
  // its own department, so the report then names whoever actually worked there
  // — including a cover from elsewhere, which is what a manager means. The old
  // version filtered `scheduleEmployees` on `departmentIds`, fixture ids that
  // matched nothing real.
  const scopedShifts = useMemo(
    () =>
      allShifts.filter(
        (shift) =>
          departmentFilter === "all" || shift.departmentId === departmentFilter,
      ),
    [allShifts, departmentFilter],
  );

  const rosterInput = useMemo(
    () => ({
      shifts: scopedShifts,
      employees,
      positions: allPositions,
      clockEntries,
      timeZone,
    }),
    [scopedShifts, employees, allPositions, clockEntries, timeZone],
  );

  const empHours = useMemo(
    () =>
      hoursByEmployee(
        scopedShifts,
        employees,
        allPositions,
        clockEntries,
        range,
        timeZone,
      ),
    [scopedShifts, employees, allPositions, clockEntries, range, timeZone],
  );

  const deptHours = useMemo(
    () => hoursByDepartment(allShifts, departments, allPositions, range),
    [allShifts, departments, allPositions, range],
  );

  const coverage = useMemo(
    () => coverageByDayHour(scopedShifts, range),
    [scopedShifts, range],
  );

  // Leave and swaps carry no department of their own in the real model — the
  // shift does. Filtering them by department would need a join this screen
  // does not have, so they are facility-wide and the header says so.
  const timeOff = useMemo(
    () => timeOffByType(leave?.requests ?? [], range),
    [leave, range],
  );

  const swappers = useMemo(
    () => frequentSwappers(swaps?.swaps ?? [], employees, range),
    [swaps, employees, range],
  );

  // An OPEN shift is one with nobody on it — `staff_shifts.staff_id IS NULL`.
  // That is the whole of what the schema knows.
  const openShifts = useMemo(
    () => scopedShifts.filter((shift) => !shift.employeeId),
    [scopedShifts],
  );

  const costSeries = useMemo(
    () => dailyLaborCost(scopedShifts, allPositions, range),
    [scopedShifts, allPositions, range],
  );

  const drRange = useMemo(
    () => ({ from: range.start, to: range.end }),
    [range],
  );
  const labor = useMemo(
    () => laborCost(drRange, rosterInput),
    [drRange, rosterInput],
  );
  const punct = useMemo(
    () => punctuality(scopedShifts, clockEntries, range, timeZone),
    [scopedShifts, clockEntries, range, timeZone],
  );

  // ── WHAT A STAFF ROW CAN HONESTLY SAY ──────────────────────────────────
  //
  // This table used to carry Revenue, Labour %, and Sales/hour beside the
  // hours. Those come from `staffPerformance`, which attributes revenue from
  // retail transactions and grooming appointments — retail has NO backend at
  // all, and grooming's real table is not wired to this screen.
  //
  // Now that the cost side is real, showing them together would produce a
  // labour-as-percent-of-revenue figure computed from a real numerator and an
  // invented denominator: a fabricated financial ratio that looks reconciled
  // precisely because half of it is true. Worse than the all-fixture version
  // it replaces.
  //
  // So the columns are gone and the hours and cost remain. They come from the
  // same shifts and clock entries Payroll bills from, so the two screens agree
  // by construction. Restoring the revenue side means converting retail and
  // grooming, not this file.
  const staffRows = useMemo(
    () =>
      labor
        .filter((row) => row.hoursWorked > 0 || row.laborCost > 0)
        .map((row) => ({
          id: row.staffId,
          name: row.staffName,
          hours: row.hoursWorked,
          laborCost: row.laborCost,
        }))
        .sort((a, b) => b.laborCost - a.laborCost),
    [labor],
  );

  const totalLaborCost = labor.reduce((sum, row) => sum + row.laborCost, 0);

  // ─── Top-line metrics
  const totalHours = empHours.reduce((s, r) => s + r.scheduledHours, 0);
  const totalCost = empHours.reduce((s, r) => s + r.cost, 0);
  const totalOvertime = empHours.reduce((s, r) => s + r.overtimeHours, 0);
  const overtimePct = totalHours > 0 ? (totalOvertime / totalHours) * 100 : 0;

  // ─── Coverage heatmap min/max for color scaling
  const maxStaff = Math.max(1, ...coverage.map((c) => c.staffCount));

  // Export the staff performance + department hours currently displayed for the
  // selected window (and department scope) as one CSV — real rows, not a stub.
  const handleExport = () => {
    const rows: (string | number)[][] = [];
    rows.push(["Workforce Report", `${range.start} to ${range.end}`]);
    rows.push([]);
    rows.push(["Staff Performance"]);
    rows.push(["Staff", "Hours", "Labor Cost"]);
    for (const s of staffRows) rows.push([s.name, s.hours, s.laborCost]);
    rows.push([]);
    rows.push(["Hours by Department"]);
    rows.push(["Department", "Scheduled Hours", "Labor Cost"]);
    for (const d of deptHours)
      rows.push([d.department.name, d.scheduledHours, d.laborCost]);
    downloadReportCsv(`workforce-report_${range.start}_${range.end}.csv`, rows);
  };

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
        <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Headline KPIs.

          Guarded on the roster query: "0 scheduled hours, $0 labour cost" is a
          statement about a fortnight, and rendering it while the request is
          still in flight tells a manager their facility did no work. */}
      {rosterPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[86px] w-full" />
          ))}
        </div>
      ) : (
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
            label="Shifts with nobody on them"
            value={formatCount(openShifts.length)}
            accent={openShifts.length > 0 ? "amber" : "emerald"}
          />
        </div>
      )}

      <Tabs defaultValue="hours" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hours">
            <Users className="mr-1 size-3.5" /> Hours
          </TabsTrigger>
          <TabsTrigger value="cost">
            <BarChart3 className="mr-1 size-3.5" /> Labor cost
          </TabsTrigger>
          <TabsTrigger value="staff">
            <TrendingUp className="mr-1 size-3.5" /> Staff performance
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
                        {/* No flex-wrap: keep the avatar inline with the name so
                            long names don't push it onto its own line (the table
                            scrolls horizontally instead). */}
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 shrink-0">
                            <AvatarImage
                              src={row.employee.avatar}
                              alt={row.employee.name}
                            />
                            <AvatarFallback className="text-[10px]">
                              {row.employee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="text-sm font-medium whitespace-nowrap">
                              {row.employee.name}
                            </div>
                            <div className="text-muted-foreground text-[11px] whitespace-nowrap">
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
                  <div key={d.department.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
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
                      <span className="font-medium">
                        ${d.laborCost.toFixed(0)}
                      </span>
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

        {/* ── Staff performance tab ───────────────────────────────── */}
        <TabsContent value="staff" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              icon={TrendingUp}
              label="Hours worked"
              value={formatCount(Math.round(totalHours))}
              accent="emerald"
            />
            <KpiCard
              icon={BarChart3}
              label="Labor cost"
              value={formatCurrency(totalLaborCost)}
              accent="blue"
            />
            <KpiCard
              icon={Clock}
              label="On-time (clocked)"
              value={punct.clocked > 0 ? formatPercent(punct.onTimeRate) : "—"}
              accent={punct.onTimeRate >= 90 ? "emerald" : "amber"}
            />
            <KpiCard
              icon={Activity}
              label="Shifts clocked"
              value={`${punct.clocked} / ${punct.scheduled}`}
              accent="amber"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Labour by staff</CardTitle>
              <p className="text-muted-foreground text-xs">
                Hours from the rostered shifts and the time clock; cost from
                each shift&apos;s position rate. The same rows Payroll bills
                from, so the two screens agree.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {staffRows.length === 0 ? (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  No staff activity in this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Labour Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">
                          {r.name}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {r.hours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatCurrency(r.laborCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* "Appointments per groomer" lived here and read
              `groomingAnalytics`, which counts the grooming FIXTURE. There is a
              real `grooming_appointments` table and a route for it, but wiring
              it is the grooming module's job — and a fixture appointment count
              beside a real wage bill invites exactly the comparison neither
              number can support. */}
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
                          className="text-muted-foreground flex items-center"
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
                              {cell && cell.staffCount > 0
                                ? cell.staffCount
                                : ""}
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
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage
                            src={s.employee.avatar}
                            alt={s.employee.name}
                          />
                          <AvatarFallback className="text-[9px]">
                            {s.employee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{s.employee.name}</span>
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

        {/* ── Open shifts tab ─────────────────────────────────────────
            WHAT THIS USED TO CLAIM, AND WHY IT IS SMALLER NOW.

            It reported Posted / Claimed / Expired / Cancelled and a "top
            claimers" league table, off `shiftOpportunities` — a fixture
            describing an open-shift BOARD: post a shift, staff claim it, it
            expires. None of that exists. `staff_shifts` knows one thing about
            an unclaimed shift: `staff_id IS NULL`. There is no posting, no
            claiming, no expiry, and nowhere to record any of it.

            Reporting a fill rate against it would not merely be a fixture — it
            would be a metric for a workflow the product does not have, and
            "0% filled" reads as a failing process rather than an absent one.
            So this shows the shifts that genuinely have nobody on them, and
            says only that. */}
        <TabsContent value="open" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Unassigned shifts</CardTitle>
              <p className="text-muted-foreground text-xs">
                Rostered shifts in this period with nobody on them. Urgent ones
                are flagged.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {openShifts.length === 0 ? (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Every shift in this period has somebody on it.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="text-sm font-medium">
                          {shift.date}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {shift.startTime}–{shift.endTime}
                        </TableCell>
                        <TableCell className="text-sm">
                          {allPositions.find((p) => p.id === shift.positionId)
                            ?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {shift.urgent ? (
                            <Badge
                              variant="secondary"
                              className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                            >
                              Urgent
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              {shift.status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    emerald:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    amber:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
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
          <p className="text-2xl/tight font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
