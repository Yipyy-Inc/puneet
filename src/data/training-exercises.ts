/**
 * Exercise library.
 *
 * The Session Completion flow (Step 2 — Training Log) pulls from this list to
 * power the exercise picker. Each exercise is tagged with a discipline so the
 * picker can be filtered to "exercises relevant to this course's discipline".
 *
 * Each exercise also has a difficulty tier (Foundation → Competition) and an
 * `order` within its (discipline, difficulty) bucket so the picker can render
 * the natural progression instead of an alphabetical list. The progression
 * order is what differentiates Yipyy from competitors — a real training
 * program builds skill, and the session log should mirror that arc.
 */
import { trainingPackages } from "@/data/training";
import type { TrainingPackage } from "@/types/training";
import {
  defaultTrainingCourseTypes,
  getEffectiveCurriculumStyle,
  type TrainingCourseType,
  type CourseCurriculumWeek,
  type CurriculumStyle,
} from "@/lib/training-config";

export type DifficultyLevel =
  | "foundation"
  | "intermediate"
  | "advanced"
  | "competition";

/** Progression order — Foundation first, Competition last. Iterate this when
 *  rendering tier headers so the visual order matches a real curriculum. */
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  "foundation",
  "intermediate",
  "advanced",
  "competition",
] as const;

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
  competition: "Competition",
};

/** Compact short labels for tight UIs (badges inside dropdowns, mobile). */
export const DIFFICULTY_SHORT_LABELS: Record<DifficultyLevel, string> = {
  foundation: "Found.",
  intermediate: "Inter.",
  advanced: "Adv.",
  competition: "Comp.",
};

/** Badge styling per tier — escalating intensity: emerald → sky → amber →
 *  purple. Used by the manager, the picker tier headers, and any per-exercise
 *  badges so the same color language reads everywhere. */
export const DIFFICULTY_BADGE_CLS: Record<DifficultyLevel, string> = {
  foundation: "border-emerald-200 bg-emerald-50 text-emerald-700",
  intermediate: "border-sky-200 bg-sky-50 text-sky-700",
  advanced: "border-amber-200 bg-amber-50 text-amber-700",
  competition: "border-purple-200 bg-purple-50 text-purple-700",
};

const DIFFICULTY_INDEX: Record<DifficultyLevel, number> = {
  foundation: 0,
  intermediate: 1,
  advanced: 2,
  competition: 3,
};

export function difficultyRank(level: DifficultyLevel | undefined): number {
  if (!level) return DIFFICULTY_INDEX.foundation;
  return DIFFICULTY_INDEX[level];
}

export interface TrainingExerciseDef {
  id: string;
  name: string;
  /** References a TrainingDiscipline id (see data/training-disciplines.ts). */
  disciplineId: string;
  description?: string;
  /** Difficulty tier within the discipline — drives picker grouping. */
  difficultyLevel: DifficultyLevel;
  /** Position within the (discipline, difficulty) bucket, ascending. New
   *  custom exercises default to the bottom of their target tier. */
  order: number;
  /** Hidden exercises are kept on file (so historical attendance records still
   *  resolve names) but drop out of the Session Completion picker. */
  isHidden?: boolean;
  /** True for exercises a facility added themselves. Predefined entries shipped
   *  with the system can only be hidden, never deleted — customs can be deleted
   *  freely since no historical lookup would exist for them anyway. */
  isCustom?: boolean;
}

