import type { BoardingGuest, MedicationSchedule } from "@/data/boarding";
import type {
  FacilityDailyCareConfig,
  DailyCareStep,
  MedFrequencyRule,
} from "@/types/boarding";
import type { ScheduledTask, ShiftType } from "@/types/care-log";

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
    const matchedTimes = new Set<string>();
    for (const step of feedingSteps) {
      if (!guestMatchesAppliesTo(guest, step.appliesTo, guestTags)) continue;
      const time = guest.feedingTimes.find((t) => t === step.time) ?? step.time;
      // Only emit if guest actually has a meal at this time, OR step is a generic feeding step
      if (!guest.feedingTimes.includes(step.time)) continue;
      matchedTimes.add(step.time);
      tasks.push(
        feedingTask(guest, time, alertTags, step.name, step.id, baseTask),
      );
    }
    for (const time of guest.feedingTimes) {
      if (matchedTimes.has(time)) continue;
      tasks.push(
        feedingTask(guest, time, alertTags, undefined, undefined, baseTask),
      );
    }

    // Medications — each med dose at each scheduled time, gated by frequency
    for (const med of guest.medications) {
      if (!shouldGiveMedToday(med, guest, today)) continue;
      const frequencyNote = med.frequencyRule
        ? getFrequencyLabel(med.frequencyRule as MedFrequencyRule)
        : undefined;
      for (const time of med.times) {
        const matchedStep = medSteps.find((s) => s.time === time);
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
