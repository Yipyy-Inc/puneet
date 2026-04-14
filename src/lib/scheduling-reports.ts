import { computeShiftHours } from "@/lib/scheduling-utils";
import { reconcileBatch } from "@/lib/scheduling-attendance";
import type {
  Department,
  Position,
  ScheduleEmployee,
  ScheduleShift,
  EnhancedTimeOffRequest,
  EnhancedShiftSwap,
  ShiftOpportunity,
  TimeClockEntry,
} from "@/types/scheduling";

// ============================================================================
// Aggregations for the reports module
// ============================================================================

function inRange(dateStr: string, start: string, end: string) {
  return dateStr >= start && dateStr <= end;
}

function shiftHours(s: ScheduleShift) {
  return computeShiftHours(s.startTime, s.endTime, s.breakMinutes);
}

function shiftCost(s: ScheduleShift, positions: Position[]): number {
  const pos = positions.find((p) => p.id === s.positionId);
  if (!pos) return 0;
  if (pos.payType === "hourly" && pos.hourlyRate) {
    return shiftHours(s) * pos.hourlyRate;
  }
  // For salaried, attribute a notional per-hour cost from annual / 2080
  if (pos.payType === "salary" && pos.salary) {
    return shiftHours(s) * (pos.salary / 2080);
  }
  return 0;
}

// ─── Hours by employee ──────────────────────────────────────────────────────

export interface EmployeeHoursRow {
  employee: ScheduleEmployee;
  scheduledHours: number;
  actualHours: number;
  overtimeHours: number;
  shiftCount: number;
  cost: number;
}

export function hoursByEmployee(
  shifts: ScheduleShift[],
  employees: ScheduleEmployee[],
  positions: Position[],
  entries: TimeClockEntry[],
  range: { start: string; end: string },
): EmployeeHoursRow[] {
  const scoped = shifts.filter(
    (s) =>
      s.status !== "cancelled" &&
      s.employeeId &&
      inRange(s.date, range.start, range.end),
  );
  const { records } = reconcileBatch(scoped, entries);

  return employees
    .map((employee) => {
      const empShifts = scoped.filter((s) => s.employeeId === employee.id);
      const empRecords = records.filter(
        (r) => r.shift.employeeId === employee.id,
      );
      return {
        employee,
        scheduledHours: empShifts.reduce((sum, s) => sum + shiftHours(s), 0),
        actualHours: empRecords.reduce(
          (sum, r) => sum + (r.actualHours ?? 0),
          0,
        ),
        overtimeHours: empRecords.reduce((sum, r) => sum + r.overtimeHours, 0),
        shiftCount: empShifts.length,
        cost: empShifts.reduce((sum, s) => sum + shiftCost(s, positions), 0),
      };
    })
    .filter((r) => r.scheduledHours > 0)
    .sort((a, b) => b.scheduledHours - a.scheduledHours);
}

// ─── Hours by department ────────────────────────────────────────────────────

export interface DepartmentHoursRow {
  department: Department;
  scheduledHours: number;
  shiftCount: number;
  laborCost: number;
  uniqueEmployees: number;
}

export function hoursByDepartment(
  shifts: ScheduleShift[],
  departments: Department[],
  positions: Position[],
  range: { start: string; end: string },
): DepartmentHoursRow[] {
  const scoped = shifts.filter(
    (s) => s.status !== "cancelled" && inRange(s.date, range.start, range.end),
  );
  return departments
    .map((department) => {
      const deptShifts = scoped.filter((s) => s.departmentId === department.id);
      const employees = new Set(
        deptShifts.map((s) => s.employeeId).filter(Boolean) as string[],
      );
      return {
        department,
        scheduledHours: deptShifts.reduce((sum, s) => sum + shiftHours(s), 0),
        shiftCount: deptShifts.length,
        laborCost: deptShifts.reduce(
          (sum, s) => sum + shiftCost(s, positions),
          0,
        ),
        uniqueEmployees: employees.size,
      };
    })
    .sort((a, b) => b.scheduledHours - a.scheduledHours);
}

// ─── Coverage by day-of-week / hour ─────────────────────────────────────────

export interface CoverageCell {
  dayOfWeek: number; // 0–6 (Sun-Sat)
  hour: number; // 0–23
  staffCount: number;
}

