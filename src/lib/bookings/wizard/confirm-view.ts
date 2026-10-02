import type { AppLocale } from "@/lib/language-settings";
import {
  formatTimeOfDay,
  formatWeekdayDate,
  isPluralOne,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";

// ============================================================================
// What the booking wizard's Confirm and done screens say about a booking,
// worked out from plain facts (the client's mock, 2026-10-01): the pets'
// names, the one line that describes when, the status it will be created in,
// how many things are left to review, and what the button says.
// ============================================================================

type Translate = (key: string) => string;

/** "Bubu", "Bubu & Mango", "Bubu, Mango & Rocky". */
export function joinNames(names: readonly string[]): string {
  const clean = names.filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  return `${clean.slice(0, -1).join(", ")} & ${clean[clean.length - 1]}`;
}

export interface HeroFacts {
  service: string;
  /** Boarding: the stay. */
  stay?: {
    start: Date | string;
    end: Date | string;
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  /** Daycare: how many days, at what times. */
  days?: { count: number; checkIn: string; checkOut: string };
  /** An appointment: grooming, a private lesson, an evaluation. */
  slot?: {
    date: Date | string;
    start: string;
    end?: string;
    staffName?: string;
  };
  /** A group class. */
  course?: { name: string; start: Date | string; when?: string };
}

/**
 * The booking in one line, as the Confirm hero and the done screen print it:
 *
 *   boarding  Thu, Oct 1 8:00 AM → Mon, Oct 5 5:00 PM · 4 nights
 *   daycare   3 days · 8:00 AM – 5:30 PM
 *   groom     Fri, Oct 2 · 10:00 AM – 1:15 PM · with Maya R.
 *   class     Puppy Foundations · starts Sat, Oct 17 · Saturdays · 10:00 AM
 *
 * Empty when the facts are not there yet.
 */
export function heroLine(
  facts: HeroFacts,
  t: Translate,
  locale: AppLocale,
): string {
  const day = (value: Date | string) => formatWeekdayDate(value, locale);
  const time = (value: string) => formatTimeOfDay(value, locale);

  if (facts.course) {
    return fill(t("wizHeroClass"), {
      name: facts.course.name,
      date: day(facts.course.start),
      when: facts.course.when ?? "",
    }).replace(/ · $/, "");
  }
  if (facts.stay) {
    const { start, end, checkIn, checkOut, nights } = facts.stay;
    return fill(t("wizHeroStay"), {
      from: [day(start), checkIn ? time(checkIn) : ""]
        .filter(Boolean)
        .join(" "),
      to: [day(end), checkOut ? time(checkOut) : ""].filter(Boolean).join(" "),
      nights: fill(
        t(isPluralOne(nights, locale) ? "wizNightsOne" : "wizNightsOther"),
        { count: nights },
      ),
    });
  }
  if (facts.days && facts.days.count > 0) {
    const count = fill(
      t(isPluralOne(facts.days.count, locale) ? "wizDaysOne" : "wizDaysOther"),
      { count: facts.days.count },
    );
    if (!facts.days.checkIn || !facts.days.checkOut) return count;
    return fill(t("wizHeroDays"), {
      days: count,
      from: time(facts.days.checkIn),
      to: time(facts.days.checkOut),
    });
  }
  if (facts.slot) {
    const { date, start, end, staffName } = facts.slot;
    const hours = end ? `${time(start)} – ${time(end)}` : time(start);
    const line = `${day(date)} · ${hours}`;
    return staffName
      ? `${line} · ${fill(t("wizWith"), { name: staffName })}`
      : line;
  }
  return "";
}

/**
 * The status the booking will be created in:
 *
 *   staff     unsigned agreements → pending, until the last one is signed
 *             a deposit left to collect → confirmed, deposit due
 *             otherwise → confirmed
 *   customer  a service the facility approves → a request
 *             otherwise → confirmed
 */
export type PreviewStatus =
  | "confirmed"
  | "pending_agreements"
  | "deposit_due"
  | "request";

export function previewStatus(facts: {
  isCustomer: boolean;
  missingAgreements: number;
  requiresApproval: boolean;
  depositDue: boolean;
}): PreviewStatus {
  if (facts.isCustomer) return facts.requiresApproval ? "request" : "confirmed";
  if (facts.missingAgreements > 0) return "pending_agreements";
  if (facts.depositDue) return "deposit_due";
  return "confirmed";
}

/** "3 to review" counts each unsigned agreement, a vaccine and a declined evaluation. */
export function checklistIssues(facts: {
  missingAgreements: number;
  vaccinationWarning: boolean;
  evaluationDeclined: boolean;
}): number {
  return (
    facts.missingAgreements +
    (facts.vaccinationWarning ? 1 : 0) +
    (facts.evaluationDeclined ? 1 : 0)
  );
}

/** The last step's button, by the mock's words. */
export function confirmButtonKey(facts: {
  isCustomer: boolean;
  editMode: boolean;
  estimateMode: boolean;
  missingAgreements: number;
  requiresApproval: boolean;
  hasDeposit: boolean;
}): string {
  if (facts.editMode) return "saveChanges";
  if (facts.estimateMode) return "createEstimate";
  if (facts.isCustomer) {
    if (facts.requiresApproval) return "requestBooking";
    return facts.hasDeposit ? "wizBookAndPayDeposit" : "wizBookAppointment";
  }
  return facts.missingAgreements > 0 ? "wizCreateAsPending" : "createBooking";
}
