/**
 * Homework templates — saved homework assignments a trainer can load instead
 * of typing the same thing for every cohort. Keyed by `courseTypeName` (the
 * denormalized string used on series and enrollments) so a template defined
 * for "Basic Obedience" applies to every series of that course.
 *
 * Mock-driven today; consumers (the post-session homework prompt, the Course
 * Catalog manager) read/write via the shared TanStack Query cache.
 */

/** Single line item inside a template — one exercise + cadence + instructions.
 *  Maps almost 1:1 to the runtime `TrainingHomework` record, minus the
 *  per-pet identifiers and session metadata. */
export interface HomeworkTemplateItem {
  /** Stable id for the item within its template — used as React key. */
  id: string;
  /** Exercise the dog will practice. References `training-exercises` by id;
   *  staff can also store a free-text exercise that doesn't yet exist in
   *  the catalog (display falls back to the name). */
  exerciseId: string;
  exerciseName: string;
  /** Bulleted instructions — one string per bullet. */
  instructions: string[];
  /** Practice cadence — "Daily · 5 min", "3x per week", custom string. */
  frequency: string;
  /** Optional reference URLs (videos, PDFs). Surfaced in the customer
   *  portal alongside the exercise. */
  resources?: string[];
  /** Days after the session this homework is due. Defaults to 7 — the same
   *  cadence used by the legacy single-exercise path. */
  dueDayOffset?: number;
}

export interface HomeworkTemplate {
  id: string;
  /** Display name — "Basic Obedience Week 3 Homework". */
  name: string;
  /** Course this template applies to. Matches `series.courseTypeName` after
   *  normalization so the homework prompt can auto-pick the right ones. */
  courseTypeName: string;
  /** Optional — when set, the template is the canonical "Week N" homework
   *  for this course. Drives both the ordered list in Course Catalog and
   *  the auto-load behaviour in the session-completion prompt. Unset
   *  templates show up at the end of the list. */
  sessionNumber?: number;
  /** Free-text body shared across every item — surfaced as the homework
   *  card description for the customer. Optional. */
  description?: string;
  items: HomeworkTemplateItem[];
  /** Manual sort order within the same course. Lower numbers first. Used
   *  as a tiebreaker when `sessionNumber` is unset on multiple templates. */
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Seed library — every facility starts with a handful so the Course Catalog
 *  list isn't blank on first use. */
export const defaultHomeworkTemplates: HomeworkTemplate[] = [
  {
    id: "hwt-basic-w1",
    name: "Basic Obedience · Week 1",
    courseTypeName: "Basic Obedience",
    sessionNumber: 1,
    description:
      "Foundation week — focus on name response and sit/release timing.",
    items: [
      {
        id: "hwti-basic-w1-1",
        exerciseId: "ex-sit",
        exerciseName: "Sit on cue",
        instructions: [
          "Lure-free reps in a quiet room.",
          "Reward inside 1 second to mark the position.",
          "Stop at 5 minutes — short sessions only this week.",
        ],
        frequency: "Daily · 5 min",
        dueDayOffset: 7,
      },
      {
        id: "hwti-basic-w1-2",
        exerciseId: "ex-name",
        exerciseName: "Name response",
        instructions: [
          "Pay a high-value treat every time your dog turns toward their name.",
          "10 reps per session, vary the room.",
        ],
        frequency: "Daily · 5 min",
        dueDayOffset: 7,
      },
    ],
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "hwt-basic-w2",
    name: "Basic Obedience · Week 2",
    courseTypeName: "Basic Obedience",
    sessionNumber: 2,
    description: "Add duration. Begin pairing the release cue.",
    items: [
      {
        id: "hwti-basic-w2-1",
        exerciseId: "ex-sit",
        exerciseName: "Sit with duration",
        instructions: [
          "Build to a 5-second sit before releasing.",
          "Mark every release with a clear word.",
        ],
        frequency: "Daily · 10 min",
        dueDayOffset: 7,
      },
      {
        id: "hwti-basic-w2-2",
        exerciseId: "ex-down",
        exerciseName: "Down — lure stage",
        instructions: [
          "Lure from a sit to a down using a treat at the dog's chest.",
          "Fade the lure within 5 reps if the dog is following cleanly.",
        ],
        frequency: "Daily · 5 min",
        dueDayOffset: 7,
      },
    ],
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "hwt-puppy-w1",
    name: "Puppy Starter · Week 1",
    courseTypeName: "Puppy Starter Pack",
    sessionNumber: 1,
    description:
      "Socialisation week — exposure beats drills at this age. Keep it positive.",
    items: [
      {
        id: "hwti-puppy-w1-1",
        exerciseId: "ex-handling",
        exerciseName: "Gentle handling",
        instructions: [
          "30-second body checks — paws, ears, mouth.",
          "Pair each handling moment with a treat.",
        ],
        frequency: "3x per day",
        dueDayOffset: 7,
      },
    ],
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];
