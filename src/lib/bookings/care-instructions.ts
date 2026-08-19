import type { CareLogEntry } from "@/app/api/care-log/route";
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

/**
 * The owner's medications, as the panel's dose rows.
 *
 * @param day the stay day these doses belong to, `YYYY-MM-DD`. The panel
 *   formats `scheduledAt` with `new Date(...)`, so a bare "08:00" renders as
 *   "12:undefined AM" — it needs a timestamp, and a timestamp needs a day.
 */
export function medicationEntriesFromItems(
  medications: MedicationItem[] | undefined,
  day: string,
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
      // One pending dose per scheduled time. A medication with times and no
      // doses renders as a name with nothing to give, which is not what
      // "twice daily at 08:00 and 20:00" means.
      doses: med.times.map((t) => ({
        scheduledAt: `${day}T${t}:00`,
        status: "pending" as const,
      })),
    };
  });
}

// ============================================================================
// Folding the care log back in.
//
// The entries above are what was ASKED FOR. `care_log_entries` is what was
// DONE. These merge the second into the first so one panel shows both, which
// is how somebody at the kennel reads it: this meal, at this time, and whether
// it happened.
//
// Keyed on the entry's own id for feeding and on `<medication>#<time>` for a
// dose. Those keys are what the panel sends back as `task_key`, so the round
// trip is closed: the same string identifies the slot going out and coming in.
// ============================================================================

/** The task key a feeding row logs under. */
export function feedingTaskKey(entry: FeedingEntry): string {
  return entry.id;
}

/**
 * The task key one scheduled dose logs under.
 *
 * Keyed on the TIME OF DAY, never the full timestamp: the same 08:00 dose
 * recurs every day of a stay, and `care_log_entries` already separates the
 * days with `occurred_on`. A date-qualified key would make the constraint
 * that keeps one record per dose per day do nothing.
 *
 * Accepts either form, because `scheduledAt` is a timestamp for display and
 * an "HH:MM" on the fixture path.
 */
export function medicationTaskKey(
  medicationId: string,
  scheduledAt: string,
): string {
  const time = scheduledAt.includes("T")
    ? scheduledAt.slice(11, 16)
    : scheduledAt.slice(0, 5);
  return `${medicationId}#${time}`;
}

/** A stamp that changes whenever the log does, for remounting the panels. */
export function careLogStamp(log: CareLogEntry[] | undefined): string {
  if (!log?.length) return "empty";
  return `${log.length}:${log.map((e) => e.id).join("")}`.slice(0, 120);
}

function forDay(
  log: CareLogEntry[] | undefined,
  taskKey: string,
  day: string,
): CareLogEntry | undefined {
  return log?.find((e) => e.taskKey === taskKey && e.occurredOn === day);
}

export function applyFeedingLog(
  entries: FeedingEntry[],
  log: CareLogEntry[] | undefined,
  day: string,
): FeedingEntry[] {
  return entries.map((entry) => {
    const done = forDay(log, feedingTaskKey(entry), day);
    if (!done) return entry;
    return {
      ...entry,
      status: "completed" as FeedingEntry["status"],
      feedback: done.outcome,
      completedBy: done.recordedByName ?? "Staff",
      // The panel formats this as a time; the row carries the day and the
      // clock time separately, so they are put back together here.
      completedAt: `${done.occurredOn}T${done.executedAt}:00`,
      notes: done.notes ?? entry.notes,
    };
  });
}

export function applyMedicationLog(
  entries: MedicationEntry[],
  log: CareLogEntry[] | undefined,
  day: string,
): MedicationEntry[] {
  return entries.map((med) => ({
    ...med,
    doses: med.doses.map((dose) => {
      const done = forDay(
        log,
        medicationTaskKey(med.id, dose.scheduledAt),
        day,
      );
      if (!done) return dose;
      return {
        ...dose,
        // The log's own vocabulary, narrowed to what a dose can be. Anything
        // unrecognised counts as given rather than silently pending — the row
        // exists because somebody acted.
        status: (["given", "skipped", "refused"] as const).includes(
          done.outcome as "given" | "skipped" | "refused",
        )
          ? (done.outcome as "given" | "skipped" | "refused")
          : ("given" as const),
        administeredBy: done.recordedByName ?? "Staff",
        administeredAt: `${done.occurredOn}T${done.executedAt}:00`,
        notes: done.notes ?? dose.notes,
      };
    }),
  }));
}
