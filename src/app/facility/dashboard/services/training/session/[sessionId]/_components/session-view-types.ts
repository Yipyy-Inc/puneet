export type AttendanceMark = {
  status: "present" | "absent" | "late";
  markedAtISO: string;
};

export type ExerciseRating = 1 | 2 | 3 | 4 | 5;

/** Per-student per-exercise tracking. `included` is whether the dog
 *  participated in the exercise (defaults to true for present students);
 *  `rating` is null until the trainer taps a star. */
export interface StudentExerciseEntry {
  included: boolean;
  rating: ExerciseRating | null;
}

/** One exercise covered in the session. Holds a per-student map keyed by
 *  enrollmentId so the UI can fan out checkboxes + ratings per dog. */
export interface SessionExerciseEntry {
  rowId: string;
  exerciseId: string;
  exerciseName: string;
  /** Discipline tag — used to show a small chip next to the exercise name. */
  disciplineId: string;
  students: Record<string, StudentExerciseEntry>;
}

export const RATING_LABELS: Record<ExerciseRating, string> = {
  1: "Developing",
  2: "Getting it",
  3: "Good",
  4: "Excellent",
  5: "Mastered",
};

/** Captured photo attached to the session. URL is a blob: object URL for now
 *  (mock); will become a server-hosted URL once the upload API lands. */
export interface SessionPhoto {
  id: string;
  url: string;
  caption: string;
  takenAtISO: string;
}
