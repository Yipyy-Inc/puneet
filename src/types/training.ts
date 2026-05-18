import { z } from "zod";
import { classTypeEnum } from "@/types/base";

// ============================================================================
// Training Enums
// ============================================================================

export const trainingClassStatusEnum = z.enum([
  "scheduled",
  "in-progress",
  "completed",
  "cancelled",
]);
export type TrainingClassStatus = z.infer<typeof trainingClassStatusEnum>;

export const enrollmentStatusEnum = z.enum([
  "enrolled",
  "completed",
  "dropped",
  "waitlisted",
]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusEnum>;

export const skillLevelEnum = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "all-levels",
]);
export type SkillLevel = z.infer<typeof skillLevelEnum>;

/** Human-readable label for a skill level — keeps display strings consistent
 *  wherever a SkillLevel surfaces (badges, dropdowns, table cells). */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  "all-levels": "All Levels",
};

export const trainerStatusEnum = z.enum(["active", "inactive", "on-leave"]);
export type TrainerStatus = z.infer<typeof trainerStatusEnum>;

export const trainerNoteCategoryEnum = z.enum([
  "behavior",
  "progress",
  "concern",
  "achievement",
  "general",
]);
export type TrainerNoteCategory = z.infer<typeof trainerNoteCategoryEnum>;

export const skillProgressStatusEnum = z.enum([
  "not-started",
  "in-progress",
  "mastered",
]);
export type SkillProgressStatus = z.infer<typeof skillProgressStatusEnum>;

// Re-export
export { classTypeEnum };
export type { ClassType } from "@/types/base";

// ============================================================================
// Trainer
// ============================================================================

export const trainerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    photoUrl: z.string().optional(),
    specializations: z.array(z.string()),
    certifications: z.array(z.string()),
    yearsExperience: z.number(),
    status: trainerStatusEnum,
    bio: z.string(),
    rating: z.number(),
    totalClasses: z.number(),
    hireDate: z.string(),
  })
  .catchall(z.unknown());

export type Trainer = z.infer<typeof trainerSchema>;

// ============================================================================
// Training Class
// ============================================================================

export const trainingClassSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    trainerId: z.string(),
    trainerName: z.string(),
    classType: classTypeEnum,
    skillLevel: skillLevelEnum,
    dayOfWeek: z.number(),
    startTime: z.string(),
    endTime: z.string(),
    duration: z.number(),
    capacity: z.number(),
    enrolledCount: z.number(),
    price: z.number(),
    status: z.enum(["active", "inactive"]),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    totalSessions: z.number(),
  })
  .catchall(z.unknown());

export type TrainingClass = z.infer<typeof trainingClassSchema>;

// ============================================================================
// Training Session
// ============================================================================

export const trainingSessionSchema = z
  .object({
    id: z.string(),
    classId: z.string(),
    className: z.string(),
    trainerId: z.string(),
    trainerName: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    status: trainingClassStatusEnum,
    attendees: z.array(z.string()),
    notes: z.string(),
  })
  .catchall(z.unknown());

export type TrainingSession = z.infer<typeof trainingSessionSchema>;

// ============================================================================
// Enrollment
// ============================================================================

export const enrollmentSchema = z
  .object({
    id: z.string(),
    classId: z.string(),
    className: z.string(),
    petId: z.number(),
    petName: z.string(),
    petBreed: z.string(),
    ownerId: z.number(),
    ownerName: z.string(),
    ownerPhone: z.string(),
    ownerEmail: z.string(),
    enrollmentDate: z.string(),
    status: enrollmentStatusEnum,
    sessionsAttended: z.number(),
    totalSessions: z.number(),
    packageId: z.string().optional(),
    notes: z.string(),
  })
  .catchall(z.unknown());

export type Enrollment = z.infer<typeof enrollmentSchema>;

// ============================================================================
// Trainer Notes
// ============================================================================

export const trainerNoteSchema = z
  .object({
    id: z.string(),
    enrollmentId: z.string(),
    petId: z.number(),
    petName: z.string(),
    classId: z.string(),
    className: z.string(),
    sessionId: z.string().optional(),
    trainerId: z.string(),
    trainerName: z.string(),
    date: z.string(),
    note: z.string(),
    category: trainerNoteCategoryEnum,
    isPrivate: z.boolean(),
  })
  .catchall(z.unknown());

export type TrainerNote = z.infer<typeof trainerNoteSchema>;

// ============================================================================
// Progress Tracking
// ============================================================================

export const skillProgressSchema = z.object({
  skillName: z.string(),
  level: z.number(),
  status: skillProgressStatusEnum,
  lastPracticed: z.string().optional(),
});

export type SkillProgress = z.infer<typeof skillProgressSchema>;

export const progressRecordSchema = z
  .object({
    id: z.string(),
    enrollmentId: z.string(),
    petId: z.number(),
    petName: z.string(),
    petBreed: z.string(),
    classId: z.string(),
    className: z.string(),
    trainerId: z.string(),
    trainerName: z.string(),
    skills: z.array(skillProgressSchema),
    overallProgress: z.number(),
    lastUpdated: z.string(),
    notes: z.string(),
  })
  .catchall(z.unknown());

export type ProgressRecord = z.infer<typeof progressRecordSchema>;

// ============================================================================
// Training Packages
// ============================================================================

export const trainingPackageSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    classType: classTypeEnum,
    skillLevel: skillLevelEnum,
    sessions: z.number(),
    price: z.number(),
    validityDays: z.number(),
    isActive: z.boolean(),
    popular: z.boolean().optional(),
    includes: z.array(z.string()),
    color: z.string().optional(),
    /** IDs of ServiceAddOns included free of charge with this package */
    includedAddOnIds: z.array(z.string()).optional(),
    /** Other programs that must be completed before a dog can enrol in this
     *  one. Enforced at enrollment time — staff get a warning when booking
     *  manually and the online flow blocks the purchase outright. */
    prerequisitePackageIds: z.array(z.string()).optional(),
    /** Discipline this program falls under (Obedience, Agility, etc.). The
     *  list of disciplines is configured per facility in Settings — this
     *  references one of those. */
    disciplineId: z.string().optional(),
    /** Optional per-program override on group size. The series capacity can
     *  still differ per series — this is the suggested default the package
     *  carries. Ignored for private programs. */
    maxGroupSize: z.number().optional(),
    /** Cover image URL surfaced on the online booking page. */
    imageUrl: z.string().optional(),
    /** Manual sort order — drives the Course Catalog grid order, which is
     *  also the order programs appear on the online booking page. Lower
     *  numbers render first. Programs without a sortOrder fall to the end. */
    sortOrder: z.number().optional(),
    /** Multi-location override — when omitted (the default), the program is
     *  available at every location in the facility. When set, it is
     *  restricted to the listed location IDs only. */
    locationIds: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

export type TrainingPackage = z.infer<typeof trainingPackageSchema>;

// ============================================================================
// Training Discipline
// ============================================================================

export const trainingDisciplineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** UI accent color for badges/pills. */
  color: z.string().optional(),
  isActive: z.boolean(),
});
export type TrainingDiscipline = z.infer<typeof trainingDisciplineSchema>;

// ============================================================================
// Training Add-On
// ============================================================================

export const trainingAddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  duration: z.number(),
  isActive: z.boolean(),
});
export type TrainingAddOn = z.infer<typeof trainingAddOnSchema>;
