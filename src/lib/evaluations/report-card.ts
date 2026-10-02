import {
  HELP_WITH,
  STRENGTH_TAGS,
  WATCH_TAGS,
  isPass,
  type Answers,
  type CustomQuestion,
  type EvaluationResult,
  type WatchTag,
} from "@/lib/evaluations/questions";

// ============================================================================
// The report card an owner receives, built from the evaluator's answers —
// the client's mock (2026-10-02), "Built automatically from the answers":
//
//   Buddy passed their evaluation!     (the headline, by result)
//   [Approved]  by Sarah J.
//   TEMPERAMENT   Energy ▮▮▮ · Confidence ▮▮▯ · Calm around others ▮▮▮
//   Play style · Play group
//   WHAT WE LOVED     strengths, then how they are with dogs and people (≤ 5)
//   WE'LL HELP WITH   the watch-for tags, worded kindly — never guarding
//   MORE ABOUT THEM   the facility's own questions marked "show on card"
//   NOTE FROM SARAH   Hi Alice, …
//   NOW UNLOCKED      the approved services — only when it is a pass
//   [Book Buddy's first day]
//
// Pure and word-free: the card component turns these ids into the
// catalogue's sentences, the same on the live preview, the review and the
// owner's page.
// ============================================================================

export type CardHeadline = EvaluationResult | "pending";

export type MeterKey = "energy" | "confidence" | "calm";

export interface Meter {
  key: MeterKey;
  /** 0 = not answered yet; 1–3 segments filled. */
  level: 0 | 1 | 2 | 3;
  /** The word beside it, a catalogue id; null while unanswered. */
  value: string | null;
}

const LMH: Record<string, 1 | 2 | 3> = { l: 1, m: 2, h: 3 };

/**
 * Energy as answered; confidence and calm are anxiety and reactivity turned
 * round, so a fuller bar always reads as the better thing to an owner.
 */
export function cardMeters(answers: Answers): Meter[] {
  const level = (key: string) => LMH[answers[key] ?? ""] ?? 0;
  const energy = level("energy");
  const anxiety = level("anx");
  const reactivity = level("react");
  const invert = (n: number) => (n === 0 ? 0 : ((4 - n) as 1 | 2 | 3));
  return [
    {
      key: "energy",
      level: energy,
      value: energy ? (["low", "medium", "high"] as const)[energy - 1]! : null,
    },
    {
      key: "confidence",
      level: invert(anxiety),
      // Low anxiety is high confidence.
      value: anxiety
        ? (["high", "medium", "low"] as const)[anxiety - 1]!
        : null,
    },
    {
      key: "calm",
      level: invert(reactivity),
      value: reactivity
        ? (["very_calm", "mostly_calm", "working_on_it"] as const)[
            reactivity - 1
          ]!
        : null,
    },
  ];
}

export type Strength =
  | { kind: "tag"; id: (typeof STRENGTH_TAGS)[number] }
  | { kind: "social"; id: "dogs_yes" | "dogs_no" | "people_yes" | "people_no" };

/** "What we loved": the strengths picked, then the social answers — five at most. */
export function cardStrengths(
  tags: readonly string[],
  answers: Answers,
): Strength[] {
  const picked: Strength[] = STRENGTH_TAGS.filter((tag) =>
    tags.includes(tag),
  ).map((id) => ({ kind: "tag", id }));
  const social: Strength[] = [];
  if (answers.dog === "y") social.push({ kind: "social", id: "dogs_yes" });
  if (answers.dog === "n") social.push({ kind: "social", id: "dogs_no" });
  if (answers.human === "y") social.push({ kind: "social", id: "people_yes" });
  if (answers.human === "n") social.push({ kind: "social", id: "people_no" });
  return [...picked, ...social].slice(0, 5);
}

/** "We'll help with": each watch-for tag in kind words; guarding stays internal. */
export function cardHelpWith(watchFor: readonly string[]): string[] {
  return WATCH_TAGS.filter((tag) => watchFor.includes(tag))
    .map((tag) => HELP_WITH[tag])
    .filter((id): id is string => id !== null);
}

/** "Now unlocked": the approved services, and only on a pass. */
export function cardUnlocked(
  result: EvaluationResult | null,
  approvedServices: readonly string[],
): string[] {
  return isPass(result) ? [...approvedServices] : [];
}

export interface CardExtra {
  id: string;
  label: string;
  /** "y" | "n" | "l" | "m" | "h" for the catalogue, else the facility's words. */
  value: string;
  kind: CustomQuestion["type"];
}

/** "More about them": the facility's own questions shown on the card, answered. */
export function cardExtras(
  custom: readonly CustomQuestion[],
  answers: Answers,
): CardExtra[] {
  return custom
    .filter((q) => q.onCard && (answers[q.id] ?? "").trim())
    .map((q) => ({
      id: q.id,
      label: q.label,
      value: (answers[q.id] ?? "").trim(),
      kind: q.type,
    }));
}

export type CardCta = "first_day" | "reevaluation" | "message";

/** The card's one button, by result; none while the result is pending. */
export function cardCta(result: EvaluationResult | null): CardCta | null {
  if (!result) return null;
  if (isPass(result)) return "first_day";
  if (result === "needs_re_evaluation") return "reevaluation";
  return "message";
}

export function cardHeadline(result: EvaluationResult | null): CardHeadline {
  return result ?? "pending";
}

/**
 * What a card shows when the facility turned "Never show internal notes or
 * behavior concerns" OFF: the watch-for tags as the evaluator picked them,
 * guarding included, and the internal note. Empty while the switch is on.
 */
export function cardThingsToKnow(input: {
  hideInternal: boolean;
  watchFor: readonly string[];
  internalNote: string;
  answers: Answers;
}): { tags: WatchTag[]; guarding: boolean; note: string } | null {
  if (input.hideInternal) return null;
  const tags = WATCH_TAGS.filter((tag) => input.watchFor.includes(tag));
  const guarding = input.answers.guard === "y";
  const note = input.internalNote.trim();
  if (tags.length === 0 && !guarding && !note) return null;
  return { tags, guarding, note };
}

/** "Sarah Johnson" → "Sarah" — "Note from Sarah". */
export function firstNameOf(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}
