import { z } from "zod";

import { trainerNoteCategoryEnum, type TrainerNote } from "@/types/training";

// ============================================================================
// `training_notes` ↔ TrainerNote (20260912… a_trainers_note_is_a_row).
//
// The screens already speak TrainerNote — the shape of the fixture they read
// until now — so the row is mapped onto it rather than the screens being
// rewritten around a new one. `petId` is the pet's REF, the number every other
// training screen keys on; `classId` is the series the enrollment belongs to.
// ============================================================================

export const TRAINING_NOTE_SELECT =
  "id, category, body, is_private, is_active_alert, deactivated_at, deactivation_reason, deactivated_by_name, is_pinned, pinned_at, author_name, class_name, enrollment_id, session_id, created_at, pet:pet_id ( ref, name ), enrollment:enrollment_id ( series_id )" as const;

export interface TrainingNoteRow {
  id: string;
  category: string;
  body: string;
  is_private: boolean;
  is_active_alert: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  deactivated_by_name: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  author_name: string | null;
  class_name: string | null;
  enrollment_id: string | null;
  session_id: string | null;
  created_at: string;
  pet: { ref: number; name: string } | null;
  enrollment: { series_id: string } | null;
}

export function rowToTrainerNote(row: TrainingNoteRow): TrainerNote {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id ?? "",
    petId: row.pet?.ref ?? 0,
    petName: row.pet?.name ?? "",
    classId: row.enrollment?.series_id ?? "",
    className: row.class_name ?? "",
    ...(row.session_id ? { sessionId: row.session_id } : {}),
    trainerId: "",
    trainerName: row.author_name ?? "",
    // The day, as every training screen reads it (they append a time); the
    // instant rides along for ordering within a day.
    date: row.created_at.slice(0, 10),
    createdAt: row.created_at,
    note: row.body,
    category: trainerNoteCategoryEnum.catch("general").parse(row.category),
    isPrivate: row.is_private,
    isActiveAlert: row.is_active_alert,
    ...(row.deactivated_at ? { deactivatedAt: row.deactivated_at } : {}),
    ...(row.deactivation_reason
      ? { deactivationReason: row.deactivation_reason }
      : {}),
    ...(row.deactivated_by_name
      ? { deactivatedByName: row.deactivated_by_name }
      : {}),
    isPinnedToProfile: row.is_pinned,
    ...(row.pinned_at ? { pinnedAtISO: row.pinned_at } : {}),
  };
}

const UUID = z.string().uuid();

export const trainingNoteCreateSchema = z.object({
  petRef: z.number().int().positive(),
  category: trainerNoteCategoryEnum,
  note: z.string().trim().min(1).max(5000),
  isPrivate: z.boolean().optional(),
  isActiveAlert: z.boolean().optional(),
  isPinnedToProfile: z.boolean().optional(),
  // Only a real enrollment or session is linked; the fixture's string ids
  // ("series-enroll-…") are dropped rather than refused, so a note written
  // from a screen still holding one is kept, unlinked.
  enrollmentId: z.string().optional(),
  sessionId: z.string().optional(),
  className: z.string().max(200).optional(),
});
export type TrainingNoteCreate = z.infer<typeof trainingNoteCreateSchema>;

export const trainingNotePatchSchema = z
  .object({
    note: z.string().trim().min(1).max(5000).optional(),
    category: trainerNoteCategoryEnum.optional(),
    isPrivate: z.boolean().optional(),
    isActiveAlert: z.boolean().optional(),
    isPinnedToProfile: z.boolean().optional(),
    /** Lift the alert. The reason is required — it is the audit trail. */
    deactivate: z
      .object({ reason: z.string().trim().min(1).max(500) })
      .optional(),
  })
  .strict();
export type TrainingNotePatch = z.infer<typeof trainingNotePatchSchema>;

export const asUuid = (value: string | undefined): string | null =>
  value && UUID.safeParse(value).success ? value : null;
