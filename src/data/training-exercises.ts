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

/** Normalize a class name for fuzzy matching against package names. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Guess a class's discipline by matching its name against the program catalog.
 * Returns `undefined` if no match — callers then show all exercises.
 *
 * The TrainingClass schema doesn't carry a disciplineId directly, but
 * TrainingPackage does. For named classes that mirror a package (e.g. "Basic
 * Obedience" ↔ "Basic Obedience Package"), the catalog lookup wins; everything
 * else falls back to nothing and lets the user pick from any discipline.
 */
export function getDisciplineIdForClassName(
  className: string,
  packages: TrainingPackage[] = trainingPackages,
): string | undefined {
  const normalized = normalize(className);
  const exact = packages.find((p) => normalize(p.name) === normalized);
  if (exact?.disciplineId) return exact.disciplineId;
  const partial = packages.find((p) => {
    const pn = normalize(p.name);
    return pn.includes(normalized) || normalized.includes(pn);
  });
  return partial?.disciplineId;
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
