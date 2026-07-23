import type { BoardingGuest, MedicationSchedule } from "@/data/boarding";
import type {
  FacilityDailyCareConfig,
  DailyCareStep,
  MedFrequencyRule,
} from "@/types/boarding";
import type { ScheduledTask, ShiftType } from "@/types/care-log";
import { getIncidentsForPet } from "@/data/incidents";
import type { IncidentCareAction, IncidentMedication } from "@/types/incidents";

// F1: whether a step's configured "Who This Task Applies To" rule includes a
// given guest. Undefined / "all" = every current boarding guest (the default,
// preserving the previous behaviour). Otherwise the booking-driven rule gates
// the step's pet list.
function guestMatchesAppliesTo(
  guest: BoardingGuest,
  appliesTo: DailyCareStep["appliesTo"],
  guestTags: Set<string>,
): boolean {
  if (!appliesTo || appliesTo.kind === "all") return true;
  switch (appliesTo.kind) {
    case "feeding_plan":
      return guest.feedingTimes.length > 0;
    case "medications":
      return guest.medications.length > 0;
    case "addon":
      return (guest.addOns ?? []).some(
        (a) => !appliesTo.addonId || a.addonType === appliesTo.addonId,
      );
    case "tags":
      return appliesTo.tags.some((t) => guestTags.has(t));
  }
}

// ── Time helpers ────────────────────────────────────────────────────────────

export function getShiftForTime(time: string): ShiftType {
  const h = parseInt(time.split(":")[0] ?? "0", 10);
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 21) return "afternoon";
  return "evening";
}

export function format12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Medication frequency rules ──────────────────────────────────────────────