export const trainingExercises: TrainingExerciseDef[] = [
  // ── Obedience ──────────────────────────────────────────────────────────
  {
    id: "ex-obed-name",
    name: "Name recognition",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-obed-sit",
    name: "Sit on cue",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-obed-down",
    name: "Down on cue",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 2,
  },
  {
    id: "ex-obed-greeting",
    name: "Polite greeting",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 3,
  },
  {
    id: "ex-obed-settle",
    name: "Settle on a mat",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 4,
  },
  {
    id: "ex-obed-stay",
    name: "Stay (duration)",
    disciplineId: "discipline-obedience",
    description: "Hold a stay through distance or duration.",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-obed-recall",
    name: "Recall on cue",
    disciplineId: "discipline-obedience",
    description: "Come when called, indoors or outdoors.",
    difficultyLevel: "intermediate",
    order: 2,
  },
  {
    id: "ex-obed-llw",
    name: "Loose-leash walking",
    disciplineId: "discipline-obedience",
    difficultyLevel: "intermediate",
    order: 3,
  },
  {
    id: "ex-obed-leaveit",
    name: "Leave it",
    disciplineId: "discipline-obedience",
    difficultyLevel: "intermediate",
    order: 4,
  },
  {
    id: "ex-obed-heel",
    name: "Heel patterns",
    disciplineId: "discipline-obedience",
    difficultyLevel: "advanced",
    order: 1,
  },
  {
    id: "ex-obed-leash-intro",
    name: "Leash introduction",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 5,
  },
  {
    id: "ex-obed-place",
    name: "Mat / place foundation",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 6,
  },
  {
    id: "ex-obed-hand-signals",
    name: "Hand signals (sit & down)",
    disciplineId: "discipline-obedience",
    difficultyLevel: "foundation",
    order: 7,
  },
  {
    id: "ex-obed-dropit",
    name: "Drop it",
    disciplineId: "discipline-obedience",
    difficultyLevel: "intermediate",
    order: 5,
  },
  {
    id: "ex-obed-direction-changes",
    name: "Direction changes",
    disciplineId: "discipline-obedience",
    difficultyLevel: "intermediate",
    order: 6,
  },
  {
    id: "ex-obed-recall-games",
    name: "Recall games",
    disciplineId: "discipline-obedience",
    difficultyLevel: "intermediate",
    order: 7,
  },
  {
    id: "ex-obed-stay-distance",
    name: "Stay with distance",
    disciplineId: "discipline-obedience",
    difficultyLevel: "advanced",
    order: 2,
  },
  {
    id: "ex-obed-recall-distractions",
    name: "Recall with distractions",
    disciplineId: "discipline-obedience",
    difficultyLevel: "advanced",
    order: 3,
  },

  // ── Agility ────────────────────────────────────────────────────────────
  {
    id: "ex-agility-jumps",
    name: "Jumps",
    disciplineId: "discipline-agility",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-agility-tunnel",
    name: "Tunnel",
    disciplineId: "discipline-agility",
    difficultyLevel: "foundation",
    order: 2,
  },
  {
    id: "ex-agility-table",
    name: "Pause table",
    disciplineId: "discipline-agility",
    difficultyLevel: "foundation",
    order: 3,
  },
  {
    id: "ex-agility-weaves",
    name: "Weave poles",
    disciplineId: "discipline-agility",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-agility-aframe",
    name: "A-frame contacts",
    disciplineId: "discipline-agility",
    difficultyLevel: "intermediate",
    order: 2,
  },
  {
    id: "ex-agility-dogwalk",
    name: "Dog walk contacts",
    disciplineId: "discipline-agility",
    difficultyLevel: "intermediate",
    order: 3,
  },
  {
    id: "ex-agility-frontcross",
    name: "Front cross",
    disciplineId: "discipline-agility",
    difficultyLevel: "advanced",
    order: 1,
  },
  {
    id: "ex-agility-rearcross",
    name: "Rear cross",
    disciplineId: "discipline-agility",
    difficultyLevel: "advanced",
    order: 2,
  },
  {
    id: "ex-agility-sequencing",
    name: "Course sequencing",
    disciplineId: "discipline-agility",
    difficultyLevel: "competition",
    order: 1,
  },

  // ── Protection Sports ─────────────────────────────────────────────────
  {
    id: "ex-prot-grip",
    name: "Grip work",
    disciplineId: "discipline-protection",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-prot-out",
    name: "Out / release",
    disciplineId: "discipline-protection",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-prot-hold-bark",
    name: "Hold & bark",
    disciplineId: "discipline-protection",
    difficultyLevel: "advanced",
    order: 1,
  },
  {
    id: "ex-prot-pressure-heel",
    name: "Heeling under pressure",
    disciplineId: "discipline-protection",
    difficultyLevel: "advanced",
    order: 2,
  },
  {
    id: "ex-prot-send-away",
    name: "Send-away",
    disciplineId: "discipline-protection",
    difficultyLevel: "competition",
    order: 1,
  },
  {
    id: "ex-prot-search",
    name: "Search and bark",
    disciplineId: "discipline-protection",
    difficultyLevel: "competition",
    order: 2,
  },

  // ── Nosework ─────────────────────────────────────────────────────────
  {
    id: "ex-nose-source",
    name: "Source discrimination",
    disciplineId: "discipline-nosework",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-nose-containers",
    name: "Container search",
    disciplineId: "discipline-nosework",
    difficultyLevel: "foundation",
    order: 2,
  },
  {
    id: "ex-nose-interior",
    name: "Interior search",
    disciplineId: "discipline-nosework",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-nose-exterior",
    name: "Exterior search",
    disciplineId: "discipline-nosework",
    difficultyLevel: "intermediate",
    order: 2,
  },
  {
    id: "ex-nose-vehicles",
    name: "Vehicle search",
    disciplineId: "discipline-nosework",
    difficultyLevel: "intermediate",
    order: 3,
  },
  {
    id: "ex-nose-buried",
    name: "Buried hide",
    disciplineId: "discipline-nosework",
    difficultyLevel: "advanced",
    order: 1,
  },

  // ── Puppy ────────────────────────────────────────────────────────────
  {
    id: "ex-puppy-name",
    name: "Name response",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-puppy-sit",
    name: "Sit on cue",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 2,
  },
  {
    id: "ex-puppy-down",
    name: "Down on cue",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 3,
  },
  {
    id: "ex-puppy-target",
    name: "Hand target",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 4,
  },
  {
    id: "ex-puppy-socialization",
    name: "Puppy socialization",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 5,
  },
  {
    id: "ex-puppy-handling",
    name: "Handling exercises",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 6,
  },
  {
    id: "ex-puppy-crate",
    name: "Crate comfort",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 7,
  },
  {
    id: "ex-puppy-potty",
    name: "Potty signal",
    disciplineId: "discipline-puppy",
    difficultyLevel: "foundation",
    order: 8,
  },

  // ── Behavior Modification ────────────────────────────────────────────
  {
    id: "ex-behav-place",
    name: "Place / mat work",
    disciplineId: "discipline-behavior",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-behav-lat",
    name: "Look-at-that (LAT) game",
    disciplineId: "discipline-behavior",
    difficultyLevel: "foundation",
    order: 2,
  },
  {
    id: "ex-behav-door",
    name: "Door manners",
    disciplineId: "discipline-behavior",
    difficultyLevel: "foundation",
    order: 3,
  },
  {
    id: "ex-behav-threshold",
    name: "Threshold work",
    disciplineId: "discipline-behavior",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-behav-engage",
    name: "Engage-disengage game",
    disciplineId: "discipline-behavior",
    difficultyLevel: "intermediate",
    order: 2,
  },
  {
    id: "ex-behav-counter",
    name: "Counter-conditioning",
    disciplineId: "discipline-behavior",
    difficultyLevel: "intermediate",
    order: 3,
  },
  {
    id: "ex-behav-desensitize",
    name: "Desensitization",
    disciplineId: "discipline-behavior",
    difficultyLevel: "intermediate",
    order: 4,
  },

  // ── Rally ────────────────────────────────────────────────────────────
  {
    id: "ex-rally-halt-sit",
    name: "Halt-sit",
    disciplineId: "discipline-rally",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-rally-about-turn",
    name: "About turn",
    disciplineId: "discipline-rally",
    difficultyLevel: "foundation",
    order: 2,
  },
  {
    id: "ex-rally-halt-down",
    name: "Halt-down-stay",
    disciplineId: "discipline-rally",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-rally-pivot-left",
    name: "Pivot left",
    disciplineId: "discipline-rally",
    difficultyLevel: "intermediate",
    order: 2,
  },
  {
    id: "ex-rally-pivot-right",
    name: "Pivot right",
    disciplineId: "discipline-rally",
    difficultyLevel: "intermediate",
    order: 3,
  },
  {
    id: "ex-rally-jump",
    name: "Send over jump",
    disciplineId: "discipline-rally",
    difficultyLevel: "advanced",
    order: 1,
  },

  // ── Scent Work ───────────────────────────────────────────────────────
  {
    id: "ex-scent-novel-containers",
    name: "Novel container search",
    disciplineId: "discipline-scent",
    difficultyLevel: "foundation",
    order: 1,
  },
  {
    id: "ex-scent-exterior-wind",
    name: "Exterior with wind",
    disciplineId: "discipline-scent",
    difficultyLevel: "intermediate",
    order: 1,
  },
  {
    id: "ex-scent-interior-height",
    name: "Interior at height",
    disciplineId: "discipline-scent",
    difficultyLevel: "advanced",
    order: 1,
  },
  {
    id: "ex-scent-vehicle-clean",
    name: "Vehicle clean-room",
    disciplineId: "discipline-scent",
    difficultyLevel: "advanced",
    order: 2,
  },
  {
    id: "ex-scent-converging",
    name: "Converging odors",
    disciplineId: "discipline-scent",
    difficultyLevel: "competition",
    order: 1,
  },
];

