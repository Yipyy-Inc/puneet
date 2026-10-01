import type { IncidentCareAction, IncidentMedication } from "@/types/incidents";
import type {
  AddonSchedule,
  HeatCycleInfo,
  MedAdminMethod,
  MedFrequencyRule,
  MedicationSchedule,
  PostSurgeryInfo,
} from "@/types/boarding";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import { mealPrep, mealWhat, planExtras } from "@/lib/feeding/describe";
import { planFromItem } from "@/lib/feeding/plan";
import { sortedMeals } from "@/lib/feeding/schedule";
import type { AppLocale } from "@/lib/language-settings";
import type { Translate } from "@/lib/medications/dose";
import { dayRuleOn, type MedStay } from "@/lib/medications/schedule";
import {
  SHIPPED_FEEDING_INSTRUCTIONS,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";

// ============================================================================
// A guest, as the Daily Care scheduler needs one.
//
// ── WHY THIS TYPE EXISTS ──────────────────────────────────────────────────
//
// `generateScheduledTasks` took `BoardingGuest[]` — the fixture's 30-field
// shape, with a nightly rate, a peak surcharge and a total price on it. It uses
// twenty-one of those fields and none of the money ones, and requiring the
// whole shape is what kept the board on `getCurrentGuests()`: a real booking
// cannot produce a `discountApplied`, so a real booking could not be a guest.
//
// `BoardingGuest` still satisfies this structurally, so the fixture-backed
// callers (the reservation journal, the employee task count) keep working
// untouched.
//
// ── WHERE THE CARE INSTRUCTIONS ACTUALLY LIVE ─────────────────────────────
//
// On the booking, in `details` — `feedingSchedule` and `medications`, the rich
// shapes the booking flow captures. Those are REAL and always have been; the
// booking detail page's FEEDING and MEDICATIONS panels read exactly them.
//
// They are not the shapes the scheduler wants, which is the whole reason for
// the conversion below: a schedule is "breakfast and dinner, this food, these
// allergies" as one item covering the stay, and the board wants a list of
// times. Nothing here invents an instruction that was not given.
// ============================================================================

export interface CareGuest {
  /** The BOOKING's ref, as a string. Every care log keys on it. */
  id: string;
  bookingId?: string;
  petId: number;
  petName: string;
  petPhotoUrl?: string;
  ownerName: string;
  ownerPhone?: string;
  kennelName: string;
  packageType: string;
  totalNights: number;
  /** `YYYY-MM-DD`. */
  checkInDate: string;
  checkOutDate: string;
  allergies: string[];
  feedingInstructions: string;
  foodBrand: string;
  /** "HH:MM", one per meal occasion, every day of the stay. */
  feedingTimes: string[];
  feedingAmount: string;
  /**
   * Each meal in words, with the days it is served (2026-10-01): what to put
   * in the bowl at that time — naming the pet when the guest is several — and
   * the day rule the board checks against the day it shows, as a dose's.
   * Present when the caller could word it; the fields above stand in when not.
   */
  feedingMeals?: CareMeal[];
  medications: MedicationSchedule[];
  addOns?: AddonSchedule[];
  postSurgery?: PostSurgeryInfo;
  heatCycle?: HeatCycleInfo;
  tags?: string[];
  notes: string;
  /** The stay-long care note staff set on the booking (`details.careNote`). */
  careNote?: string;
  /** Active in-stay care from this pet's incidents, one entry per incident. */
  incidentCare?: GuestIncidentCare[];
}

/** One meal of a guest's plans, as the board serves it. */
export interface CareMeal {
  /** "HH:MM". */
  time: string;
  /** The days it is served; none is every day. */
  rule?: MedFrequencyRule;
  /** "Bella: 1 cup Orijen Original (dry kibble) · Serve dry". */
  what: string;
}

/** What the board words a guest's meals with. */
export interface CareWords {
  t: Translate;
  locale: AppLocale;
  /** The facility's feeding settings, or what ships. */
  settings?: FeedingInstructions;
}

/** One incident's care still to give — read by pet, see /api/daily-care. */
export interface GuestIncidentCare {
  /** The incident's uuid. */
  id: string;
  careActions: IncidentCareAction[];
  incidentMedications: IncidentMedication[];
}

/** What a booking's `details` carries that the board cares about. */
export interface BookingCareDetails {
  feedingSchedule?: FeedingScheduleItem[];
  medications?: MedicationItem[];
  addOns?: AddonSchedule[];
  postSurgery?: PostSurgeryInfo;
  heatCycle?: HeatCycleInfo;
  tags?: string[];
  specialRequests?: string;
  packageType?: string;
  careNote?: string;
}

/**
 * The meal times an owner asked for.
 *
 * One entry per OCCASION, not per schedule item: "breakfast and dinner" is a
 * single item with two occasions, and collapsing it would feed the dog once.
 * De-duplicated and sorted, because two pets on one booking with the same
 * breakfast time is one trip to the kitchen, not two.
 */
function feedingTimesFrom(schedule: FeedingScheduleItem[]): string[] {
  const times = schedule.flatMap((item) =>
    (Array.isArray(item?.occasions) ? item.occasions : [])
      .map((occasion) => occasion?.time)
      .filter((time): time is string => Boolean(time)),
  );
  return [...new Set(times)].sort();
}

/**
 * Every meal of every plan, in words, with its days. A plan with no pet is
 * the one pet's of an older single-pet booking, so it names nobody.
 */
function feedingMealsFrom(
  schedule: FeedingScheduleItem[],
  stay: MedStay | undefined,
  words: CareWords,
  petNames: Map<number, string>,
): CareMeal[] {
  const settings = words.settings ?? SHIPPED_FEEDING_INSTRUCTIONS;
  const named = petNames.size > 1;
  return schedule.flatMap((item) => {
    if (!item || !Array.isArray(item.occasions)) return [];
    const plan = planFromItem(item, {
      settings,
      stay: stay ?? { days: [], overnight: true },
    });
    const rule = dayRuleFrom(item, stay);
    const pet =
      named && item.petId !== undefined ? petNames.get(item.petId) : undefined;
    return sortedMeals(plan.meals).map((meal) => {
      const text = [
        mealWhat(words.t, plan, meal.id, words.locale, settings),
        ...mealPrep(words.t, plan, meal.id),
      ]
        .filter(Boolean)
        .join(" · ");
      return { time: meal.time, rule, what: pet ? `${pet}: ${text}` : text };
    });
  });
}

/** Every allergy named across the schedule, once each. */
function allergiesFrom(schedule: FeedingScheduleItem[]): string[] {
  return [...new Set(schedule.flatMap((item) => item.allergies ?? []))];
}

/**
 * The owner's instructions as one paragraph.
 *
 * Joined rather than picked: prep notes, the feeding instruction and what to do
 * if the dog refuses are three different things somebody at the bowl needs, and
 * choosing one of them to show is choosing which two to hide.
 */
function feedingInstructionsFrom(
  schedule: FeedingScheduleItem[],
  words?: CareWords,
): string {
  if (words) {
    // The owner's whole plan in the reader's words — style, habits, what
    // to do about a skipped meal, treats, notes — but not allergies, which
    // the board shows on a line of their own.
    const settings = words.settings ?? SHIPPED_FEEDING_INSTRUCTIONS;
    return schedule
      .flatMap((item) =>
        item && typeof item === "object"
          ? planExtras(
              words.t,
              planFromItem(item, {
                settings,
                stay: { days: [], overnight: true },
              }),
              words.locale,
              {
                skip: typeof item.skipMeal === "string",
                treats: typeof item.treats === "string",
                allergies: false,
              },
            )
          : [],
      )
      .join(" · ");
  }
  return schedule
    .flatMap((item) => [
      item.prepNotes?.trim(),
      item.feedingInstruction?.trim(),
      item.refusalNotes?.trim(),
      item.notes?.trim(),
    ])
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/**
 * The days a medication is given, as the board's rule: chosen dates, or every
 * day but the checkout day. None for "every day", and none for a row written
 * before the rule existed — which is what both always meant. As DATES on the
 * facility's calendar, so the board compares today's date and never counts
 * days of a stay from a check-in read in UTC.
 */
function dayRuleFrom(
  med: Pick<MedicationItem, "dayRule" | "specificDays">,
  stay: MedStay | undefined,
): MedFrequencyRule | undefined {
  if (!stay || stay.days.length === 0) {
    return med.dayRule === "certain_dates"
      ? { type: "specific_dates", dates: med.specificDays ?? [] }
      : undefined;
  }
  switch (dayRuleOn(med, stay)) {
    case "certain_dates":
      return { type: "specific_dates", dates: med.specificDays ?? [] };
    case "except_checkout":
      return { type: "except_dates", dates: [stay.days[stay.days.length - 1]] };
    default:
      return undefined;
  }
}

/** How the dose goes in — the board said "oral" for an eye drop. */
function adminMethodFrom(med: MedicationItem): MedAdminMethod | undefined {
  if (med.form === "eye_drops" || med.givenWith === "eye") return "eye_drops";
  if (med.form === "ear_drops" || med.givenWith === "ear") return "ear_drops";
  if (med.form === "topical") return "topical";
  if (med.form === "injection") return "injection";
  return undefined;
}

/**
 * The owner's medications as dose rows.
 *
 * `requiresPhotoProof` is FALSE for every one of them, and deliberately: Yipyy
 * cannot photograph a dose (see PhotoProofNotice), so carrying a requirement
 * nothing can satisfy would block the log rather than document the dose. The
 * `isHighRisk` flag the booking captures is preserved in the instructions,
 * where a person reads it.
 */
function medicationsFrom(
  medications: MedicationItem[],
  stay: MedStay | undefined,
): MedicationSchedule[] {
  return medications.map((med) => ({
    id: med.id,
    medicationName: med.name,
    dosage: [med.amount, med.strength].filter(Boolean).join(" ").trim(),
    frequency: med.frequency,
    times: med.times ?? [],
    instructions: [
      med.isHighRisk ? "HIGH RISK" : "",
      med.purpose?.trim() ? `For ${med.purpose.trim()}` : "",
      med.adminNotes?.trim(),
      med.givenWithNotes?.trim(),
      med.frequencyNotes?.trim(),
    ]
      .filter(Boolean)
      .join(" · "),
    requiresPhotoProof: false,
    frequencyRule: dayRuleFrom(med, stay),
    administrationMethod: adminMethodFrom(med),
    // The board folds a with-food dose into the nearest meal, so staff serve
    // the bowl and give the tablet in one pass. Both spellings the booking flow
    // uses, because a booking taken before the second one existed still says
    // the first — and never one the owner said goes on an empty stomach.
    withFood:
      med.food !== "empty" &&
      (med.food === "with" ||
        med.givenWith === "mixed_in_food" ||
        (med.adminInstructions ?? []).includes("with_food")),
  })) as MedicationSchedule[];
}

/**
 * One real booking, as a guest the board can schedule.
 *
 * @param arrival the stay, from the boarding attendance read; `stay` is its
 *   days on the facility's calendar, which a medication's days are read against
 * @param details the booking's own `details` jsonb
 * @param words what to word its meals with — the caller's language. Without
 *   them the meals are the stored times and the first meal's amount, as before.
 */
export function careGuestFromBooking(
  arrival: {
    id: string;
    petId: number;
    petNames: string[];
    /** Each pet's name by its ref, to say whose a meal is. */
    petNamesByRef?: Record<number, string>;
    ownerName: string;
    ownerPhone?: string | null;
    roomName: string | null;
    scheduledArrival: string;
    scheduledDeparture: string;
    nights: number;
    stay?: MedStay;
  },
  details: BookingCareDetails,
  words?: CareWords,
): CareGuest {
  const schedule = Array.isArray(details.feedingSchedule)
    ? details.feedingSchedule.filter(
        (item): item is FeedingScheduleItem =>
          Boolean(item) && typeof item === "object",
      )
    : [];

  return {
    id: arrival.id,
    bookingId: arrival.id,
    petId: arrival.petId,
    // Multi-pet bookings show as one guest with both names, which is how the
    // kennel card reads — they share a run and are fed together.
    petName: arrival.petNames.join(" & ") || "Guest",
    ownerName: arrival.ownerName,
    ownerPhone: arrival.ownerPhone ?? undefined,
    // No photo rather than a placeholder: a broken image on a floor board is
    // read as a broken screen.
    petPhotoUrl: undefined,
    kennelName: arrival.roomName ?? "Unassigned",
    packageType: details.packageType ?? "Boarding",
    totalNights: arrival.nights,
    checkInDate: arrival.scheduledArrival.slice(0, 10),
    checkOutDate: arrival.scheduledDeparture.slice(0, 10),
    allergies: allergiesFrom(schedule),
    feedingInstructions: feedingInstructionsFrom(schedule, words),
    // The booking flow records the food SOURCE (owner's / facility's), not a
    // brand. Saying "Owner's food" is true; inventing a brand would not be.
    foodBrand:
      schedule[0]?.source === "facility_provides"
        ? "Facility food"
        : schedule[0]?.source === "mix"
          ? "Owner's food + facility food"
          : "",
    feedingTimes: feedingTimesFrom(schedule),
    feedingAmount:
      schedule[0]?.occasions?.[0]?.components?.[0]?.amount?.toString() ?? "",
    feedingMeals: words
      ? feedingMealsFrom(
          schedule,
          arrival.stay,
          words,
          new Map(
            Object.entries(arrival.petNamesByRef ?? {}).map(([ref, name]) => [
              Number(ref),
              name,
            ]),
          ),
        )
      : undefined,
    medications: medicationsFrom(details.medications ?? [], arrival.stay),
    addOns: details.addOns,
    postSurgery: details.postSurgery,
    heatCycle: details.heatCycle,
    tags: details.tags,
    notes: details.specialRequests ?? "",
    careNote: details.careNote || undefined,
  };
}
