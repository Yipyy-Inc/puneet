"use client";

import {
  DIFFICULTY_LABELS,
  type DifficultyLevel,
} from "@/data/training-exercises";
import { defaultTrainingWaivers } from "@/data/training-waivers";
import { MILESTONE_LABELS, type MilestoneKind } from "@/lib/pet-milestones";
import {
  REPORT_CARD_SEND_MODE_HELP,
  REPORT_CARD_SEND_MODE_LABELS,
  type ReportCardSendMode,
} from "@/lib/training-module-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The four label tables the training settings screen reads out of a fixture.
//
// ── WHY THESE NEED A HOOK AT ALL ─────────────────────────────────────────
//
// A module-level constant cannot call a hook, so it cannot know a locale. All
// four of these are plain objects in `src/data` or `src/lib`, and all four are
// rendered verbatim by the settings screen — which means `check:ui-french`
// cannot see them either: it looks for English WORDS IN JSX, and
// `{MILESTONE_LABELS[kind]}` is an expression. Three separate kinds of English
// the gate structurally cannot see are already recorded in the debt map; this
// is the first one.
//
// So the fixture keeps the English (it is still the fallback, and still what a
// consumer outside settings reads), and the lookup lives here once rather than
// in each of the four render sites.
//
// ── THE KEY IS WHAT TRAVELS ──────────────────────────────────────────────
//
// `difficultyLevel`, `MilestoneKind`, `ReportCardSendMode` and a waiver's `id`
// are all STORED and matched. Only the label moves. Every resolver falls back
// to the fixture's own English on a miss, so a value added to a fixture later
// reads as English words rather than as a raw key on screen.
// ============================================================================

const DIFFICULTY_KEYS: Record<DifficultyLevel, string> = {
  foundation: "diffFoundation",
  intermediate: "diffIntermediate",
  advanced: "diffAdvanced",
  competition: "diffCompetition",
};

const MILESTONE_KEYS: Record<MilestoneKind, string> = {
  "first-session": "mileFirstSession",
  "first-mastered": "mileFirstMastered",
  "first-series": "mileFirstSeries",
  "five-sessions": "mileFiveSessions",
  "ten-sessions": "mileTenSessions",
  "twenty-five-sessions": "mileTwentyFiveSessions",
  "first-homework": "mileFirstHomework",
  "seven-day-homework-streak": "mileSevenDayStreak",
  "thirty-day-homework-streak": "mileThirtyDayStreak",
  "four-week-streak": "mileFourWeekStreak",
};

const SEND_MODE_KEYS: Record<ReportCardSendMode, string> = {
  immediate: "rcImmediate",
  after_review: "rcAfterReview",
  scheduled_batch: "rcBatch",
};

const SEND_MODE_HELP_KEYS: Record<ReportCardSendMode, string> = {
  immediate: "rcImmediateHelp",
  after_review: "rcAfterReviewHelp",
  scheduled_batch: "rcBatchHelp",
};

// A waiver's TITLE and SUMMARY are interface copy and are translated. Its
// `fullText` is NOT, and deliberately: it is a liability release, a vaccine
// attestation and a media consent — legal wording the business is bound by,
// which is the facility's own lawyer's to write in French, not a translator's
// to invent. The enrolment dialog that renders `fullText` is where that has to
// be resolved; it is in the debt map.
const WAIVER_KEYS: Record<string, { title: string; summary: string }> = {
  "waiver-liability": {
    title: "waiverLiability",
    summary: "waiverLiabilitySummary",
  },
  "waiver-vaccines": {
    title: "waiverVaccines",
    summary: "waiverVaccinesSummary",
  },
  "waiver-photo": { title: "waiverPhoto", summary: "waiverPhotoSummary" },
};

const WAIVER_FALLBACK = new Map(
  defaultTrainingWaivers.map((w) => [w.id, w] as const),
);

export interface TrainingLabels {
  difficulty: (level: DifficultyLevel) => string;
  milestone: (kind: MilestoneKind) => string;
  sendMode: (mode: ReportCardSendMode) => string;
  sendModeHelp: (mode: ReportCardSendMode) => string;
  waiverTitle: (id: string) => string;
  waiverSummary: (id: string) => string;
}

export function useTrainingLabels(): TrainingLabels {
  const t = useSettingsText().section("training");

  /** The catalogue's string, or the fixture's English when there is none. */
  const resolve = (key: string | undefined, fallback: string) => {
    if (key === undefined) return fallback;
    const label = t(key);
    return label === key ? fallback : label;
  };

  return {
    difficulty: (level) =>
      resolve(DIFFICULTY_KEYS[level], DIFFICULTY_LABELS[level] ?? level),
    milestone: (kind) =>
      resolve(MILESTONE_KEYS[kind], MILESTONE_LABELS[kind] ?? kind),
    sendMode: (mode) =>
      resolve(SEND_MODE_KEYS[mode], REPORT_CARD_SEND_MODE_LABELS[mode] ?? mode),
    sendModeHelp: (mode) =>
      resolve(
        SEND_MODE_HELP_KEYS[mode],
        REPORT_CARD_SEND_MODE_HELP[mode] ?? "",
      ),
    waiverTitle: (id) =>
      resolve(WAIVER_KEYS[id]?.title, WAIVER_FALLBACK.get(id)?.title ?? id),
    waiverSummary: (id) =>
      resolve(WAIVER_KEYS[id]?.summary, WAIVER_FALLBACK.get(id)?.summary ?? ""),
  };
}