/** Normalize a class name for fuzzy matching against catalog names. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resolve a discipline id from a list of named, discipline-tagged items by
 *  fuzzy-matching `className`: an exact normalized-name match wins, otherwise
 *  the first partial (substring either direction) match. Returns `undefined`
 *  when nothing matches or the matched item carries no discipline. */
function findDisciplineIdByName(
  className: string,
  items: { name: string; disciplineId?: string }[],
): string | undefined {
  const normalized = normalize(className);
  const exact = items.find((item) => normalize(item.name) === normalized);
  if (exact?.disciplineId) return exact.disciplineId;
  const partial = items.find((item) => {
    const itemName = normalize(item.name);
    return itemName.includes(normalized) || normalized.includes(itemName);
  });
  return partial?.disciplineId;
}

/**
 * Guess a class's discipline by matching its name against the training catalog.
 * Returns `undefined` when nothing matches — callers then fall back to their
 * own unscoped behaviour (e.g. the session exercise picker shows no default
 * suggestions until the trainer searches the full library).
 *
 * Course types are the source of truth for a course's discipline (set in the
 * Course Catalog's Edit Course Type modal), so a matching course type wins.
 * The TrainingClass/TrainingSession schema carries no disciplineId itself, so
 * for classes that mirror a bookable program but no course type, the program
 * (TrainingPackage) catalog is consulted as a fallback. Matching is by name,
 * so a class whose name resembles neither catalog stays unresolved.
 */
