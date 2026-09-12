import { z } from "zod";

import { trainingDisciplineSchema } from "@/types/training";
import { defaultTrainingDisciplines } from "@/data/training-disciplines";
import {
  trainingExercises,
  type TrainingExerciseDef,
} from "@/data/training-exercises";
import {
  defaultHomeworkTemplates,
  type HomeworkTemplate,
} from "@/data/training-homework-templates";
import type { TrainingPathway } from "@/data/training-pathways";
import {
  defaultTrainingCourseTypes,
  type TrainingCourseType,
} from "@/lib/training-config";
import type { TrainingDiscipline } from "@/types/training";
import {
  defaultTrainingModuleSettings,
  type TrainingModuleSettings,
} from "@/lib/training-module-settings";

// ============================================================================
// Training's catalogue, as the facility's own settings (2026-09-12).
//
// Disciplines, the exercise library, homework templates, pathways and course
// types were each read from a src/data fixture and "saved" with
// queryClient.setQueryData — Add / Edit / Delete toasted and lasted until the
// tab was reloaded (the success-claims gate found the disciplines manager
// first). They are five settings domains now, one list each, so two people
// editing different lists cannot overwrite each other's work.
//
// ── THE FALLBACKS ──────────────────────────────────────────────────────────
//
// A facility that has never saved one gets the shipped library: the
// disciplines, exercises, homework templates and course types every training
// facility starts from, reported `configured: false` by the API. PATHWAYS
// fall back to NONE: every shipped pathway names programs from the fixture
// (`trainingPackages`), and a pathway of programs the facility does not sell
// is not a starting point, it is a broken one.
//
// Schemas are `.passthrough()` so a field a newer screen adds is kept rather
// than stripped by an older server.
// ============================================================================

const difficultyLevel = z.enum([
  "foundation",
  "intermediate",
  "advanced",
  "competition",
]);

const exerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    disciplineId: z.string(),
    description: z.string().optional(),
    difficultyLevel,
    order: z.number(),
    isHidden: z.boolean().optional(),
    isCustom: z.boolean().optional(),
  })
  .passthrough();

const homeworkTemplateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    courseTypeName: z.string(),
    sessionNumber: z.number().optional(),
    description: z.string().optional(),
    items: z.array(
      z
        .object({
          id: z.string(),
          exerciseId: z.string(),
          exerciseName: z.string(),
          instructions: z.array(z.string()),
          frequency: z.string(),
          resources: z.array(z.string()).optional(),
          dueDayOffset: z.number().optional(),
        })
        .passthrough(),
    ),
    sortOrder: z.number().optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

const pathwaySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    steps: z.array(
      z
        .object({
          programId: z.string(),
          required: z.boolean(),
          description: z.string().optional(),
        })
        .passthrough(),
    ),
    isActive: z.boolean(),
  })
  .passthrough();

const courseTypeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    disciplineId: z.string().optional(),
    classFormat: z
      .enum(["group", "private", "semi-private", "drop-in"])
      .optional(),
    curriculumStyle: z.enum(["structured", "adaptive"]).optional(),
    defaultWeeks: z.number(),
    ageRange: z
      .object({ minWeeks: z.number(), maxWeeks: z.number().optional() })
      .passthrough(),
    requiredVaccines: z.array(z.string()),
    prerequisites: z.array(z.string()),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const trainingDisciplinesSchema = z
  .object({ disciplines: z.array(trainingDisciplineSchema) })
  .passthrough();
export const trainingExercisesSchema = z
  .object({ exercises: z.array(exerciseSchema) })
  .passthrough();
export const trainingHomeworkTemplatesSchema = z
  .object({ templates: z.array(homeworkTemplateSchema) })
  .passthrough();
export const trainingPathwaysSchema = z
  .object({ pathways: z.array(pathwaySchema) })
  .passthrough();
export const trainingCourseTypesSchema = z
  .object({ courseTypes: z.array(courseTypeSchema) })
  .passthrough();

export const SHIPPED_TRAINING_DISCIPLINES: {
  disciplines: TrainingDiscipline[];
} = { disciplines: defaultTrainingDisciplines };
export const SHIPPED_TRAINING_EXERCISES: { exercises: TrainingExerciseDef[] } =
  {
    exercises: trainingExercises,
  };
export const SHIPPED_HOMEWORK_TEMPLATES: { templates: HomeworkTemplate[] } = {
  templates: defaultHomeworkTemplates,
};
export const NO_TRAINING_PATHWAYS: { pathways: TrainingPathway[] } = {
  pathways: [],
};
export const SHIPPED_COURSE_TYPES: { courseTypes: TrainingCourseType[] } = {
  courseTypes: defaultTrainingCourseTypes,
};

/** Which key of each domain's value holds its list. */
export const TRAINING_CATALOG_LIST_KEY = {
  training_disciplines: "disciplines",
  training_exercises: "exercises",
  training_homework_templates: "templates",
  training_pathways: "pathways",
  training_course_types: "courseTypes",
} as const;
export type TrainingCatalogDomain = keyof typeof TRAINING_CATALOG_LIST_KEY;

// ── The module's own settings ───────────────────────────────────────────────
//
// Settings → Training (locations, defaults, drop-ins, report-card delivery,
// notifications) was `useState` seeded from a factory that returned the
// shipped defaults, and Save wrote them into the query cache with a toast.
// The core fields are checked; the rest passes through, and a saved value is
// read back over the shipped defaults so a field added later has one.
export const trainingModuleSettingsSchema = z
  .object({
    enabled: z.boolean(),
    visibleToCustomers: z.boolean(),
    locations: z.array(
      z
        .object({
          id: z.string().min(1),
          name: z.string(),
          type: z.enum(["indoor", "outdoor"]),
          capacity: z.number().optional(),
          isActive: z.boolean(),
        })
        .passthrough(),
    ),
    defaultSessionDurationMinutes: z.number().positive(),
    defaultClassSize: z.number().int().positive(),
    notifications: z.object({}).passthrough(),
  })
  .passthrough();

export const SHIPPED_TRAINING_MODULE_SETTINGS: TrainingModuleSettings =
  defaultTrainingModuleSettings;
