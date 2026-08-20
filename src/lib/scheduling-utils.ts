import type { HolidayRate } from "@/types/scheduling";

/**
 * Compute shift duration in hours (minus break).
 *
 * ── AN END AT OR BEFORE THE START IS THE NEXT DAY ─────────────────────────
 *
 * 22:00 – 06:00 gave `360 - 1320 = -960` minutes, and the `Math.max(0, …)`
 * below turned that into a confident **zero hours**. Nine call sites read this:
 * the week's total, the overtime check, attendance, conflict detection and the
 * scheduling reports — so every overnight shift counted as no work at all,
 * never tripped overtime, and cost nothing.
 *
 * The database has always been on the other side of this. `shiftInstants` in
 * the mapper treats `endTime <= startTime` as running past midnight, and
 * `staff_shifts` stores two instants with `ends_at > starts_at` enforced. This
 * is the app-side arithmetic finally agreeing with it.
 *
 * The clamp stays, but it is now genuinely defensive: the only way left to go
 * negative is a break longer than the shift, which `staff_shifts_break_fits`
 * refuses at the table.
 */
export function computeShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const start = sh! * 60 + sm!;
  const end = eh! * 60 + em!;
  const spanMinutes = end <= start ? end + 24 * 60 - start : end - start;

  return Math.max(0, (spanMinutes - breakMinutes) / 60);
}

/**
 * Split total hours into regular and overtime buckets.
 */
export function computeOvertimeHours(
  totalHours: number,
  threshold: number,
): { regular: number; overtime: number } {
  if (totalHours <= threshold) {
    return { regular: totalHours, overtime: 0 };
  }
  return { regular: threshold, overtime: totalHours - threshold };
}

/**
 * Find holiday rate for a given date (checks department-specific first, then global).
 */
export function isHoliday(
  date: string,
  holidayRates: HolidayRate[],
  departmentId?: string,
): HolidayRate | undefined {
  // Prefer department-specific holiday
  const deptHoliday = holidayRates.find(
    (h) => h.date === date && h.departmentId === departmentId,
  );
  if (deptHoliday) return deptHoliday;
  // Fall back to global (no departmentId)
  return holidayRates.find((h) => h.date === date && !h.departmentId);
}

/**
 * Format a duration in minutes as "Xh Ym".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format elapsed seconds as MM:SS.
 */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ============================================================================
// What a week's rota costs.
//
// ── THE FIXTURE THIS REPLACES ─────────────────────────────────────────────
//
// `calculateLaborCost` in src/data/scheduling.ts read fixture shifts against
// fixture positions, so the calendar's LABOUR COST tile showed a figure derived
// from neither the rota on screen nor anybody's actual wage.
//
// ── PAY MAY BE ABSENT, AND ABSENT IS NOT ZERO ─────────────────────────────
//
// `facility_position_pay` has its own policy — `scheduling_view_labor_cost`,
// held by owner, admin, manager and the ACCOUNTANT. A caller without it gets
// positions with no figures on them, and the mapper leaves `hourlyRate` and
// `salary` undefined rather than defaulting them.
//
// So this returns `null` for "you cannot see this", distinct from `0` for "this
// week costs nothing". A tile that renders $0 at somebody who is not allowed to
// know is not protecting anything — it is stating a number, and the number is
// wrong.
//
// A position that simply has no rate SET is counted as nothing, because it
// genuinely contributes nothing knowable — but `covered` says how much of the
// rota the figure is actually based on, so a screen can say "of 12 shifts, 9
// priced" instead of quietly under-reporting the wage bill.
// ============================================================================

export interface LaborCost {
  total: number;
  byPosition: Record<string, number>;
  byEmployee: Record<string, number>;
  /** Shifts whose position had a rate on it. */
  covered: number;
  /** Shifts counted at all. `covered < counted` means the total is partial. */
  counted: number;
}

interface PricedPosition {
  id: string;
  payType: "hourly" | "salary";
  hourlyRate?: number;
  salary?: number;
}

interface CostedShift {
  positionId: string;
  employeeId?: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
}

/**
 * A salaried person's hourly equivalent.
 *
 * 52 weeks of 40 hours — the same convention the fixture used, named rather
 * than inlined so the next person can argue with it. It is a scheduling
 * estimate for comparing rotas, NOT payroll: nobody is paid from this number.
 */
const SALARIED_HOURS_PER_YEAR = 52 * 40;

/**
 * What the given shifts cost, using the pay the caller is allowed to see.
 *
 * `null` when they are not allowed to see any of it — see the header.
 */
export function computeLaborCost(
  shifts: CostedShift[],
  positions: PricedPosition[],
  canSeePay: boolean,
): LaborCost | null {
  if (!canSeePay) return null;

  const rates = new Map(positions.map((p) => [p.id, p]));
  const byPosition: Record<string, number> = {};
  const byEmployee: Record<string, number> = {};
  let total = 0;
  let covered = 0;
  let counted = 0;

  for (const shift of shifts) {
    // A cancelled shift is a record that something was planned, not work that
    // will be paid for.
    if (shift.status === "cancelled") continue;
    counted++;

    const position = rates.get(shift.positionId);
    if (!position) continue;

    const hourly =
      position.payType === "hourly"
        ? position.hourlyRate
        : position.salary != null
          ? position.salary / SALARIED_HOURS_PER_YEAR
          : undefined;

    if (hourly == null) continue;
    covered++;

    const cost =
      computeShiftHours(shift.startTime, shift.endTime, shift.breakMinutes) *
      hourly;

    total += cost;
    byPosition[shift.positionId] = (byPosition[shift.positionId] ?? 0) + cost;
    if (shift.employeeId) {
      byEmployee[shift.employeeId] = (byEmployee[shift.employeeId] ?? 0) + cost;
    }
  }

  return { total, byPosition, byEmployee, covered, counted };
}