export function getDisciplineIdForClassName(
  className: string,
  packages: TrainingPackage[] = trainingPackages,
  courseTypes: { name: string; disciplineId?: string }[] = defaultTrainingCourseTypes,
): string | undefined {
  return (
    findDisciplineIdByName(className, courseTypes) ??
    findDisciplineIdByName(className, packages)
  );
}

/** Find the catalog item whose name best matches `className` — an exact
 *  normalized-name match wins, otherwise the first partial (substring either
 *  direction) match. Returns `undefined` when nothing matches. */
function matchByName<T extends { name: string }>(
  className: string,
  items: T[],
): T | undefined {
  const normalized = normalize(className);
  const exact = items.find((i) => normalize(i.name) === normalized);
  if (exact) return exact;
  return items.find((i) => {
    const itemName = normalize(i.name);
    return itemName.includes(normalized) || normalized.includes(itemName);
  });
}

/**
 * Resolve the curriculum exercises for a class + session number. The class
 * name is matched to a course type (by name), then that course type's
 * `sessionCurriculum` is consulted for the matching week. Exercises are
 * returned in the curriculum's teaching order, with hidden/removed ones
 * dropped. Empty when the class doesn't map to a curriculum-bearing course
 * type or the week has no plan — callers then fall back to their existing
 * behaviour (discipline suggestions / prior-session continuity).
 */
/** Resolve the curriculum WEEK (sessionNumber + title + exerciseIds) for a
 *  class + session number — by matching the class name to a course type.
 *  Returns `undefined` when the class doesn't map to a curriculum-bearing
 *  course type or that week has no plan. Used for the session banner
 *  ("Session 3 · {title}") and to seed the week's exercises. */
export function getCurriculumWeekForClass(
  className: string,
  sessionNumber: number,
  courseTypes: TrainingCourseType[] = defaultTrainingCourseTypes,
): CourseCurriculumWeek | undefined {
  const course = matchByName(className, courseTypes);
  return course?.sessionCurriculum?.find(
    (w) => w.sessionNumber === sessionNumber,
  );
}

