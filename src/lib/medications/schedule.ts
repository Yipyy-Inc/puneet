import type { MedDayRule } from "@/types/base";
import type { MedicationItem } from "@/types/booking";

// ============================================================================
// Which days of a stay a medication is given, at which times, and how much it
// takes. ONE place, because five readers have to agree: the booking form's
// panel and supply check, the server pricing what the facility supplies, the
// booking page's dose rows, the checkout care gate and the daily care board.
// A dose the gate demands on a day the form said "not this day" would block a
// checkout over a dose nobody was meant to give.
// ============================================================================

/** A stay as the medications step reads it. */
export interface MedStay {
  /** Every booked day, ascending, `YYYY-MM-DD`. */
  days: string[];
  /**
   * An overnight stay: its last day is the checkout day, and "every day except
   * checkout" means something. A daycare booking's days are separate visits.
   */
  overnight: boolean;
}

type ScheduleFields = Pick<
  MedicationItem,
  "dayRule" | "specificDays" | "times"
>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Every calendar day from `start` to `end`, both included. */
export function daysBetween(start: string, end: string): string[] {
  if (!ISO_DAY.test(start) || !ISO_DAY.test(end) || end < start) {
    return ISO_DAY.test(start) ? [start] : [];
  }
  // Calendar arithmetic in UTC: a day is a day whatever the clocks did.
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  const days: string[] = [];
  // A year and a bit is the longest stay anyone books; the cap keeps a
  // malformed range from building a list the size of a century.
  while (cursor <= last && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** A booking's stay: an overnight range, or the days it was booked for. */
export function stayOf(input: {
  overnight: boolean;
  start?: string;
  end?: string;
  dates?: string[];
}): MedStay {
  if (input.dates && input.dates.length > 0) {
    return {
      days: [...new Set(input.dates.filter((d) => ISO_DAY.test(d)))].sort(),
      overnight: input.overnight,
    };
  }
  if (!input.start) return { days: [], overnight: input.overnight };
  return {
    days: daysBetween(input.start, input.end ?? input.start),
    overnight: input.overnight,
  };
}

/** The stay has a checkout day of its own. */
export function hasCheckoutDay(stay: MedStay): boolean {
  return stay.overnight && stay.days.length >= 2;
}

/**
 * The rule as it applies to this stay. A row written before the rule existed
 * was given every day. "Except checkout" on a stay with no checkout day of its
 * own — a daycare visit — is every booked day.
 */
export function dayRuleOn(
  item: Pick<MedicationItem, "dayRule">,
  stay: MedStay,
): MedDayRule {
  const rule = item.dayRule ?? "every_day";
  if (rule === "except_checkout" && !hasCheckoutDay(stay)) return "every_day";
  return rule;
}

/** The days of `stay` the medication is given on. */
export function activeDays(
  item: Pick<MedicationItem, "dayRule" | "specificDays">,
  stay: MedStay,
): string[] {
  switch (dayRuleOn(item, stay)) {
    case "except_checkout":
      return stay.days.slice(0, -1);
    case "certain_dates": {
      const chosen = new Set(item.specificDays ?? []);
      return stay.days.filter((day) => chosen.has(day));
    }
    default:
      return stay.days;
  }
}

/**
 * Whether a dose is due on `day`. A reader that knows the stay asks it; one
 * that does not still honours chosen dates, and treats everything else as
 * every day, which is what every row meant before the rule existed.
 *
 * Inside the stay this is exactly `activeDays`. Outside it — a guest still in
 * the building after the booked checkout — only chosen dates are kept to:
 * "every day" and "every day except checkout" go on being given, because a
 * dog who stayed longer still needs the tablet.
 */
export function isActiveOn(
  item: Pick<MedicationItem, "dayRule" | "specificDays">,
  day: string,
  stay?: MedStay,
): boolean {
  if (!stay || stay.days.length === 0) {
    return item.dayRule === "certain_dates"
      ? (item.specificDays ?? []).includes(day)
      : true;
  }
  switch (dayRuleOn(item, stay)) {
    case "certain_dates":
      return (item.specificDays ?? []).includes(day);
    case "except_checkout":
      return day !== stay.days[stay.days.length - 1];
    default:
      return true;
  }
}

/**
 * A saved booking's stay, from its own days — the facility's days, as the
 * booking reads them. Boarding is the overnight service, so its last day is
 * the checkout; any other booking's days are visits (the form books daycare
 * one booking per day).
 */
export function bookingStay(booking: {
  service?: string;
  startDate?: string;
  endDate?: string;
}): MedStay {
  return stayOf({
    overnight: booking.service === "boarding",
    start: booking.startDate,
    end: booking.endDate || booking.startDate,
  });
}

/** The times of day, each once, in the order of the day. */
export function doseTimes(item: Pick<MedicationItem, "times">): string[] {
  return [...new Set((item.times ?? []).filter((t) => CLOCK.test(t)))].sort();
}

/** Doses over the stay: days given × times a day. */
export function doseCount(item: ScheduleFields, stay: MedStay): number {
  return activeDays(item, stay).length * doseTimes(item).length;
}

// ── SUPPLY ─────────────────────────────────────────────────────────────────

export type SupplyCheck =
  | { kind: "unscheduled" }
  | { kind: "needed"; need: number; exact: number }
  | { kind: "short"; need: number; exact: number; short: number }
  | { kind: "enough"; need: number; exact: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * How much the stay takes, against what is being brought.
 *
 * A form counted in whole things — tablets, chews, scoops — rounds UP: ½ a
 * tablet twice a day for four days is 4 tablets, and ¼ once a day for five
 * days uses 1¼, so 2 have to come. A measured one (ml, units) stays exact.
 * `exact` travels with `need`, so a screen can say when it rounded.
 */
export function supplyCheck(input: {
  doses: number;
  amount: number;
  /** Counted in whole things, so rounded up. */
  wholeUnits: boolean;
  /** What is being brought; null when nothing was entered. */
  brought: number | null;
}): SupplyCheck {
  const exact = round2(input.doses * input.amount);
  const need = input.wholeUnits ? Math.ceil(exact - 1e-9) : exact;
  if (!(need > 0)) return { kind: "unscheduled" };
  if (input.brought === null || !Number.isFinite(input.brought)) {
    return { kind: "needed", need, exact };
  }
  if (input.brought < need) {
    return { kind: "short", need, exact, short: round2(need - input.brought) };
  }
  return { kind: "enough", need, exact };
}

// ── THE PANEL ──────────────────────────────────────────────────────────────

export interface StayDayRow {
  day: string;
  tag: "check_in" | "checkout" | null;
  doses: { time: string; name: string }[];
}

/**
 * One row per day of the stay, each dose that day by time with its
 * medication's name — the panel beside the medications step.
 */
export function stayRows(
  items: (ScheduleFields & Pick<MedicationItem, "name">)[],
  stay: MedStay,
): StayDayRow[] {
  const checkout = hasCheckoutDay(stay);
  return stay.days.map((day, index) => {
    const doses = items.flatMap((item) =>
      isActiveOn(item, day, stay)
        ? doseTimes(item).map((time) => ({ time, name: item.name }))
        : [],
    );
    doses.sort((a, b) => a.time.localeCompare(b.time));
    return {
      day,
      tag: !checkout
        ? null
        : index === 0
          ? "check_in"
          : index === stay.days.length - 1
            ? "checkout"
            : null,
      doses,
    };
  });
}
