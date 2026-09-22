import type { PeakRepeatPattern, PeakSurcharge } from "@/types/boarding";

import { appliesToService } from "@/lib/policies/time-fee";

// ============================================================================
// Peak-date surcharges — what a busy night costs, and which rule decides it.
//
// ── WHY THIS IS RESOLVED PER DATE AND NOT PER RULE ────────────────────────
//
// The rule the facility expects is "if two peak rules overlap on a date, the
// highest one applies" — one surcharge on that night, not both. That sentence
// cannot be written in a loop over RULES, because the question it asks is
// about a DATE: which of the rules covering this night charges the most.
//
// So the walk is inverted. For every night being billed, every rule that
// covers it is priced, the dearest wins, and the winners are grouped back into
// one line per rule so the invoice still reads "Summer peak — $60", not sixty
// one-night entries.
//
// **For rules that do not overlap the totals are unchanged**, which is the
// property worth holding on to: `flat × nights × pets` and a sum of `flat ×
// pets` over those same nights are the same number. Only the overlap moves,
// and moving it is the point. tests/unit/peak-dates.test.ts asserts both
// halves of that.
//
// ── TWO FIELDS WERE DECLARED AND NEVER IMPLEMENTED ────────────────────────
//
// `repeatPattern` and `chargePerLodging` have been in `peakSurchargeSchema`
// since the MoéGo parity pass, and until now NOTHING read either of them.
//
// `repeatPattern` was the more dangerous of the two. A rule with
// `dateMode: "repeat"` fell through to the plain start/end span, so "surcharge
// Friday and Saturday nights" charged every night of the window — a weekend
// rule billing Monday. It never reached a facility only because the editor's
// dropdown offered "Specific" and "Holiday" and quietly never offered
// "Repeat", so the single rule in the codebase shaped that way is a fixture
// feeding the QuickBooks catalogue. This file makes the field mean what its
// name says BEFORE the editor starts offering it.
//
// ── DATES ARE COMPARED AS CALENDAR DAYS, NOT AS INSTANTS ──────────────────
//
// Weekday and week-offset arithmetic goes through `Date.UTC(y, m, d)` parsed
// out of the ISO string, never `new Date(iso)` in the machine's zone. A stay
// spanning a DST change otherwise measures 6.96 days between two Fridays, and
// `every 2 weeks` starts landing on the wrong ones — the same two-reference-
// frames defect the schedulers and the time fee each had in their own way.
// ============================================================================

export interface PeakDateContext {
  serviceId: string;
  /** The nights (boarding) or days (everything else) being billed. */
  unitDates: string[];
  /** What one unit costs with every pet on it — `basePrice / totalUnits`. */
  perUnitBase: number;
  petCount: number;
  /**
   * How many separate lodgings the pets occupy. Only `chargePerLodging` reads
   * it, and only under `first_pet_only`; everywhere else it is 1.
   */
  lodgingCount: number;
}

export interface PeakDateCharge {
  ruleId: string;
  label: string;
  amount: number;
  /** The dates this rule actually won, in order. */
  dates: string[];
}