export function getCurriculumExercisesForClass(
  className: string,
  sessionNumber: number,
  courseTypes: TrainingCourseType[] = defaultTrainingCourseTypes,
  exercises: TrainingExerciseDef[] = trainingExercises,
): TrainingExerciseDef[] {
  const week = getCurriculumWeekForClass(className, sessionNumber, courseTypes);
  if (!week || week.exerciseIds.length === 0) return [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return week.exerciseIds
    .map((id) => byId.get(id))
    .filter((e): e is TrainingExerciseDef => !!e && !e.isHidden);
}

/** Course-type-id variants of the curriculum resolvers — used where the caller
 *  already knows the exact course type (e.g. the customer portal, which has
 *  `series.courseTypeId`), so there's no name-match fuzziness. */
export function getCurriculumWeekForCourseType(
  courseTypeId: string,
  sessionNumber: number,
  courseTypes: TrainingCourseType[] = defaultTrainingCourseTypes,
): CourseCurriculumWeek | undefined {
  const course = courseTypes.find((c) => c.id === courseTypeId);
  return course?.sessionCurriculum?.find(
    (w) => w.sessionNumber === sessionNumber,
  );
}

export function getCurriculumExercisesForCourseType(
  courseTypeId: string,
  sessionNumber: number,
  courseTypes: TrainingCourseType[] = defaultTrainingCourseTypes,
  exercises: TrainingExerciseDef[] = trainingExercises,
): TrainingExerciseDef[] {
  const week = getCurriculumWeekForCourseType(
    courseTypeId,
    sessionNumber,
    courseTypes,
  );
  if (!week || week.exerciseIds.length === 0) return [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return week.exerciseIds
    .map((id) => byId.get(id))
    .filter((e): e is TrainingExerciseDef => !!e && !e.isHidden);
}

/** Resolve a course type's effective curriculum style by matching a class name
 *  to the catalog (same name-match the curriculum resolvers use). Defaults to
 *  `structured` when the class maps to no course type — a class that mirrors a
 *  curriculum-bearing course keeps its structured pre-load behaviour. */
export function getCurriculumStyleForClass(
  className: string,
  courseTypes: TrainingCourseType[] = defaultTrainingCourseTypes,
): CurriculumStyle {
  const course = matchByName(className, courseTypes);
  return course ? getEffectiveCurriculumStyle(course) : "structured";
}

/** Course-type-id variant of {@link getCurriculumStyleForClass} — used where
 *  the caller already knows the exact course type (customer portal, student
 *  profile). Defaults to `structured` for an unknown id. */
export function getCurriculumStyleForCourseType(
  courseTypeId: string,
  courseTypes: TrainingCourseType[] = defaultTrainingCourseTypes,
): CurriculumStyle {
  const course = courseTypes.find((c) => c.id === courseTypeId);
  return course ? getEffectiveCurriculumStyle(course) : "structured";
}

/** Compare two exercises by progression order — difficulty tier first, then
 *  `order` within the tier, then name as a stable fallback for any records
 *  that landed with duplicate orders. */
export function compareExerciseProgression(
  a: TrainingExerciseDef,
  b: TrainingExerciseDef,
): number {
  const tierDiff = difficultyRank(a.difficultyLevel) - difficultyRank(b.difficultyLevel);
  if (tierDiff !== 0) return tierDiff;
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name);
}

/** Group exercises by discipline id, with each group already sorted in
 *  progression order (Foundation → Competition, then `order` within tier).
 *  The keys are the discipline ids. */
export function groupExercisesByDiscipline(
  exercises: TrainingExerciseDef[] = trainingExercises,
): Record<string, TrainingExerciseDef[]> {
  const out: Record<string, TrainingExerciseDef[]> = {};
  for (const ex of exercises) {
    const arr = out[ex.disciplineId];
    if (arr) arr.push(ex);
    else out[ex.disciplineId] = [ex];
  }
  for (const id of Object.keys(out)) {
    out[id]!.sort(compareExerciseProgression);
  }
  return out;
}

/** Group exercises by discipline → difficulty tier. Each tier list is sorted
 *  by `order` ascending. Empty tiers are omitted entirely so callers don't
 *  have to filter them out before rendering. */
export function groupExercisesByDisciplineAndDifficulty(
  exercises: TrainingExerciseDef[] = trainingExercises,
): Record<string, Partial<Record<DifficultyLevel, TrainingExerciseDef[]>>> {
  const out: Record<
    string,
    Partial<Record<DifficultyLevel, TrainingExerciseDef[]>>
  > = {};
  for (const ex of exercises) {
    const byTier = out[ex.disciplineId] ?? {};
    const list = byTier[ex.difficultyLevel] ?? [];
    list.push(ex);
    byTier[ex.difficultyLevel] = list;
    out[ex.disciplineId] = byTier;
  }
  for (const byTier of Object.values(out)) {
    for (const level of DIFFICULTY_LEVELS) {
      const list = byTier[level];
      if (list) list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }
  }
  return out;
}
