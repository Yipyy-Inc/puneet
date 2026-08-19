import type {
  FeedingEntry,
  FeedingScheduleItem,
  MedicationEntry,
  MedicationItem,
} from "@/types/booking";

// ============================================================================
// The owner's care instructions, in the shape the booking page renders.
//
// ── THE GAP THIS CLOSES ───────────────────────────────────────────────────
//
// Reported from the running app: the booking detail page's FEEDING
// INSTRUCTIONS and MEDICATIONS panels were empty, and had been for every
// booking since the migration.
//
// They read `booking.feedingInstructions` and `booking.medicationInstructions`.
// The booking wizard collects and stores `booking.feedingSchedule` and
// `booking.medications`. Different names AND different types — so the panels
// could never fill from a booking made in this app. The only things that ever
// populated them were two hand-written entries in `src/data/bookings.ts`,
// which is why it looked right with demo data and empty with real data.
//
// ── WHY A MAPPING RATHER THAN A RENAME ────────────────────────────────────
//
// The two shapes are different on purpose and both are worth keeping:
//
//   FeedingScheduleItem  what the OWNER asked for — occasions, components,
//                        prep, allergies, what to do if the dog refuses.
//                        Collected once, at booking.
//   FeedingEntry         what STAFF DO — a meal at a time, with a status, who
//                        completed it and how it went.
//
// Renaming one to the other would lose the distinction and, worse, would imply
// the owner's instructions are a completed care record. So the schedule is
// projected into the entry shape for display, with `status: "pending"`: this is
// what has been asked for, and none of it has been done yet.
//
// Pure and total: no dates, no ids from outside, nothing that can throw. That
// is what lets the page call it during render.
// ============================================================================

/**
 * `twice_daily` -> "Twice daily".
 *
 * The enums are stored as snake_case and were rendering raw on the booking
 * page, which reads as a leaked database value rather than a dose.
 */
function humanise(value: string | null | undefined): string {
  if (!value) return "";
  const spaced = value.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** "1.5 cups Kibble + 1 scoop Topper", or "" when a meal names nothing. */
function describeAmount(
  components: FeedingScheduleItem["occasions"][number]["components"],
): string {
  return components
    .map((c) => [c.amount, c.unit].filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .join(" + ");
}

function describeFood(
  components: FeedingScheduleItem["occasions"][number]["components"],
  source: FeedingScheduleItem["source"],
): string {
  const named = components.map((c) => c.name.trim()).filter(Boolean);
  if (named.length > 0) return [...new Set(named)].join(", ");
  // `source` is the fallback rather than a blank: "owner" or "facility" still
  // tells the person at the desk where the food comes from.
  return humanise(source);
}

/**
 * One display entry per feeding OCCASION, not per schedule item.
 *
 * A schedule is "breakfast and dinner, this food, these allergies" — one item
 * covering the whole stay. The panel lists meals, so a two-occasion schedule
 * becomes two rows. Collapsing them into one would hide the second meal.
 */
export function feedingEntriesFromSchedule(
  schedule: FeedingScheduleItem[] | undefined,
): FeedingEntry[] {
  if (!schedule?.length) return [];

  return schedule.flatMap((item) =>
    item.occasions.map((occasion) => {
      // Everything the owner said that a meal row can carry, in the order
      // somebody feeding the dog would want it.
      const notes = [
        item.prepNotes?.trim(),
        item.feedingInstruction?.trim(),
        item.allergies.length > 0
          ? `Allergies: ${item.allergies.join(", ")}`
          : "",
        item.refusalNotes?.trim()
          ? `If refused: ${item.refusalNotes.trim()}`
          : "",
        item.notes?.trim(),
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        id: `sched-${item.id}-${occasion.id}`,
        label: occasion.label,
        time: occasion.time,
        amount: describeAmount(occasion.components),
        foodType: describeFood(occasion.components, item.source),
        instructions: notes || undefined,
        // Asked for, not yet done. The panel's own status vocabulary.
        status: "pending" as FeedingEntry["status"],
      };
    }),
  );
}

/** The owner's medications, as the panel's dose rows. */
export function medicationEntriesFromItems(
  medications: MedicationItem[] | undefined,
): MedicationEntry[] {
  if (!medications?.length) return [];

  return medications.map((med) => {
    const instructions = [
      med.purpose?.trim() ? `For ${med.purpose.trim()}` : "",
      med.adminNotes?.trim(),
      med.givenWithNotes?.trim(),
      med.frequencyNotes?.trim(),
      med.notes?.trim(),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: med.id,
      name: med.name,
      // Strength belongs with the amount — "1 tablet" alone is not a dose.
      dosage: [med.amount, med.strength].filter(Boolean).join(" ").trim(),
      method: humanise(med.form),
      frequency: humanise(med.frequency),
      times: med.times,
      instructions: instructions || undefined,
      // `isHighRisk` is the owner's flag and `isCritical` is the panel's; they
      // mean the same thing to the person holding the pill.
      isCritical: med.isHighRisk === true,
      // No doses: a dose is a record of something administered, and nothing
      // has been. An empty list is the truthful start.
      doses: [],
    };
  });
}
