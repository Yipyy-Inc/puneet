import type { EvaluationCustomQuestion } from "@/types/facility";

// ============================================================================
// What an evaluation asks — the client's mock (2026-10-02). Ids only: every
// word a person reads comes from the message catalogue (en and fr), so these
// are the stable keys a saved answer is stored under.
//
//   1 Temperament       friendly with dogs · with people · energy · anxiety ·
//                       reactivity
//   2 Play profile      play style · recommended play group · on leash
//   3 Behavior & notes  resource guarding (staff only) · strengths and
//                       watch-for tags · the note to the owner
//   4 Result            outcome · approved for
//
// Yipyy's core questions stay in place; a facility adds its own to any step
// ("Evaluation questions", Setup) — Yes/No, Low/Med/High, a single choice of
// its own options, or short text — each shown on the report card or not, and
// required or not.
// ============================================================================

export type AnswerKind = "yn" | "lmh" | "choice" | "text";

export const SECTIONS = ["temperament", "play", "behavior", "result"] as const;
export type SectionId = (typeof SECTIONS)[number];

/** The evaluator's verdict, in `pets.details.evaluations[].resultType` words. */
export const RESULTS = [
  "approved",
  "approved_with_restrictions",
  "needs_re_evaluation",
  "not_approved",
] as const;
export type EvaluationResult = (typeof RESULTS)[number];

export function isPass(result: EvaluationResult | null | undefined): boolean {
  return result === "approved" || result === "approved_with_restrictions";
}

export interface CoreQuestion {
  /** The answer's key. */
  key: string;
  section: 0 | 1 | 2 | 3;
  kind: AnswerKind;
  /** A choice's option ids. */
  options?: readonly string[];
  /** It has a line under it ("Watch the first 5 minutes of introductions"). */
  hint?: boolean;
  /** Never on the owner's card. */
  internal?: boolean;
}

export const PLAY_STYLES = [
  "gentle",
  "rough",
  "chaser",
  "independent",
  "ball",
] as const;
export const PLAY_GROUPS = ["small", "medium", "large", "solo"] as const;
export const LEASH = [
  "loose",
  "pulls_little",
  "pulls_hard",
  "reactive",
] as const;

export const CORE_QUESTIONS: readonly CoreQuestion[] = [
  { key: "dog", section: 0, kind: "yn", hint: true },
  { key: "human", section: 0, kind: "yn", hint: true },
  { key: "energy", section: 0, kind: "lmh" },
  { key: "anx", section: 0, kind: "lmh", hint: true },
  { key: "react", section: 0, kind: "lmh", hint: true },
  { key: "play", section: 1, kind: "choice", options: PLAY_STYLES },
  { key: "group", section: 1, kind: "choice", options: PLAY_GROUPS },
  { key: "leash", section: 1, kind: "choice", options: LEASH },
  { key: "guard", section: 2, kind: "yn", hint: true, internal: true },
  { key: "result", section: 3, kind: "choice", options: RESULTS },
];

export const STRENGTH_TAGS = [
  "food",
  "toy",
  "recall",
  "puppies",
  "people",
] as const;
export const WATCH_TAGS = [
  "shy",
  "mouthy",
  "jumper",
  "slow_intro",
  "velcro",
  "guarder",
  "escape",
] as const;
export type WatchTag = (typeof WATCH_TAGS)[number];

/**
 * How a watch-for tag reads on the owner's card — "we'll help with…".
 * Resource guarding never reaches the owner.
 */
export const HELP_WITH: Record<WatchTag, string | null> = {
  shy: "confidence",
  mouthy: "gentle_mouth",
  jumper: "four_paws",
  slow_intro: "slow_intros",
  velcro: "settling",
  guarder: null,
  escape: "gates",
};

/** The evaluator's quick points for the AI note ("+ Settled in fast"). */
export const QUICK_POINTS = [
  "settled_fast",
  "made_friends",
  "loved_pool",
  "needed_breaks",
  "shy_first",
  "very_playful",
  "great_staff",
] as const;

export const NOTE_TONES = ["warm", "upbeat", "professional", "short"] as const;
export type NoteTone = (typeof NOTE_TONES)[number];

export const CARD_THEMES = ["green", "blue", "plum", "fall", "ink"] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

/** The questions a client answers when booking online ("About your pet"). */
export const INTAKE_QUESTIONS = [
  { key: "energy", options: ["couch", "moderate", "beans"] },
  { key: "others", options: ["loves", "picky", "unsure", "people"] },
  { key: "history", options: ["regular", "once", "never"] },
  {
    key: "triggers",
    options: ["noise", "big_dogs", "men_hats", "handling", "nothing"],
  },
  { key: "vet", options: ["none", "explain"] },
] as const;
export type IntakeKey = (typeof INTAKE_QUESTIONS)[number]["key"];

/** One pet's answers to "About your pet", and anything else the owner wrote. */
export type IntakeAnswers = Partial<Record<IntakeKey, string>> & {
  notes?: string;
};

/** One of the facility's own questions — the settings schema's shape. */
export type CustomQuestion = EvaluationCustomQuestion;

export type Answers = Record<string, string | undefined>;

export interface SectionQuestion {
  key: string;
  kind: AnswerKind;
  /** Core: option ids for the catalogue. Custom: the facility's own words. */
  options: readonly string[];
  custom: CustomQuestion | null;
  hint: boolean;
}

/**
 * One step's questions in the order the evaluator meets them: the core
 * questions, the facility's after them — but before the outcome on Result,
 * so the verdict stays the last thing asked.
 */
export function sectionQuestions(
  section: 0 | 1 | 2 | 3,
  custom: readonly CustomQuestion[],
): SectionQuestion[] {
  const core: SectionQuestion[] = CORE_QUESTIONS.filter(
    (q) => q.section === section,
  ).map((q) => ({
    key: q.key,
    kind: q.kind,
    options: q.options ?? [],
    custom: null,
    hint: !!q.hint,
  }));
  const own: SectionQuestion[] = custom
    .filter((q) => q.section === section)
    .map((q) => ({
      key: q.id,
      kind: q.type,
      options: q.type === "choice" ? q.options : [],
      custom: q,
      hint: true,
    }));
  return section === 3 ? [...own, ...core] : [...core, ...own];
}

/** The answers an evaluation cannot finish without: every core one, and the
 *  facility's required ones. */
export function requiredKeys(custom: readonly CustomQuestion[]): string[] {
  return [
    ...CORE_QUESTIONS.map((q) => q.key),
    ...custom.filter((q) => q.required).map((q) => q.id),
  ];
}

export function answered(answers: Answers, key: string): boolean {
  return (answers[key] ?? "").trim().length > 0;
}

/** "3 of 10": how many of the required answers are in. */
export function progressOf(
  answers: Answers,
  custom: readonly CustomQuestion[],
): { done: number; total: number } {
  const keys = requiredKeys(custom);
  return {
    done: keys.filter((key) => answered(answers, key)).length,
    total: keys.length,
  };
}

/** A step is done when every question in it is answered. */
export function sectionDone(
  section: 0 | 1 | 2 | 3,
  answers: Answers,
  custom: readonly CustomQuestion[],
): boolean {
  return sectionQuestions(section, custom).every((q) =>
    answered(answers, q.key),
  );
}

/** Comma-separated options as the questions editor takes them, cleaned. */
export function optionsFromText(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
    ),
  ];
}
