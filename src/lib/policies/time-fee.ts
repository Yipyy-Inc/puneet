import type { LatePickupFee } from "@/types/boarding";

// ============================================================================
// What a guest owes for arriving early or leaving late.
//
// ── THERE USED TO BE TWO OF THESE, AND THE ONE AT THE TILL WAS WRONG ──────
//
// `src/lib/late-pickup-fee.ts` decided the fee at checkout; `pricing-rules.ts`
// decided it again when quoting a booking. They disagreed about nearly
// everything, and the checkout copy — the one that takes money — was the
// poorer of the two:
//
//   * `if (fee.condition !== "late_pickup") continue` — so EVERY early
//     drop-off fee a facility had authored was silently ignored at the till.
//   * a plain `.includes(serviceId)` with no `"all"` sentinel, while the
//     editor writes `applicableServices: ["all"]` for "All services" — so a
//     fee scoped to everything matched nothing.
//   * `basedOn`, `customTime`, the apply-window and `taxRate` were never read
//     at all: four fields the facility can set that decided nothing.
//
// This module is the only evaluator now. `pricing-rules.ts` calls it, the till
// calls it, and they cannot drift because there is nothing left to drift from.
//
// ── ONE RULE WINS PER CONDITION ───────────────────────────────────────────
//
// A facility can author several late-pickup rules whose windows overlap. The
// quote used to charge the SUM of every match and the till charged whichever
// happened to be first in the array — so the two screens already disagreed
// about the same booking.
//
// One wins, and it is the rule whose baseline the guest crossed LAST: with a
// 6pm rule and an 8pm rule, a pickup at 9pm is charged the 8pm one. That is
// the most specific threshold actually crossed, it is what the tiers in the
// editor are plainly meant to express, and it can never total more than the
// old sum. Early drop-off is the mirror — the latest baseline crossed going
// backwards is the EARLIEST one.
//
// Late pickup and early drop-off are different events, so a booking can owe
// one of each. At most two fees come back.
// ============================================================================

export interface TimeFeeResult {
  ruleId: string;
  label: string;
  /** Dollars, already rounded to the cent and multiplied out by scope. */
  amount: number;
  condition: LatePickupFee["condition"];
  /** Minutes past the baseline, BEFORE grace is deducted — what to tell the owner. */
  minutesOver: number;
  /** Minutes actually charged for, after grace. */
  billableMinutes: number;
  taxRate?: number;
}

export interface FacilityDayHours {
  openTime?: string;
  closeTime?: string;
}

export interface TimeFeeInput {
  fees: LatePickupFee[] | undefined;
  serviceId: string;
  /** How many pets this bill covers. `scope: "per_pet"` multiplies by it. */
  petCount?: number;
  /** What one billable unit costs — the only input `feeType: "extra_night"` reads. */
  perUnitBase?: number;
  scheduledCheckInTime?: string;
  scheduledCheckOutTime?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  /**
   * The facility's hours on the ARRIVAL date — an `early_dropoff` rule set to
   * `basedOn: "business_hours"` measures from `openTime`.
   */
  checkInDayHours?: FacilityDayHours | null;
  /**
   * The facility's hours on the DEPARTURE date — a `late_pickup` rule set to
   * `basedOn: "business_hours"` measures from `closeTime`.
   *
   * Two fields rather than one because a boarding stay arrives on one date and
   * leaves on another, and a facility that closes at 18:00 on Friday may close
   * at 14:00 on Sunday. Both come from `facilityHoursForDate()`.
   */
  checkOutDayHours?: FacilityDayHours | null;
}

/**
 * "All services" is a sentinel, not an empty list.
 *
 * The time-fee editor writes `["all"]`, and so do the multi-pet, peak-date and
 * custom-fee editors — which is why this lives here and `pricing-rules.ts`
 * imports it rather than keeping the second copy it used to have. An absent or
 * empty list also means all: a rule that matches nothing is not a rule anyone
 * would author on purpose.
 */
export function appliesToService(
  serviceId: string,
  applicableServices?: string[],
): boolean {
  if (!applicableServices || applicableServices.length === 0) return true;
  if (applicableServices.includes("all")) return true;
  return applicableServices.includes(serviceId);
}

