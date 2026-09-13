import type {
  BehaviorNotes,
  FormTemplateConfig,
  YipyyGoSectionFormData,
} from "@/types/yipyygo";
import type { YipyyGoAnswers } from "@/lib/api/mappers/yipyy-go";
import {
  customQuestionsOf,
  type YipyyGoMissing,
} from "@/lib/yipyy-go/validate";

// ============================================================================
// The owner's pre-arrival form, as steps and as answers.
//
// ── THE STEPS ─────────────────────────────────────────────────────────────
//
// The facility's template for the booking's service decides them. The old
// page showed a fixed list, decided by a fixture of one facility's check-in
// requirements; it never showed the behavior step, and never asked one of the
// questions a facility wrote.
//
// ── THE ANSWERS ───────────────────────────────────────────────────────────
//
// The sections were written against the fixture store’s form shape, and the
// server takes YipyyGoAnswers. The two differ in the facility’s own questions,
// which no section holds, and in the fixture’s `photoUrl`, which an item may
// still carry and the server never takes: a photo is kept by its id. These
// functions are the whole difference, so the page never builds a request body
// by hand.
// ============================================================================

export type YipyyGoFormStep =
  | "contact"
  | "pet"
  | "booking"
  | "feeding"
  | "medications"
  | "behavior"
  | "addons"
  | "belongings"
  | "questions"
  | "review";

export type YipyyGoCustomAnswers = NonNullable<YipyyGoAnswers["customAnswers"]>;
export type YipyyGoCustomAnswer = YipyyGoCustomAnswers[string];

export function yipyyGoFormSteps(
  template: FormTemplateConfig,
  have: { contact: boolean; pet: boolean; addOns?: boolean },
): YipyyGoFormStep[] {
  const { features, sections } = template;
  const steps: YipyyGoFormStep[] = [];
  if (have.contact && features.contactInfoSection !== false)
    steps.push("contact");
  if (have.pet && features.petDetailsSection !== false) steps.push("pet");
  if (features.bookingDetailsSection !== false) steps.push("booking");

  // Feeding, medications and behavior follow the order the facility gave its
  // sections; a tie keeps this order.
  const care: [YipyyGoFormStep, { enabled: boolean; order: number }][] = [
    ["feeding", sections.feedingSchedule],
    ["medications", sections.medications],
    ["behavior", sections.careInstructions],
  ];
  steps.push(
    ...care
      .map(([step, section], index) => ({ step, section, index }))
      .filter(({ section }) => section.enabled)
      .sort((a, b) => a.section.order - b.section.order || a.index - b.index)
      .map(({ step }) => step),
  );

  // The add-ons the booking can take, where the facility's form offers them.
  if (have.addOns && features.addOnsSection) steps.push("addons");
  steps.push("belongings");
  if (customQuestionsOf(template).length > 0) steps.push("questions");
  steps.push("review");
  return steps;
}

/** The step where a missing answer is given. */
export function stepForMissing(missing: YipyyGoMissing): YipyyGoFormStep {
  switch (missing) {
    case "medications":
      return "medications";
    case "feeding":
      return "feeding";
    case "behavior":
      return "behavior";
    case "belongingsPhoto":
      return "belongings";
    default:
      return "questions";
  }
}

/** What the behavior step shows before the owner picks anything. */
export const DEFAULT_BEHAVIOR_NOTES: BehaviorNotes = {
  energyLevel: "medium",
  socialization: { withDogs: "unknown", withHumans: "unknown" },
  anxietyTriggers: [],
  specialNotes: "",
};

export function emptyYipyyGoAnswers(): YipyyGoAnswers {
  return { belongings: [], medications: [], noMedications: false };
}

export function sectionFormFromAnswers(
  answers: YipyyGoAnswers,
  petName: string,
): YipyyGoSectionFormData {
  return {
    petName,
    // An item's photo id rides along on the item, untouched.
    belongings: answers.belongings.map((item) => ({ ...item })),
    feedingInstructions: answers.feedingInstructions,
    medications: answers.medications.map((item) => ({ ...item })),
    noMedications: answers.noMedications,
    behaviorNotes: answers.behaviorNotes,
    addOns: [],
    ...(answers.belongingsPhotoId
      ? { belongingsPhotoId: answers.belongingsPhotoId }
      : {}),
  };
}

export function answersFromSectionForm(
  form: YipyyGoSectionFormData,
  customAnswers: YipyyGoCustomAnswers,
): YipyyGoAnswers {
  return {
    // An item may still carry the fixture’s photoUrl, a preview that lived in
    // one tab; the server keeps a photo by its id.
    belongings: form.belongings.map(({ photoUrl: _photoUrl, ...item }) => item),
    medications: form.medications.map(
      ({ photoUrl: _photoUrl, ...item }) => item,
    ),
    ...(form.belongingsPhotoId
      ? { belongingsPhotoId: form.belongingsPhotoId }
      : {}),
    noMedications: form.noMedications,
    ...(form.feedingInstructions
      ? { feedingInstructions: form.feedingInstructions }
      : {}),
    ...(form.behaviorNotes ? { behaviorNotes: form.behaviorNotes } : {}),
    ...(Object.keys(customAnswers).length > 0 ? { customAnswers } : {}),
  };
}

/**
 * The last stay's answers, to start a new form from. Without its photos —
 * they belong to that stay's form — and without answers to the facility's
 * questions, which this form may ask differently.
 */
export function lastStayAnswers(
  answers: YipyyGoAnswers,
  newId: () => string = () => crypto.randomUUID(),
): YipyyGoAnswers {
  return {
    belongings: answers.belongings.map(({ photoId: _photoId, ...item }) => ({
      ...item,
      id: newId(),
    })),
    medications: answers.medications.map(({ photoId: _photoId, ...item }) => ({
      ...item,
      id: newId(),
    })),
    noMedications: answers.noMedications,
    ...(answers.feedingInstructions
      ? { feedingInstructions: answers.feedingInstructions }
      : {}),
    ...(answers.behaviorNotes ? { behaviorNotes: answers.behaviorNotes } : {}),
  };
}

/** One answer set, or taken out when it says nothing. */
export function withCustomAnswer(
  answers: YipyyGoCustomAnswers,
  questionId: string,
  value: YipyyGoCustomAnswer | undefined,
): YipyyGoCustomAnswers {
  const next = { ...answers };
  const empty =
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (typeof value === "number" && !Number.isFinite(value)) ||
    (Array.isArray(value) && value.length === 0);
  if (empty) delete next[questionId];
  else next[questionId] = value;
  return next;
}

/**
 * A booking's day, from its facility-local `YYYY-MM-DD`, at local midnight.
 * `new Date("2026-09-15")` is UTC midnight — the day before, anywhere in
 * Canada.
 */
export function calendarDay(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
