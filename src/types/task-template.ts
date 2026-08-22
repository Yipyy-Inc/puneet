import { z } from "zod";

// ============================================================================
// A persisted task template.
//
// The shape mirrors `TaskTemplate` in `types/task.ts`, which the screens and
// `lib/today-tasks.ts` already speak — nested `timing` and `recurring` rather
// than the flat columns the table stores. The mapper is where they meet.
//
// Kept nested on purpose: flattening it here would mean touching every call
// site in a 1,527-line component to rename `t.timing.type` to `t.timingType`,
// which is a lot of edits to change nothing a user can see.
// ============================================================================

export const taskCategoryEnum = z.enum([
  "setup",
  "execution",
  "cleanup",
  "transport",
  "care",
  "custom",
]);

export const taskTimingTypeEnum = z.enum([
  "before_start",
  "at_start",
  "during",
  "at_end",
  "after_end",
  "custom_time",
]);

export const taskAssignToEnum = z.enum([
  "booking_staff",
  "any_available",
  "specific_role",
]);

export const taskRecurringFrequencyEnum = z.enum([
  "daily",
  "per_meal",
  "per_medication",
]);

export const taskTemplateSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  /** 'boarding' | 'daycare' | 'grooming' | 'training' | a custom service slug. */
  moduleId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: taskCategoryEnum,
  timing: z.object({
    type: taskTimingTypeEnum,
    offsetMinutes: z.number().optional(),
    customTime: z.string().optional(),
  }),
  durationMinutes: z.number().optional(),
  assignTo: taskAssignToEnum.optional(),
  requiredRole: z.string().optional(),
  isRequired: z.boolean(),
  autoCreate: z.boolean(),
  recurring: z
    .object({
      frequency: taskRecurringFrequencyEnum,
      times: z.array(z.string()).optional(),
    })
    .optional(),
  sortOrder: z.number(),
});
export type PersistedTaskTemplate = z.infer<typeof taskTemplateSchema>;

/** What the screen sends to create one. The facility comes from the session. */
export const newTaskTemplateSchema = taskTemplateSchema
  .omit({ id: true, facilityId: true, sortOrder: true })
  .extend({ sortOrder: z.number().optional() });
export type NewTaskTemplate = z.infer<typeof newTaskTemplateSchema>;

/** What an edit sends. Every field optional; `moduleId` is not among them —
 *  moving a template between services is a different template. */
export const taskTemplatePatchSchema = newTaskTemplateSchema
  .omit({ moduleId: true })
  .partial();
export type TaskTemplatePatch = z.infer<typeof taskTemplatePatchSchema>;