function isoToUtcDate(dateIso: string): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso);
  if (!parts) return null;
  const date = new Date(
    Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days from `fromIso` to `toIso`, negative if it runs backwards. */
function calendarDaysBetween(fromIso: string, toIso: string): number | null {
  const from = isoToUtcDate(fromIso);
  const to = isoToUtcDate(toIso);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function isDateInRange(
  dateIso: string,
  startIso: string,
  endIso: string,
): boolean {
  return dateIso >= startIso && dateIso <= endIso;
}

/**
 * Does a recurring pattern cover this date?
 *
 * Three conditions, all required: inside the window, on one of the chosen
 * weekdays, and in an "on" week.
 *
 * **The every-X-weeks count is anchored on the window's own start date**, in
 * whole 7-day blocks — week 0 is the seven days beginning `windowStart`, week
 * 1 the seven after that. Anchoring on a calendar week instead would need a
 * week-start convention, and Sunday-vs-Monday is exactly the sort of choice
 * that reads as correct in one country and off-by-one in another. `everyXWeeks
 * = 1` means every week, so it short-circuits before any of this.
 */
export function matchesRepeatPattern(
  pattern: PeakRepeatPattern,
  dateIso: string,
): boolean {
  if (!isDateInRange(dateIso, pattern.windowStart, pattern.windowEnd)) {
    return false;
  }

  const date = isoToUtcDate(dateIso);
  if (!date) return false;

  const days = Array.isArray(pattern.daysOfWeek) ? pattern.daysOfWeek : [];
  if (days.length === 0) return false;
  if (!days.includes(date.getUTCDay())) return false;

  const every = Math.floor(pattern.everyXWeeks);
  if (!Number.isFinite(every) || every <= 1) return true;

  const elapsed = calendarDaysBetween(pattern.windowStart, dateIso);
  if (elapsed === null || elapsed < 0) return false;
  return Math.floor(elapsed / 7) % every === 0;
}

/**
 * Does one rule cover this date?
 *
 * The modes are checked in the order the editor can produce them. A rule with
 * `dateMode: "repeat"` but no pattern stored falls through to its plain span
 * rather than matching nothing — a half-saved rule should behave like the
 * simple rule it looks like, not silently stop charging.
 */
export function matchesPeakDate(rule: PeakSurcharge, dateIso: string): boolean {
  if (rule.dateMode === "holiday" && rule.holidayDates?.length) {
    return rule.holidayDates.includes(dateIso);
  }

  if (rule.dateMode === "repeat" && rule.repeatPattern) {
    return matchesRepeatPattern(rule.repeatPattern, dateIso);
  }

  if (rule.dateRanges?.length) {
    return rule.dateRanges.some((range) =>
      isDateInRange(dateIso, range.start, range.end),
    );
  }

  return isDateInRange(dateIso, rule.startDate, rule.endDate);
}

/**
 * What one rule charges for one date.
 *
 * `surchargeType` defaults to `"percentage"` and must keep doing so. Rules
 * stored before the type existed carry a `surchargePercent` and no
 * `surchargeType`; reading those as flat would turn `surchargePercent: 20`
 * from a fifth of the night into twenty dollars, on live rules, with nothing
 * on screen changing.
 *
 * `chargePerLodging` is only consulted under `first_pet_only`, because that is
 * the only place it means anything: it widens "the first pet" from one per
 * booking to one per lodging. Under `per_each_pet` every pet is already paying.
 */
export function peakChargeForDate(
  rule: PeakSurcharge,
  context: PeakDateContext,
): number {
  const firstPetOnly = rule.scope === "first_pet_only";
  const pets = Math.max(1, context.petCount);

  if ((rule.surchargeType ?? "percentage") === "flat") {
    const flat = Math.max(
      0,
      rule.surchargeAmount ?? rule.surchargePercent ?? 0,
    );
    const chargedUnits = firstPetOnly
      ? rule.chargePerLodging
        ? Math.max(1, context.lodgingCount)
        : 1
      : pets;
    return flat * chargedUnits;
  }

  const percent = Math.max(0, rule.surchargePercent ?? 0) / 100;
  const base =
    firstPetOnly && pets > 1 ? context.perUnitBase / pets : context.perUnitBase;
  return base * percent;
}

/**
 * The surcharge lines for a booking — one per rule that won at least one date.
 *
 * Ties keep the earlier rule, because `>` does: two rules charging the same
 * amount on a night are the same money either way, and picking by list order
 * at least makes the invoice reproducible.
 */
export function resolvePeakDateCharges(
  rules: PeakSurcharge[],
  context: PeakDateContext,
): PeakDateCharge[] {
  const eligible = rules.filter(
    (rule) =>
      rule.isActive &&
      appliesToService(context.serviceId, rule.applicableServices),
  );
  if (eligible.length === 0) return [];

  const won = new Map<string, PeakDateCharge>();

  for (const dateIso of context.unitDates) {
    let winner: PeakSurcharge | null = null;
    let best = 0;

    for (const rule of eligible) {
      if (!matchesPeakDate(rule, dateIso)) continue;
      const amount = peakChargeForDate(rule, context);
      if (amount > best) {
        best = amount;
        winner = rule;
      }
    }

    if (!winner || best <= 0) continue;

    const line = won.get(winner.id);
    if (line) {
      line.amount += best;
      line.dates.push(dateIso);
    } else {
      won.set(winner.id, {
        ruleId: winner.id,
        label: winner.name,
        amount: best,
        dates: [dateIso],
      });
    }
  }

  return Array.from(won.values());
}
