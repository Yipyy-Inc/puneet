import type {
  AddonSchedule,
  HeatCycleInfo,
  MedicationSchedule,
  PostSurgeryInfo,
} from "@/types/boarding";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";

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
  kennelName: string;
  packageType: string;
  totalNights: number;
  /** `YYYY-MM-DD`. */
  checkInDate: string;
  checkOutDate: string;
  allergies: string[];
  feedingInstructions: string;
  foodBrand: string;
  /** "HH:MM", one per meal occasion. */
  feedingTimes: string[];
  feedingAmount: string;
  medications: MedicationSchedule[];
  addOns?: AddonSchedule[];
  postSurgery?: PostSurgeryInfo;
  heatCycle?: HeatCycleInfo;
  tags?: string[];
  notes: string;
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
    item.occasions.map((occasion) => occasion.time).filter(Boolean),
  );
  return [...new Set(times)].sort();
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
function feedingInstructionsFrom(schedule: FeedingScheduleItem[]): string {
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
 * The owner's medications as dose rows.
 *
 * `requiresPhotoProof` is FALSE for every one of them, and deliberately: Yipyy
 * cannot photograph a dose (see PhotoProofNotice), so carrying a requirement
 * nothing can satisfy would block the log rather than document the dose. The
 * `isHighRisk` flag the booking captures is preserved in the instructions,
 * where a person reads it.
 */
function medicationsFrom(medications: MedicationItem[]): MedicationSchedule[] {
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
    // The board folds a with-food dose into the nearest meal, so staff serve
    // the bowl and give the tablet in one pass. Both spellings the booking flow
    // uses, because a booking taken before the second one existed still says
    // the first.
    withFood:
      med.givenWith === "mixed_in_food" ||
      (med.adminInstructions ?? []).includes("with_food"),
  })) as MedicationSchedule[];
}

/**
 * One real booking, as a guest the board can schedule.
 *
 * @param arrival the stay, from the boarding attendance read
 * @param details the booking's own `details` jsonb
 */
export function careGuestFromBooking(
  arrival: {
    id: string;
    petId: number;
    petNames: string[];
    ownerName: string;
    roomName: string | null;
    scheduledArrival: string;
    scheduledDeparture: string;
    nights: number;
  },
  details: BookingCareDetails,
): CareGuest {
  const schedule = details.feedingSchedule ?? [];

  return {
    id: arrival.id,
    bookingId: arrival.id,
    petId: arrival.petId,
    // Multi-pet bookings show as one guest with both names, which is how the
    // kennel card reads — they share a run and are fed together.
    petName: arrival.petNames.join(" & ") || "Guest",
    ownerName: arrival.ownerName,
    // No photo rather than a placeholder: a broken image on a floor board is
    // read as a broken screen.
    petPhotoUrl: undefined,
    kennelName: arrival.roomName ?? "Unassigned",
    packageType: details.packageType ?? "Boarding",
    totalNights: arrival.nights,
    checkInDate: arrival.scheduledArrival.slice(0, 10),
    checkOutDate: arrival.scheduledDeparture.slice(0, 10),
    allergies: allergiesFrom(schedule),
    feedingInstructions: feedingInstructionsFrom(schedule),
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
      schedule[0]?.occasions[0]?.components?.[0]?.amount?.toString() ?? "",
    medications: medicationsFrom(details.medications ?? []),
    addOns: details.addOns,
    postSurgery: details.postSurgery,
    heatCycle: details.heatCycle,
    tags: details.tags,
    notes: details.specialRequests ?? "",
  };
}
