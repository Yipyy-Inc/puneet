import { stayOf, type MedStay } from "@/lib/medications/schedule";
import type { CareStepUse } from "@/lib/settings/care-setup";

// ============================================================================
// WHERE THE FEEDING AND MEDICATIONS STEPS SIT IN A BOOKING (2026-10-01).
//
// The Details screen of each service is a list of sub-steps, and the facility
// decides per service whether Feeding and Medications are among them —
// disabled, optional or required (Settings › Services › Feeding &
// medications). Boarding and daycare had them always; grooming and training
// get them when a facility turns them on.
//
// ── THE CARE STEPS HAVE FIXED IDS ─────────────────────────────────────────
//
// 3 is Feeding and 4 is Medication in every flow — grooming uses 0–2 and
// training 0, so both are free, and ids still rise in display order. The
// form holds the id of the sub-step it is on, not its position: a list that
// changes under it (the settings arriving, a step switched off) leaves it on
// the same question, or on the next one when its own is gone. A draft keeps
// the id for the same reason.
// ============================================================================

export const FEEDING_SUB_STEP_ID = 3;
export const MEDICATION_SUB_STEP_ID = 4;

export interface SubStepDef {
  id: number;
  titleKey: string;
  descriptionKey: string;
}

export interface CareStepUses {
  feeding: CareStepUse;
  medication: CareStepUse;
}

/** The care sub-steps a flow ends with: each one the facility has not switched off. */
export function careSubSteps(uses: CareStepUses): SubStepDef[] {
  const steps: SubStepDef[] = [];
  if (uses.feeding !== "disabled") {
    steps.push({
      id: FEEDING_SUB_STEP_ID,
      titleKey: "feeding",
      descriptionKey: "subFeedingSchedule",
    });
  }
  if (uses.medication !== "disabled") {
    steps.push({
      id: MEDICATION_SUB_STEP_ID,
      titleKey: "subMedication",
      descriptionKey: "subMedicationDetails",
    });
  }
  return steps;
}

/**
 * Where a sub-step id sits in a flow: its own place, else the first step
 * after it, else the last — so a hidden step resumes on the next one.
 */
export function subStepIndexOf(
  flow: readonly { id: number }[],
  id: number,
): number {
  if (flow.length === 0) return 0;
  const exact = flow.findIndex((step) => step.id === id);
  if (exact >= 0) return exact;
  const next = flow.findIndex((step) => step.id > id);
  return next >= 0 ? next : flow.length - 1;
}

/**
 * The days the care steps plan for: a boarding range, the daycare days
 * chosen, a groom's one day, a training class's sessions.
 */
export function careStayFor(input: {
  service: string;
  /** `YYYY-MM-DD`. */
  boardingStart?: string;
  boardingEnd?: string;
  daycareDates?: readonly string[];
  /** A groom's day. */
  startDate?: string;
  /** The sessions of the class being booked. */
  trainingDates?: readonly string[];
}): MedStay {
  switch (input.service) {
    case "boarding":
      return stayOf({
        overnight: true,
        start: input.boardingStart,
        end: input.boardingEnd,
      });
    case "daycare":
      return stayOf({
        overnight: false,
        dates: [...(input.daycareDates ?? [])],
      });
    case "grooming":
      return stayOf({ overnight: false, start: input.startDate || undefined });
    case "training":
      return stayOf({
        overnight: false,
        dates: [...(input.trainingDates ?? [])],
      });
    default:
      return { days: [], overnight: false };
  }
}

/**
 * The sub-step a draft saved before 2026-10-01 was on. Those drafts kept a
 * POSITION in the lists as they were then — fixed lists, with Room
 * Assignment left out for a customer — so the position names one id.
 */
export function legacySubStepId(
  service: string | undefined,
  position: number | undefined,
  customer: boolean,
): number | undefined {
  if (position === undefined || position < 0) return undefined;
  const lists: Record<string, number[]> = {
    daycare: customer ? [0, 2, 3, 4] : [0, 1, 2, 3, 4],
    boarding: customer ? [0, 2, 3, 4] : [0, 1, 2, 3, 4],
    grooming: [0, 1, 2],
    // Its Add-ons screen (1) went with the client's mock (2026-10-02): an
    // old draft resumes on Date & time.
    evaluation: [0],
    training: [0],
  };
  const list = (service && lists[service]) || [0];
  return list[Math.min(position, list.length - 1)];
}
