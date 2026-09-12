import { z } from "zod";

import type {
  HomeworkPracticeEntry,
  TrainingHomework,
} from "@/lib/training-enrollment";

// ============================================================================
// `training_homework` + `training_homework_practice` ↔ TrainingHomework
// (20260912205812 a_homework_is_assigned_and_practised).
//
// The screens already speak TrainingHomework — the shape of the fixture they
// read until now — so the rows are mapped onto it rather than the screens
// being rewritten around a new one. `enrollmentId` is the enrollment's uuid,
// which is what the real enrollments carry; `petId` is the dog's REF, the
// number every other training screen keys on; each practice row is one entry
// of `practiceLog`.
// ============================================================================

export const TRAINING_HOMEWORK_SELECT =
  "id, enrollment_id, session_number, session_date, title, description, instructions, resources, frequency, next_due_date, completed_at, author_name, created_at, pet:pet_id ( ref, name ), practice:training_homework_practice ( practice_date, marked_at, logged_by, trainer_response, trainer_responded_at, trainer_responded_by )" as const;

export interface TrainingHomeworkPracticeRow {
  practice_date: string;
  marked_at: string;
  logged_by: string;
  trainer_response: string | null;
  trainer_responded_at: string | null;
  trainer_responded_by: string | null;
}

export interface TrainingHomeworkRow {
  id: string;
  enrollment_id: string;
  session_number: number;
  session_date: string | null;
  title: string;
  description: string;
  instructions: string[] | null;
  resources: string[] | null;
  frequency: string | null;
  next_due_date: string | null;
  completed_at: string | null;
  author_name: string | null;
  created_at: string;
  pet: { ref: number; name: string } | null;
  practice: TrainingHomeworkPracticeRow[] | null;
}

function toPracticeEntry(
  row: TrainingHomeworkPracticeRow,
): HomeworkPracticeEntry {
  return {
    date: row.practice_date,
    markedAt: row.marked_at,
    ...(row.trainer_response
      ? {
          trainerResponse: row.trainer_response,
          ...(row.trainer_responded_at
            ? { trainerRespondedAt: row.trainer_responded_at }
            : {}),
          ...(row.trainer_responded_by
            ? { trainerRespondedBy: row.trainer_responded_by }
            : {}),
        }
      : {}),
  };
}

export function rowToTrainingHomework(
  row: TrainingHomeworkRow,
): TrainingHomework {
  const assigned = row.created_at.slice(0, 10);
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    ...(row.pet ? { petId: row.pet.ref, petName: row.pet.name } : {}),
    sessionNumber: row.session_number,
    sessionDate: row.session_date ?? assigned,
    title: row.title,
    description: row.description,
    instructions: row.instructions ?? [],
    ...(row.resources && row.resources.length > 0
      ? { resources: row.resources }
      : {}),
    ...(row.frequency ? { frequency: row.frequency } : {}),
    nextDueDate: row.next_due_date,
    practiceLog: (row.practice ?? [])
      .map(toPracticeEntry)
      .sort((a, b) => a.date.localeCompare(b.date)),
    // Real homework is the owner's from the moment it is assigned; the
    // fixture's locked-until-a-later-session homework has no row.
    unlocked: true,
    unlockedDate: assigned,
    completed: row.completed_at !== null,
    completedDate: row.completed_at ? row.completed_at.slice(0, 10) : null,
  };
}

const ISO_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A date is YYYY-MM-DD.");

export const trainingHomeworkCreateSchema = z.object({
  enrollmentId: z.string().uuid(),
  sessionNumber: z.number().int().min(1).max(1000).optional(),
  sessionDate: ISO_DATE.optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  instructions: z.array(z.string().trim().min(1).max(1000)).max(50).optional(),
  resources: z.array(z.string().trim().min(1).max(2000)).max(20).optional(),
  frequency: z.string().trim().min(1).max(120).optional(),
  nextDueDate: ISO_DATE.nullable().optional(),
});
export type TrainingHomeworkCreate = z.infer<
  typeof trainingHomeworkCreateSchema
>;

/** One piece of homework, or several at once — a session assigns each exercise
 *  to every dog that attended, and that is one insert, all or none. */
export const trainingHomeworkAssignSchema = z.union([
  trainingHomeworkCreateSchema,
  z.array(trainingHomeworkCreateSchema).min(1).max(200),
]);

export const trainingHomeworkPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    instructions: z
      .array(z.string().trim().min(1).max(1000))
      .max(50)
      .optional(),
    resources: z.array(z.string().trim().min(1).max(2000)).max(20).optional(),
    frequency: z.string().trim().max(120).nullable().optional(),
    nextDueDate: ISO_DATE.nullable().optional(),
    /** Complete it (the due date goes with it), or reopen it. */
    completed: z.boolean().optional(),
  })
  .strict();
export type TrainingHomeworkPatch = z.infer<typeof trainingHomeworkPatchSchema>;

export const homeworkPracticeSchema = z.object({ date: ISO_DATE }).strict();

/** An empty response clears it, so the owner sees the day as unreviewed. */
export const homeworkResponseSchema = z
  .object({ date: ISO_DATE, response: z.string().trim().max(2000) })
  .strict();