export function coverageByDayHour(
  shifts: ScheduleShift[],
  range: { start: string; end: string },
): CoverageCell[] {
  const scoped = shifts.filter(
    (s) =>
      s.status !== "cancelled" &&
      s.employeeId &&
      inRange(s.date, range.start, range.end),
  );

  const cells = new Map<string, number>();
  for (const s of scoped) {
    const dow = new Date(`${s.date}T12:00:00`).getDay();
    const [sh] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    const lastHour = em > 0 ? eh : eh - 1;
    for (let h = sh; h <= lastHour; h++) {
      const key = `${dow}-${h}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
    }
  }

  const result: CoverageCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      result.push({
        dayOfWeek: d,
        hour: h,
        staffCount: cells.get(`${d}-${h}`) ?? 0,
      });
    }
  }
  return result;
}

// ─── Time-off + swap trends ─────────────────────────────────────────────────

export function timeOffByType(
  requests: EnhancedTimeOffRequest[],
  range: { start: string; end: string },
): { type: string; count: number; days: number }[] {
  const scoped = requests.filter(
    (r) =>
      r.status === "approved" && inRange(r.startDate, range.start, range.end),
  );
  const map = new Map<string, { count: number; days: number }>();
  for (const r of scoped) {
    const days =
      Math.ceil(
        (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) /
          86_400_000,
      ) + 1;
    const prev = map.get(r.type) ?? { count: 0, days: 0 };
    map.set(r.type, { count: prev.count + 1, days: prev.days + days });
  }
  return Array.from(map.entries()).map(([type, v]) => ({ type, ...v }));
}

export function frequentSwappers(
  swaps: EnhancedShiftSwap[],
  employees: ScheduleEmployee[],
  range: { start: string; end: string },
): { employee: ScheduleEmployee; count: number }[] {
  const scoped = swaps.filter((s) =>
    inRange(s.requestedAt.split("T")[0], range.start, range.end),
  );
  const counts = new Map<string, number>();
  for (const s of scoped) {
    counts.set(
      s.requestingEmployeeId,
      (counts.get(s.requestingEmployeeId) ?? 0) + 1,
    );
  }
  return Array.from(counts.entries())
    .map(([id, count]) => {
      const emp = employees.find((e) => e.id === id);
      return emp ? { employee: emp, count } : null;
    })
    .filter(
      (x): x is { employee: ScheduleEmployee; count: number } => x !== null,
    )
    .sort((a, b) => b.count - a.count);
}

// ─── Open-shift pickup analytics ────────────────────────────────────────────

export interface OpenShiftAnalytics {
  postedTotal: number;
  claimedTotal: number;
  expiredTotal: number;
  cancelledTotal: number;
  fillRate: number; // claimed / posted
  topClaimers: { employeeId: string; employeeName: string; count: number }[];
}

export function openShiftAnalytics(
  opportunities: ShiftOpportunity[],
  range: { start: string; end: string },
): OpenShiftAnalytics {
  const scoped = opportunities.filter((o) =>
    inRange(o.postedAt.split("T")[0], range.start, range.end),
  );
  const claimed = scoped.filter((o) => o.status === "claimed");
  const counts = new Map<string, { name: string; count: number }>();
  for (const o of claimed) {
    if (!o.claimedBy || !o.claimedByName) continue;
    const prev = counts.get(o.claimedBy) ?? { name: o.claimedByName, count: 0 };
    counts.set(o.claimedBy, { ...prev, count: prev.count + 1 });
  }
  return {
    postedTotal: scoped.length,
    claimedTotal: claimed.length,
    expiredTotal: scoped.filter((o) => o.status === "expired").length,
    cancelledTotal: scoped.filter((o) => o.status === "cancelled").length,
    fillRate: scoped.length === 0 ? 0 : claimed.length / scoped.length,
    topClaimers: Array.from(counts.entries())
      .map(([employeeId, v]) => ({
        employeeId,
        employeeName: v.name,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

// ─── Daily labor-cost trend ─────────────────────────────────────────────────

export function dailyLaborCost(
  shifts: ScheduleShift[],
  positions: Position[],
  range: { start: string; end: string },
): { date: string; cost: number; hours: number }[] {
  const scoped = shifts.filter(
    (s) => s.status !== "cancelled" && inRange(s.date, range.start, range.end),
  );
  const map = new Map<string, { cost: number; hours: number }>();
  for (const s of scoped) {
    const prev = map.get(s.date) ?? { cost: 0, hours: 0 };
    map.set(s.date, {
      cost: prev.cost + shiftCost(s, positions),
      hours: prev.hours + shiftHours(s),
    });
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
