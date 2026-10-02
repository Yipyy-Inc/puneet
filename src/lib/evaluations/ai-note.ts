import {
  cardHelpWith,
  cardStrengths,
  firstNameOf,
} from "@/lib/evaluations/report-card";
import {
  isPass,
  type Answers,
  type EvaluationResult,
  type NoteTone,
} from "@/lib/evaluations/questions";

// ============================================================================
// The evaluator's "Note to the owner", written with AI (the client's mock,
// 2026-10-02): the answers, the strengths, what the team will help with and
// a few words from the evaluator, turned into two to four kind sentences.
//
// Pure, so what reaches the model is tested: the FACTS are built here from
// ids, never from free text a card would not show — resource guarding and
// the internal note are not in them at all, so no wording of the prompt can
// leak them. The evaluator's own points are the one free text, and they are
// staff writing to their own customer.
//
// The fallback is a plain sentence from the same facts, flagged so the
// dialog can say it was not written by AI.
// ============================================================================

export type NoteLocale = "en" | "fr";

export interface NoteInput {
  locale: NoteLocale;
  petName: string;
  petSex: "male" | "female" | null;
  breed: string | null;
  ownerName: string;
  result: EvaluationResult | null;
  answers: Answers;
  strengths: readonly string[];
  watchFor: readonly string[];
  points: string;
  tone: NoteTone;
}

const RESULT_FACT: Record<EvaluationResult | "pending", string> = {
  approved: "approved",
  approved_with_restrictions: "approved, with a few notes",
  needs_re_evaluation: "needs one more evaluation visit",
  not_approved: "not approved for group programs right now",
  pending: "not decided yet",
};

const LEVEL: Record<string, string> = { l: "low", m: "medium", h: "high" };

const TONE: Record<NoteTone, string> = {
  warm: "warm and personal",
  upbeat: "upbeat and cheerful",
  professional: "friendly but professional",
  short: "short and sweet: two sentences",
};

/** Strength and help-with ids in plain English for the model. */
const WORDS: Record<string, string> = {
  food: "food motivated",
  toy: "toy motivated",
  recall: "excellent recall",
  puppies: "gentle with puppies",
  people: "loves people",
  dogs_yes: "friendly with dogs",
  dogs_no: "prefers people to dogs",
  people_yes: "loves people",
  people_no: "takes time with new people",
  confidence: "building confidence",
  gentle_mouth: "gentle mouth manners",
  four_paws: "four paws on the floor",
  slow_intros: "slow, calm introductions",
  settling: "settling on their own",
  gates: "extra supervision at gates",
};

export function noteFacts(input: NoteInput): string[] {
  const strengths = cardStrengths(input.strengths, input.answers).map(
    (strength) => WORDS[strength.id] ?? strength.id,
  );
  const helpWith = cardHelpWith(input.watchFor).map((id) => WORDS[id] ?? id);
  const sex =
    input.petSex === "male"
      ? "male (he)"
      : input.petSex === "female"
        ? "female (she)"
        : "unknown (they)";
  return [
    `Pet: ${input.petName}${input.breed ? ` (${input.breed})` : ""}, ${sex}`,
    `Owner first name: ${firstNameOf(input.ownerName) || "unknown"}`,
    `Result: ${RESULT_FACT[input.result ?? "pending"]}`,
    `Friendly with dogs: ${input.answers.dog === "y" ? "yes" : input.answers.dog === "n" ? "no" : "not noted"}`,
    `Friendly with people: ${input.answers.human === "y" ? "yes" : input.answers.human === "n" ? "no" : "not noted"}`,
    `Energy: ${LEVEL[input.answers.energy ?? ""] ?? "not noted"}`,
    `Play style: ${input.answers.play ?? "not noted"}`,
    `Recommended play group: ${input.answers.group ?? "not noted"}`,
    `Strengths: ${strengths.join(", ") || "none noted"}`,
    `The team will help with: ${helpWith.join(", ") || "nothing noted"}`,
    `Evaluator's points: ${input.points.trim() || "none"}`,
  ];
}

export function noteSystemPrompt(
  input: Pick<NoteInput, "locale" | "tone">,
): string {
  return [
    'You write the short "note from the evaluator" on a pet evaluation report card that a dog daycare and boarding facility sends to the pet\'s owner.',
    "The card already greets the owner by name above your note and shows the evaluator's name below it, so write no greeting and no sign-off.",
    "",
    "Rules:",
    "- 2 to 4 sentences, 45 to 80 words, plain text. No markdown, lists, emojis or quotation marks around the note.",
    `- Write in ${input.locale === "fr" ? "Canadian French" : "English"}.`,
    "- Build only on the facts and the evaluator's points. Never invent an observation that is not in them.",
    "- Never mention aggression, biting, growling, resource guarding or any safety concern, even if the points hint at one. A tricky moment is described gently, as something the team will help with.",
    "- If the result is not a pass, stay kind and forward-looking: invite the owner back, or to talk with the team, without blame.",
    '- Refer to the pet by name, and as he, she or they as the facts say. Never call a pet "it".',
    `- Tone: ${TONE[input.tone]}.`,
    "",
    "Reply with the note only.",
  ].join("\n");
}

/** A note from the same facts, for when AI is not available. */
export function fallbackNote(input: NoteInput): string {
  const pet = input.petName;
  const pass = input.result ? isPass(input.result) : true;
  if (input.locale === "fr") {
    return [
      `${pet} a fait une très belle visite, et nous avons adoré faire sa connaissance.`,
      pass
        ? "Nous avons hâte de l’accueillir à nouveau."
        : "Chaque chien prend ses repères à son rythme, et nous serions ravis de vous accueillir de nouveau.",
    ].join(" ");
  }
  const them =
    input.petSex === "male"
      ? "him"
      : input.petSex === "female"
        ? "her"
        : "them";
  return [
    `${pet} did a lovely job today, and we enjoyed getting to know ${them}.`,
    pass
      ? `We can't wait to welcome ${pet} back for lots more fun.`
      : `Every pup settles at their own pace, and we would love to see ${pet} again.`,
  ].join(" ");
}

/** The model's reply as a note: one paragraph, no wrapping quotes. */
export function cleanNote(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“«]\s*|\s*["”»]$/g, "")
    .slice(0, 1200);
}