/** Minutes since midnight from "17:30", "5:30 PM" or an ISO timestamp's clock part. */
export function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const upper = value.toUpperCase();
  if (upper.includes("PM") && hours < 12) hours += 12;
  if (upper.includes("AM") && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Does a clock time fall inside a rule's apply-window? An open end means no bound. */
export function isWithinTimeWindow(
  appointmentMinutes: number,
  windowStart?: string,
  windowEnd?: string,
): boolean {
  const start = parseTimeToMinutes(windowStart);
  const end = parseTimeToMinutes(windowEnd);

  if (start == null && end == null) return true;
  if (start != null && end == null) return appointmentMinutes >= start;
  if (start == null && end != null) return appointmentMinutes <= end;
  if (start == null || end == null) return true;

  if (start <= end) {
    return appointmentMinutes >= start && appointmentMinutes <= end;
  }
  // A window that wraps midnight — 22:00 to 06:00.
  return appointmentMinutes >= start || appointmentMinutes <= end;
}

function variableAmount(
  feeType: LatePickupFee["feeType"],
  amount: number,
  billableMinutes: number,
  perUnitBase: number,
): number {
  switch (feeType) {
    case "flat":
      return amount;
    case "per_hour":
      return Math.ceil(billableMinutes / 60) * amount;
    case "per_30min":
      return Math.ceil(billableMinutes / 30) * amount;
    case "per_minute":
      return billableMinutes * amount;
    case "extra_night":
      return perUnitBase;
  }
}

/**
 * A moment, or null when the value is only a clock time.
 *
 * ── WHY THE DATE MATTERS, AND WHAT IT COST BEFORE ─────────────────────────
 *
 * The quote's evaluator compared CLOCK MINUTES, because when quoting a booking
 * that is all it has. The till's compared real timestamps. For a boarding stay
 * booked out at noon and collected at 9am the NEXT morning, clock minutes say
 * "three hours early" and the calendar says "twenty-one hours late" — so
 * unifying on clock minutes alone would have turned a late fee into an
 * early-drop-off refund on exactly the bookings that run overnight.
 *
 * So: full timestamps are compared as moments, and clock times are compared as
 * clock times. Both callers get the arithmetic their inputs can support.
 */
function toMoment(value?: string | null): Date | null {
  if (!value) return null;
  if (!/\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The same calendar day, at a given number of minutes past midnight. */
function atClock(day: Date, minutesOfDay: number): Date {
  const at = new Date(day);
  at.setHours(Math.floor(minutesOfDay / 60), minutesOfDay % 60, 0, 0);
  return at;
}

/**
 * Minutes past midnight, read off the LOCAL clock.
 *
 * `new Date().toISOString()` — which is what a till hands over as the actual
 * time — carries a `Z`, so reading the digits out of the string gives UTC.
 * Against a baseline of "we close at 18:00", local, that is a four-hour error
 * in Montreal and a fee on a guest who was on time.
 */
function clockMinutesOf(value?: string | null): number | null {
  const moment = toMoment(value);
  if (moment) return moment.getHours() * 60 + moment.getMinutes();
  return parseTimeToMinutes(value);
}

/**
 * The clock time a guest is measured against.
 *
 * `business_hours` READS BUSINESS HOURS now — it used to read the booked
 * check-out time, so the one setting whose whole purpose was "charge from when
 * we close" behaved identically to "charge from when they said they'd come".
 *
 * When the hours are not known it falls back to the booked time, which is
 * exactly what shipped before. Skipping the rule instead would quietly stop
 * collecting a fee every facility that never filled in its hours is collecting
 * today, and a fix is not allowed to take money off the table by surprise.
 */
function baselineClockFor(
  fee: LatePickupFee,
  scheduled: string | undefined,
): number | null {
  if (fee.basedOn === "custom_time") {
    return parseTimeToMinutes(fee.customTime) ?? clockMinutesOf(scheduled);
  }
  return clockMinutesOf(scheduled);
}

interface Candidate {
  result: TimeFeeResult;
  baselineMinutes: number;
}

function evaluate(fee: LatePickupFee, input: TimeFeeInput): Candidate | null {
  if (!fee.enabled) return null;
  if (!appliesToService(input.serviceId, fee.applicableServices)) return null;

  const late = fee.condition === "late_pickup";
  const scheduled = late
    ? input.scheduledCheckOutTime
    : input.scheduledCheckInTime;
  const actualTime = late ? input.actualCheckOutTime : input.actualCheckInTime;

  const fromHours = late
    ? input.checkOutDayHours?.closeTime
    : input.checkInDayHours?.openTime;
  const baselineMinutes =
    fee.basedOn === "business_hours"
      ? (parseTimeToMinutes(fromHours) ?? baselineClockFor(fee, scheduled))
      : baselineClockFor(fee, scheduled);

  const actualMinutes = clockMinutesOf(actualTime);
  if (baselineMinutes == null || actualMinutes == null) return null;

  if (
    (fee.applyFromTime || fee.applyUntilTime) &&
    !isWithinTimeWindow(actualMinutes, fee.applyFromTime, fee.applyUntilTime)
  ) {
    return null;
  }

  // Moments where both sides carry a date, clock minutes where they do not.
  const scheduledMoment = toMoment(scheduled);
  const actualMoment = toMoment(actualTime);
  const minutesOver =
    scheduledMoment && actualMoment
      ? (late
          ? actualMoment.getTime() -
            atClock(scheduledMoment, baselineMinutes).getTime()
          : atClock(scheduledMoment, baselineMinutes).getTime() -
            actualMoment.getTime()) / 60000
      : late
        ? actualMinutes - baselineMinutes
        : baselineMinutes - actualMinutes;
  if (minutesOver <= 0) return null;

  const billableMinutes = minutesOver - Math.max(0, fee.graceMinutes ?? 0);
  if (billableMinutes <= 0) return null;

  let amount = variableAmount(
    fee.feeType,
    Math.max(0, fee.amount),
    billableMinutes,
    Math.max(0, input.perUnitBase ?? 0),
  );
  if (fee.maxFee != null) amount = Math.min(amount, Math.max(0, fee.maxFee));
  if (amount <= 0) return null;

  const petCount = Math.max(1, Math.round(input.petCount ?? 1));
  if (fee.scope === "per_pet") amount = amount * petCount;

  return {
    baselineMinutes,
    result: {
      ruleId: fee.id,
      label:
        fee.name ||
        (fee.condition === "late_pickup"
          ? "Late pickup fee"
          : "Early drop-off fee"),
      amount: Math.round(amount * 100) / 100,
      condition: fee.condition,
      minutesOver: Math.round(minutesOver),
      billableMinutes: Math.round(billableMinutes),
      taxRate: fee.taxRate,
    },
  };
}

/**
 * Every time fee this booking owes — at most one late pickup and one early
 * drop-off. Empty is the ordinary answer and means no fee, never a default fee.
 */
export function computeTimeFees(input: TimeFeeInput): TimeFeeResult[] {
  if (!input.fees?.length) return [];

  let latest: Candidate | null = null; // late pickup: the last baseline crossed
  let earliest: Candidate | null = null; // early drop-off: the mirror

  for (const fee of input.fees) {
    const candidate = evaluate(fee, input);
    if (!candidate) continue;

    if (candidate.result.condition === "late_pickup") {
      if (!latest || candidate.baselineMinutes > latest.baselineMinutes) {
        latest = candidate;
      }
    } else if (
      !earliest ||
      candidate.baselineMinutes < earliest.baselineMinutes
    ) {
      earliest = candidate;
    }
  }

  const fees: TimeFeeResult[] = [];
  if (earliest) fees.push(earliest.result);
  if (latest) fees.push(latest.result);
  return fees;
}

/** What the time fees add to the bill, to the cent. */
export function timeFeesTotal(fees: TimeFeeResult[]): number {
  return Math.round(fees.reduce((sum, fee) => sum + fee.amount, 0) * 100) / 100;
}
