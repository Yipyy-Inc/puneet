import { skillState, type SkillState } from "./service-view";

// ============================================================================
// A training booking's program, as the booking page's Program, Sessions and
// Skills cards show it (the client's Training mock, 2026-10-03).
//
// Nothing stores a session's title or a dog's skill list. Both come from the
// course's own curriculum (Settings › Training: each week's title and the
// exercises it teaches) and from what the trainer RECORDED at each session —
// `training_attendance.exercises`, 1 to 5 per exercise. A skill is an exercise
// of the course; its state is its latest rating (`skillState`).
// ============================================================================

export interface CurriculumWeekLike {
  sessionNumber?: unknown;
  title?: unknown;
  exerciseIds?: unknown;
}

export interface SessionLike {
  number: number;
  startAt: string;
  attendance: {
    exercises: { exerciseName: string; rating: number }[];
  } | null;
}

export interface TrainingPlanSkill {
  name: string;
  state: SkillState;
  /** This session's own rating, when the trainer gave one today. */
  todayRating: number | null;
}

/** The course's weeks, from a course type whose shape is stored loosely. */
export function curriculumOf(
  courseTypes: readonly { name: string; sessionCurriculum?: unknown }[],
  courseTypeName: string | null | undefined,
): { sessionNumber: number; title: string | null; exerciseIds: string[] }[] {
  const course = courseTypes.find(
    (c) =>
      c.name.trim().toLowerCase() ===
      (courseTypeName ?? "").trim().toLowerCase(),
  );
  const weeks = Array.isArray(course?.sessionCurriculum)
    ? (course.sessionCurriculum as CurriculumWeekLike[])
    : [];
  return weeks
    .map((w) => ({
      sessionNumber: Number(w.sessionNumber),
      title:
        typeof w.title === "string" && w.title.trim() ? w.title.trim() : null,
      exerciseIds: Array.isArray(w.exerciseIds)
        ? w.exerciseIds.filter((id): id is string => typeof id === "string")
        : [],
    }))
    .filter((w) => Number.isInteger(w.sessionNumber) && w.sessionNumber > 0)
    .sort((a, b) => a.sessionNumber - b.sessionNumber);
}

/**
 * The skills, in teaching order: the curriculum's exercises first, then any
 * exercise the trainer rated that the curriculum does not list (an adaptive
 * course has no plan, only what was done). Each with its latest rating.
 */
export function trainingSkills(input: {
  curriculum: ReturnType<typeof curriculumOf>;
  exercises: readonly { id: string; name: string }[];
  sessions: readonly SessionLike[];
  /** This booking's session number — its own ratings are "today's". */
  currentNumber: number | null;
}): TrainingPlanSkill[] {
  const nameOf = new Map(input.exercises.map((e) => [e.id, e.name]));
  const names: string[] = [];
  const add = (name: string | undefined) => {
    const clean = name?.trim();
    if (clean && !names.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      names.push(clean);
    }
  };
  for (const week of input.curriculum) {
    for (const id of week.exerciseIds) add(nameOf.get(id));
  }

  const latest = new Map<string, number>();
  let today = new Map<string, number>();
  for (const session of [...input.sessions].sort(
    (a, b) => a.number - b.number,
  )) {
    for (const rated of session.attendance?.exercises ?? []) {
      add(rated.exerciseName);
      latest.set(rated.exerciseName.toLowerCase(), rated.rating);
    }
    if (session.number === input.currentNumber) {
      today = new Map(
        (session.attendance?.exercises ?? []).map((r) => [
          r.exerciseName.toLowerCase(),
          r.rating,
        ]),
      );
    }
  }

  return names.map((name) => ({
    name,
    state: skillState(latest.get(name.toLowerCase())),
    todayRating: today.get(name.toLowerCase()) ?? null,
  }));
}

/**
 * This session's ratings after one tap: the skill set to `rating`, or taken
 * off when `rating` is null. The whole list is what the attendance row holds.
 */
export function withRating(
  current: readonly { exerciseName: string; rating: number }[],
  name: string,
  rating: number | null,
): { exerciseName: string; rating: number }[] {
  const rest = current.filter(
    (r) => r.exerciseName.toLowerCase() !== name.toLowerCase(),
  );
  return rating === null ? rest : [...rest, { exerciseName: name, rating }];
}

/** Where a session sits against today: done, today, or still to come. */
export function sessionPlace(
  session: { startAt: string; status: string; attendance: unknown },
  today: string,
  dayOf: (iso: string) => string,
): "done" | "today" | "upcoming" {
  const day = dayOf(session.startAt);
  if (day === today) return "today";
  if (session.status === "completed" || day < today) return "done";
  return "upcoming";
}
