"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  detectShiftConflicts,
  type Conflict,
} from "@/lib/scheduling-conflicts";
import type {
  ScheduleShift,
  ScheduleEmployee,
  EmployeeAvailability,
  EnhancedTimeOffRequest,
  SchedulingSettings,
} from "@/types/scheduling";

interface Props {
  /** All shifts in the current view (draft + published) */
  shifts: ScheduleShift[];
  employees: ScheduleEmployee[];
  availabilities: EmployeeAvailability[];
  timeOffRequests: EnhancedTimeOffRequest[];
  settings: Pick<
    SchedulingSettings,
    "overtimeThresholdWeekly" | "minTimeBetweenShifts" | "maxConsecutiveDays"
  >;
}

type ShiftWithConflicts = {
  shift: ScheduleShift;
  employee: ScheduleEmployee;
  conflicts: Conflict[];
};

export function DraftReviewSummary({
  shifts,
  employees,
  availabilities,
  timeOffRequests,
  settings,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const analyzed = useMemo<ShiftWithConflicts[]>(() => {
    const assigned = shifts.filter(
      (s) => s.employeeId && s.status !== "cancelled",
    );
    return assigned
      .map((shift) => {
        const employee = employees.find((e) => e.id === shift.employeeId);
        if (!employee) return null;
        const availability = availabilities.find(
          (a) => a.employeeId === employee.id,
        );
        const conflicts = detectShiftConflicts({
          shift,
          employee,
          allShifts: shifts,
          availability,
          timeOffRequests,
          settings,
        });
        return conflicts.length > 0 ? { shift, employee, conflicts } : null;
      })
      .filter((x): x is ShiftWithConflicts => x !== null);
  }, [shifts, employees, availabilities, timeOffRequests, settings]);

  const unfilledCount = useMemo(
    () =>
      shifts.filter((s) => !s.employeeId && s.status !== "cancelled").length,
    [shifts],
  );

  const errorCount = analyzed.reduce(
    (sum, a) => sum + a.conflicts.filter((c) => c.severity === "error").length,
    0,
  );
  const warningCount = analyzed.reduce(
    (sum, a) =>
      sum + a.conflicts.filter((c) => c.severity === "warning").length,
    0,
  );

  const hasIssues = analyzed.length > 0 || unfilledCount > 0;

  if (!hasIssues) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          Schedule looks clean — no conflicts and all shifts assigned.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-md border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
          <span className="text-sm font-medium">Schedule review</span>
          {errorCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 border-red-300 bg-red-50 px-1.5 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="mr-1 size-3" />
              {errorCount} blocking
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 border-amber-300 bg-amber-50 px-1.5 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
            >
              <AlertTriangle className="mr-1 size-3" />
              {warningCount} warning{warningCount === 1 ? "" : "s"}
            </Badge>
          )}
          {unfilledCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 border-slate-300 bg-slate-50 px-1.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {unfilledCount} unfilled
            </Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="divide-y border-t text-xs">
          {analyzed.length === 0 && unfilledCount === 0 && (
            <div className="text-muted-foreground px-3 py-4 text-center">
              No conflicts.
            </div>
          )}

          {analyzed.map(({ shift, employee, conflicts }) => (
            <div key={shift.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{employee.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {shift.date} · {shift.startTime}–{shift.endTime}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {conflicts.map((c, i) => {
                  const Icon =
                    c.severity === "error" ? AlertCircle : AlertTriangle;
                  const color =
                    c.severity === "error"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400";
                  return (
                    <li
                      key={`${c.kind}-${i}`}
                      className="text-muted-foreground flex items-start gap-1.5"
                    >
                      <Icon className={`mt-0.5 size-3 shrink-0 ${color}`} />
                      <span>{c.message}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {unfilledCount > 0 && (
            <div className="text-muted-foreground px-3 py-2">
              {unfilledCount} shift{unfilledCount === 1 ? "" : "s"} still need
              an assignee.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