function getDayOfStay(checkInDate: string, today: Date): number {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  return Math.floor(
    (todayMidnight.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function shouldGiveMedToday(
  med: MedicationSchedule,
  guest: BoardingGuest,
  today: Date,
): boolean {
  const rule = med.frequencyRule as MedFrequencyRule | undefined;
  if (!rule) return true;
  const dayOfStay = getDayOfStay(guest.checkInDate, today);
  switch (rule.type) {
    case "daily":
      return true;
    case "every_other_day":
      return (dayOfStay - (rule.startDayOfStay ?? 0)) % 2 === 0;
    case "every_n_days":
      return (dayOfStay - (rule.startDayOfStay ?? 0)) % rule.n === 0;
    case "specific_days":
      return rule.daysOfWeek.includes(today.getDay());
    case "first_n_days":
      return dayOfStay < rule.days;
    case "last_n_days":
      return dayOfStay >= guest.totalNights - rule.days;
    case "as_needed":
      return false;
  }
}

export function getFrequencyLabel(rule: MedFrequencyRule): string {
  switch (rule.type) {
    case "daily":
      return "Daily";
    case "every_other_day":
      return "Every other day";
    case "every_n_days":
      return `Every ${rule.n} days`;
    case "specific_days": {
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return rule.daysOfWeek.map((d) => names[d]).join(" & ") + " only";
    }
    case "first_n_days":
      return `First ${rule.days} days only`;
    case "last_n_days":
      return `Last ${rule.days} days only`;
    case "as_needed":
      return "As needed";
  }
}

// ── Build alert tags surfaced as colored badges next to each pet ───────────

function buildAlertTags(guest: BoardingGuest): string[] {
  const tags: string[] = [];
  if (guest.allergies.length > 0) tags.push("Allergy");
  if (guest.medications.some((m) => m.times.length > 0)) tags.push("Meds");
  if (guest.postSurgery) tags.push("Post-Surgery");
  if (guest.heatCycle) tags.push("Heat Cycle");
  return tags;
}

// ── Medications given with a meal ───────────────────────────────────────────

/** How far a dose may sit from a meal and still be given with it. Bookings
 *  schedule meals and meds independently — Buddy eats at 07:30 and takes
 *  Apoquel at 08:00 — so an exact time match would almost never combine, while
 *  a whole shift would attach an 11:00 dose to a breakfast already served. */
const WITH_FOOD_WINDOW_MINUTES = 90;

/** Free-text fallback for bookings written before `withFood` existed. */
const WITH_FOOD_TEXT =
  /\bwith\s+(?:a\s+)?(?:food|meal|meals|breakfast|dinner)\b|\bmixed\s+in(?:to)?\s+food\b/i;

/** Whether the parent asked for this dose to go down with a meal. Prefers the
 *  structured flag set from the booking / check-in form / pet profile. */
export function medIsWithFood(med: MedicationSchedule): boolean {
  if (typeof med.withFood === "boolean") return med.withFood;
  return WITH_FOOD_TEXT.test(med.instructions ?? "");
}

/** The meal a with-food dose belongs to: the nearest one within the window, or
 *  none — in which case the dose stays a task of its own. */
function mealForDose(
  doseTime: string,
  meals: ScheduledTask[],
): ScheduledTask | undefined {
  let best: ScheduledTask | undefined;
  let bestGap = Infinity;
  for (const meal of meals) {
    const gap = Math.abs(toMinutes(meal.scheduledTime) - toMinutes(doseTime));
    if (gap <= WITH_FOOD_WINDOW_MINUTES && gap < bestGap) {
      best = meal;
      bestGap = gap;
    }
  }
  return best;
}

// ── In-stay care from incidents (2B) ────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function startOfDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

// Clock times through the day at a fixed step, anchored at 08:00 through 20:00.
function steppedTimes(stepHours: number): string[] {
  const times: string[] = [];
  for (let h = 8; h <= 20; h += stepHours) {
    times.push(`${String(h).padStart(2, "0")}:00`);
  }
  return times.length > 0 ? times : ["08:00"];
}

// Times implied by a care action's frequency.
function careActionTimes(a: IncidentCareAction): string[] {
  switch (a.frequency) {
    case "twice_daily":
      return ["08:00", "18:00"];
    case "once_daily":
    case "once":
    case "custom":
      return ["08:00"];
    case "every_x_hours":
      return steppedTimes(
        a.everyXHours && a.everyXHours > 0 ? a.everyXHours : 6,
      );
  }
}

// Times implied by an incident medication's free-text frequency.
function medFrequencyTimes(freq: string): string[] {
  const f = freq.toLowerCase();
  const everyN = f.match(/every\s+(\d+)\s*h/);
  if (everyN) {
    const step = parseInt(everyN[1] ?? "0", 10);
    if (step > 0) return steppedTimes(step);
  }
  if (/(thrice|three|3x|3 times|\btid\b)/.test(f)) {
    return ["08:00", "14:00", "20:00"];
  }
  if (/(twice|2x|2 times|\bbid\b)/.test(f)) return ["08:00", "18:00"];
  return ["08:00"];
}

// The times a care action should run on `today` within the guest's stay, or []
// when it shouldn't appear (inactive, before its start, past checkout / x-days).
function careActionTimesForDay(
  a: IncidentCareAction,
  guest: BoardingGuest,
  today: Date,
): string[] {
  if (!a.active) return [];
  const todayMs = startOfDayMs(today);
  if (todayMs > startOfDayMs(new Date(guest.checkOutDate))) return [];
  const start = new Date(a.createdAt);
  if (a.starts === "next_morning_8am") start.setDate(start.getDate() + 1);
  const startMs = startOfDayMs(start);
  if (todayMs < startMs) return [];
  if (a.duration === "x_days") {
    const days = a.days && a.days > 0 ? a.days : 1;
    if (todayMs > startMs + (days - 1) * DAY_MS) return [];
  }
  // "once" runs a single time on its start day only.
  if (a.frequency === "once" && todayMs !== startMs) return [];
  return careActionTimes(a);
}

// The times an incident medication should run on `today`: daily from the day it
// was added through checkout, at its frequency-implied times.
function medTimesForDay(
  med: IncidentMedication,
  guest: BoardingGuest,
  today: Date,
): string[] {
  const todayMs = startOfDayMs(today);
  if (todayMs > startOfDayMs(new Date(guest.checkOutDate))) return [];
  if (todayMs < startOfDayMs(new Date(med.createdAt))) return [];
  return medFrequencyTimes(med.frequency);
}

// Nearest enabled step to a time — the render "home" for a task with no step of
// its own (incident care actions have no config step).
function nearestStepId(
  steps: DailyCareStep[],
  time: string,
): string | undefined {
  if (steps.length === 0) return undefined;
  const target = toMinutes(time);
  let bestId = steps[0].id;
  let bestDiff = Infinity;
  for (const s of steps) {
    const diff = Math.abs(toMinutes(s.time) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = s.id;
    }
  }
  return bestId;
}

function careFrequencyLabel(a: IncidentCareAction): string {
  switch (a.frequency) {
    case "twice_daily":
      return "Twice daily";
    case "once_daily":
      return "Once daily";
    case "once":
      return "Once";
    case "every_x_hours":
      return `Every ${a.everyXHours ?? "?"}h`;
    case "custom":
      return a.customSchedule || "Custom schedule";
  }
}

// ── Scheduled-task generation ───────────────────────────────────────────────

export function generateScheduledTasks(
  guests: BoardingGuest[],
  dailyCareConfig: FacilityDailyCareConfig,
  today: Date = new Date(),
  /** Per-pet stay-long care-note overrides (A4.5), keyed by guest id. When a
   *  pet has an override it wins over its record's own notes. */
  careNotes?: ReadonlyMap<string, string>,
): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];
  // F1: honor step.activeDays (0–6, Sun–Sat). A step with activeDays runs only
  // on those days; undefined activeDays runs every day.
  const dayOfWeek = today.getDay();
  const enabledSteps = dailyCareConfig.steps.filter(
    (s) =>
      s.enabled && (s.activeDays == null || s.activeDays.includes(dayOfWeek)),
  );

  const pottySteps = enabledSteps.filter((s) => s.taskType === "potty");
  const feedingSteps = enabledSteps.filter((s) => s.taskType === "feeding");
  const medSteps = enabledSteps.filter((s) => s.taskType === "medication");
  const addonSteps = enabledSteps.filter((s) => s.taskType === "addon");
  const waterSteps = enabledSteps.filter((s) => s.taskType === "water_refill");
  const cleanSteps = enabledSteps.filter((s) => s.taskType === "kennel_clean");
  const beddingSteps = enabledSteps.filter(
    (s) => s.taskType === "bedding_change",
  );
  const customSteps = enabledSteps.filter((s) => s.taskType === "custom");

  for (const guest of guests) {
    const alertTags = buildAlertTags(guest);
    const behaviorTags: string[] = guest.tags ?? [];
    // The guest's full tag set (alert + behavior) for appliesTo "tags" rules.
    const guestTags = new Set<string>([...behaviorTags, ...alertTags]);
    const baseTask = {
      guestId: guest.id,
      bookingId: guest.bookingId,
      petName: guest.petName,
      petPhotoUrl: guest.petPhotoUrl,
      kennelName: guest.kennelName,
      packageType: guest.packageType,
      behaviorTags,
      // Allergens surfaced on every task (not just feeding) so the row can show
      // a consistent red "Avoid: …" line.
      avoidList: guest.allergies,
      // Per-pet stay-long care note (A4.5) — the editable override wins, else
      // the pet record's own notes. Surfaced as PetRow's sticky-note.
      careNote: careNotes?.get(guest.id) ?? guest.notes ?? undefined,
    };

    // Potty rounds — one per configured potty step
    for (const step of pottySteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      tasks.push({
        ...baseTask,
        id: `potty-${guest.id}-${step.id}`,
        taskType: "potty",
        scheduledTime: step.time,
        shift: getShiftForTime(step.time),
        details: step.name,
        subDetails: step.description ? [step.description] : undefined,
        alertTags,
        sourceStepId: step.id,
      });
    }

    // Feeding — match guest's per-meal times against feeding steps; if no
    // step covers a meal time, still emit the task (the meal exists for
    // this guest regardless of facility schedule).
    // Held back from `tasks` until the medication loop has had a chance to fold
    // with-food doses into them.
    const meals: ScheduledTask[] = [];
    const matchedTimes = new Set<string>();
    for (const step of feedingSteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      const time = guest.feedingTimes.find((t) => t === step.time) ?? step.time;
      // Only emit if guest actually has a meal at this time, OR step is a generic feeding step
      if (!guest.feedingTimes.includes(step.time)) continue;
      matchedTimes.add(step.time);
      meals.push(
        feedingTask(guest, time, alertTags, step.name, step.id, baseTask),
      );
    }
    for (const time of guest.feedingTimes) {
      if (matchedTimes.has(time)) continue;
      meals.push(
        feedingTask(guest, time, alertTags, undefined, undefined, baseTask),
      );
    }

    // Medications — each med dose at each scheduled time, gated by frequency
    for (const med of guest.medications) {
      if (!shouldGiveMedToday(med, guest, today)) continue;
      const frequencyNote = med.frequencyRule
        ? getFrequencyLabel(med.frequencyRule as MedFrequencyRule)
        : undefined;
      const withFood = medIsWithFood(med);
      for (const time of med.times) {
        const matchedStep = medSteps.find((s) => s.time === time);
        const taskId = `med-${guest.id}-${med.id}-${time}`;

        // Given with food: hang the dose off the meal instead of standing it up
        // as its own task, so staff serve and dose in one pass. The dose keeps
        // the task id it would have had, so its log is unchanged downstream.
        const meal = withFood ? mealForDose(time, meals) : undefined;
        if (meal) {
          meal.withMeds = [
            ...(meal.withMeds ?? []),
            {
              medicationId: med.id,
              taskId,
              name: med.medicationName,
              dosage: med.dosage,
              method: med.administrationMethod ?? "oral",
              scheduledTime: time,
              instructions: med.instructions || undefined,
              requiresPhotoProof: med.requiresPhotoProof,
            },
          ];
          if (!meal.alertTags.includes("Meds")) meal.alertTags.push("Meds");
          continue;
        }

        tasks.push({
          ...baseTask,
          id: `med-${guest.id}-${med.id}-${time}`,
          taskType: "medication",
          scheduledTime: time,
          shift: getShiftForTime(time),
          details: `${med.medicationName} ${med.dosage}`,
          subDetails: [med.frequency, med.instructions].filter(Boolean),
          requiresPhotoProof: med.requiresPhotoProof,
          frequencyNote,
          alertTags: ["Meds"],
          sourceStepId: matchedStep?.id,
          // Structured detail for the dedicated med log modal. Route defaults to
          // oral (the route for mg-dose tablet meds) when the booking omits it.
          medDetail: {
            name: med.medicationName,
            dosage: med.dosage,
            method: med.administrationMethod ?? "oral",
            timingNote: med.instructions || undefined,
          },
        });
      }
    }

    // Meals go in now that any with-food doses have been folded onto them.
    tasks.push(...meals);

    // Add-ons — each add-on appears at its scheduled time
    for (const addon of guest.addOns ?? []) {
      const matchedStep = addonSteps.find(
        (s) => s.time === addon.scheduledTime,
      );
      tasks.push({
        ...baseTask,
        id: `addon-${guest.id}-${addon.id}`,
        taskType: "addon",
        subType: addon.addonType,
        scheduledTime: addon.scheduledTime,
        shift: getShiftForTime(addon.scheduledTime),
        details: addon.name,
        subDetails: [
          `${addon.durationMinutes} min`,
          ...(addon.notes ? [addon.notes] : []),
        ],
        alertTags,
        sourceStepId: matchedStep?.id,
        // Structured detail for the dedicated add-on log modal. Group play and
        // play sessions unlock the interaction / energy / incident fields.
        addonDetail: {
          name: addon.name,
          bookedMinutes: addon.durationMinutes,
          instructions: addon.notes || undefined,
          isPlaySession:
            addon.addonType === "play_session" ||
            addon.addonType === "group_play",
        },
      });
    }

    // Care tasks — water refills, kennel cleans, bedding changes, custom
    for (const step of waterSteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      tasks.push(
        careTask(baseTask, "water_refill", step, [guest.kennelName], alertTags),
      );
    }
    for (const step of cleanSteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      tasks.push(
        careTask(baseTask, "kennel_clean", step, [guest.kennelName], alertTags),
      );
    }
    for (const step of beddingSteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      tasks.push(
        careTask(
          baseTask,
          "bedding_change",
          step,
          [guest.kennelName],
          alertTags,
        ),
      );
    }
    for (const step of customSteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      tasks.push({
        ...careTask(
          baseTask,
          step.id,
          step,
          step.description ? [step.description] : [guest.kennelName],
          alertTags,
        ),
        // A7.5: a declared Log Type routes to the Custom log modal; absent, the
        // task falls back to the enrichment log.
        customLogType: step.logType,
      });
    }

    // In-stay care from this pet's incidents (2B) — auto-inserted, no manual
    // action, for every remaining day of the stay at frequency-implied times.
    // Care actions log via the enrichment modal, medications via the med modal;
    // both honor the requires-photo gate and write back an incident careLog.
    for (const incident of getIncidentsForPet(guest.petId)) {
      // Flow C: once in-stay care is locked at checkout, its tasks stop being
      // generated for Daily Care (the incident stays open; follow-up tasks
      // continue independently).
      if (incident.inStayCareLocked) continue;
      for (const action of incident.careActions) {
        for (const time of careActionTimesForDay(action, guest, today)) {
          tasks.push({
            ...baseTask,
            id: `inc-care-${action.id}-${time}`,
            taskType: "care",
            subType: "monitoring",
            scheduledTime: time,
            shift: getShiftForTime(time),
            details: action.name,
            subDetails: action.staffInstructions
              ? [action.staffInstructions]
              : undefined,
            requiresPhotoProof: action.requiresPhoto,
            frequencyNote: careFrequencyLabel(action),
            // The dedicated "Incident care" tag (PetRow) marks the source.
            alertTags: [],
            // No config step of its own — slot into the nearest time block.
            sourceStepId: nearestStepId(enabledSteps, time),
            sourceIncidentId: incident.id,
            careActionId: action.id,
          });
        }
      }
      for (const med of incident.incidentMedications) {
        for (const time of medTimesForDay(med, guest, today)) {
          const matchedStep = medSteps.find((s) => s.time === time);
          tasks.push({
            ...baseTask,
            id: `inc-med-${med.id}-${time}`,
            taskType: "medication",
            scheduledTime: time,
            shift: getShiftForTime(time),
            details: `${med.name}${med.dosage ? ` ${med.dosage}` : ""}`,
            subDetails: [med.frequency, med.instructions].filter(Boolean),
            frequencyNote: med.frequency,
            // "Meds" keeps the med chip; the "Incident care" tag marks the source.
            alertTags: ["Meds"],
            sourceStepId:
              matchedStep?.id ??
              nearestStepId(medSteps, time) ??
              nearestStepId(enabledSteps, time),
            medDetail: {
              name: med.name,
              dosage: med.dosage,
              method: med.medType === "other" ? "oral" : med.medType,
              timingNote: med.instructions || undefined,
            },
            sourceIncidentId: incident.id,
            medicationId: med.id,
          });
        }
      }
    }
  }

  return tasks.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

// ── Task builders ───────────────────────────────────────────────────────────

type BaseTaskFields = {
  guestId: string;
  bookingId?: string;
  petName: string;
  petPhotoUrl?: string;
  kennelName: string;
  packageType?: string;
  behaviorTags: string[];
  avoidList?: string[];
  careNote?: string;
};

function feedingTask(
  guest: BoardingGuest,
  time: string,
  alertTags: string[],
  stepLabel: string | undefined,
  stepId: string | undefined,
  base: BaseTaskFields,
): ScheduledTask {
  const h = parseInt(time.split(":")[0] ?? "0", 10);
  const defaultLabel = h < 11 ? "Breakfast" : h < 15 ? "Lunch" : "Dinner";
  const subDetails: string[] = [`${guest.feedingAmount} ${guest.foodBrand}`];
  if (guest.feedingInstructions) subDetails.push(guest.feedingInstructions);
  // Allergens now render as a dedicated red "Avoid: …" line via task.avoidList
  // (see baseTask), consistently across every task type.
  return {
    ...base,
    id: `feed-${guest.id}-${time}`,
    taskType: "feeding",
    scheduledTime: time,
    shift: getShiftForTime(time),
    details: stepLabel ?? defaultLabel,
    subDetails,
    // Read-only "frequency" for the feeding log's plan zone (A4.4), derived
    // from how many meals the booking schedules per day.
    frequencyNote:
      guest.feedingTimes.length > 0
        ? `${guest.feedingTimes.length}× daily`
        : undefined,
    alertTags:
      guest.allergies.length > 0
        ? ["Allergy", ...alertTags.filter((t) => t !== "Allergy")]
        : alertTags,
    sourceStepId: stepId,
  };
}

function careTask(
  base: BaseTaskFields,
  subType: string,
  step: { id: string; time: string; name: string; description?: string },
  subDetails: string[],
  alertTags: string[],
): ScheduledTask {
  return {
    ...base,
    id: `care-${subType}-${base.guestId}-${step.id}`,
    taskType: "care",
    subType,
    scheduledTime: step.time,
    shift: getShiftForTime(step.time),
    details: step.name,
    subDetails,
    alertTags,
    sourceStepId: step.id,
  };
}
