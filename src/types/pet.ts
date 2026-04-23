import { z } from "zod";

// ============================================================================
// Evaluation
// ============================================================================

export const evaluationStatusEnum = z.enum([
  "pending",
  "passed",
  "failed",
  "outdated",
]);

export const evaluationValidityTypeEnum = z.enum([
  "ALWAYS_VALID",
  "EXPIRES_AFTER_INACTIVITY",
]);

export const evaluationResultTypeEnum = z.enum([
  "approved",
  "approved_with_restrictions",
  "needs_re_evaluation",
  "not_approved",
]);

export const approvedServicesSchema = z.object({
  daycare: z.boolean().optional(),
  boarding: z.boolean().optional(),
  customApproved: z.array(z.string()).optional(),
  customDenied: z.array(z.string()).optional(),
});

export const evaluationSchema = z.object({
  id: z.string(),
  petId: z.number(),
  status: evaluationStatusEnum,
  evaluatedAt: z.string().optional(),
  evaluatedBy: z.string().optional(),
  evaluatedById: z.string().optional(),
  resultType: evaluationResultTypeEnum.optional(),
  resultLabel: z.string().optional(),
  denialReason: z.string().optional(),
  denialReasonLabel: z.string().optional(),
  denialNotes: z.string().optional(),
  notes: z.string().optional(),
  validityType: evaluationValidityTypeEnum.optional(),
  lastActivityAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isExpired: z.boolean().optional(),
  approvedServices: approvedServicesSchema.optional(),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

// ============================================================================
// Pet
// ============================================================================

export const petSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  breed: z.string(),
  age: z.number(),
  dateOfBirth: z.string().optional(), // ISO date: "2023-03-15"
  weight: z.number(),
  color: z.string(),
  microchip: z.string(),
  allergies: z.string(),
  specialNeeds: z.string(),
  imageUrl: z.string().optional(),
  evaluations: z.array(evaluationSchema).optional(),
  sex: z.enum(["male", "female"]).optional(),
  spayedNeutered: z.boolean().optional(),
  coatType: z
    .enum(["short", "medium", "long", "wire", "curly", "hairless"])
    .optional(),
  energyLevel: z.enum(["low", "medium", "high"]).optional(),
  petStatus: z.enum(["active", "inactive", "deceased"]).optional(),
});

export type Pet = z.infer<typeof petSchema>;

// ============================================================================
// Pet Photos
// ============================================================================

export const petPhotoSchema = z.object({
  id: z.string(),
  petId: z.number(),
  url: z.string(),
  thumbnail: z.string(),
  caption: z.string().optional(),
  uploadedBy: z.string(),
  uploadedById: z.number(),
  uploadedAt: z.string(),
  isPrimary: z.boolean(),
});

export type PetPhoto = z.infer<typeof petPhotoSchema>;

// ============================================================================
// Vaccination Records
// ============================================================================

export const vaccinationStatusEnum = z.enum([
  "pending_review",
  "approved",
  "rejected",
]);

export const vaccinationRecordSchema = z.object({
  id: z.string(),
  petId: z.number(),
  vaccineName: z.string(),
  administeredDate: z.string(),
  expiryDate: z.string(),
  veterinarianName: z.string().optional(),
  veterinaryClinic: z.string().optional(),
  documentUrl: z.string().optional(),
  nextDueDate: z.string().optional(),
  reminderSent: z.boolean().optional(),
  notes: z.string().optional(),
  status: vaccinationStatusEnum.optional(),
  reviewedBy: z.string().optional(),
  reviewedById: z.number().optional(),
  reviewedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type VaccinationRecord = z.infer<typeof vaccinationRecordSchema>;

// ============================================================================
// Care Instructions
// ============================================================================

export const careInstructionsSchema = z.object({
  petId: z.number(),
  feedingSchedule: z.string().optional(),
  feedingAmount: z.string().optional(),
  medicationList: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  groomingSensitivities: z.string().optional(),
  behaviorNotes: z.string().optional(),
  lastUpdated: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
  lastUpdatedById: z.number().optional(),
});

export type CareInstructions = z.infer<typeof careInstructionsSchema>;

// ============================================================================
// Report Cards
// ============================================================================

export const reportCardServiceTypeEnum = z.enum([
  "daycare",
  "boarding",
  "grooming",
  "training",
]);

export const mealConsumedEnum = z.enum(["all", "most", "some", "none"]);

export const pottyTypeEnum = z.enum(["success", "accident"]);

export const petMoodEnum = z.enum([
  "happy",
  "calm",
  "energetic",
  "anxious",
  "tired",
]);

export const reportCardThemeEnum = z.enum([
  "everyday",
  "halloween",
  "christmas",
  "valentines",
  "easter",
  "summer",
  "winter",
]);

export const reportCardSchema = z.object({
  id: z.string(),
  petId: z.number(),
  bookingId: z.number(),
  date: z.string(),
  serviceType: reportCardServiceTypeEnum,
  activities: z.array(z.string()),
  meals: z.array(
    z.object({
      time: z.string(),
      food: z.string(),
      amount: z.string(),
      consumed: mealConsumedEnum,
    }),
  ),
  pottyBreaks: z.array(
    z.object({
      time: z.string(),
      type: pottyTypeEnum,
      notes: z.string().optional(),
    }),
  ),
  mood: petMoodEnum,
  photos: z.array(z.string()),
  staffNotes: z.string(),
  createdBy: z.string(),
  createdById: z.number(),
  sentToOwner: z.boolean(),
  sentAt: z.string().optional(),
  theme: reportCardThemeEnum.optional(),
  replyMessage: z.string().optional(),
  repliedAt: z.string().optional(),
  overallFeedback: z.string().optional(),
  customAnswers: z.record(z.string(), z.string()).optional(),
  petConditions: z.record(z.string(), z.string()).optional(),
});

export type ReportCard = z.infer<typeof reportCardSchema>;

// ============================================================================
// Pet Relationships
// ============================================================================

export const relationshipTypeEnum = z.enum([
  "friend",
  "best_friend",
  "keep_apart",
]);

export const petRelationshipSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  petId: z.number(),
  relatedPetId: z.number(),
  relatedPetName: z.string(),
  relatedPetType: z.string(),
  relatedPetBreed: z.string(),
  relationshipType: relationshipTypeEnum,
  allowAlerts: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
  createdById: z.number(),
});

export type PetRelationship = z.infer<typeof petRelationshipSchema>;

// ============================================================================
// Pet Tags
// ============================================================================

export const petTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().optional(),
});

export type PetTag = z.infer<typeof petTagSchema>;

export const petTagAssignmentSchema = z.object({
  id: z.string(),
  petId: z.number(),
  tagId: z.string(),
  assignedAt: z.string(),
  assignedBy: z.string(),
  assignedById: z.number(),
});

export type PetTagAssignment = z.infer<typeof petTagAssignmentSchema>;

// ============================================================================
// Ban Records
// ============================================================================

export const banEntityTypeEnum = z.enum(["client", "pet"]);

export const banRecordSchema = z.object({
  id: z.string(),
  entityType: banEntityTypeEnum,
  entityId: z.number(),
  isBanned: z.boolean(),
  reason: z.string(),
  notes: z.string().optional(),
  bannedAt: z.string(),
  bannedBy: z.string(),
  bannedById: z.number(),
  unbannedAt: z.string().optional(),
  unbannedBy: z.string().optional(),
  unbannedById: z.number().optional(),
});

export type BanRecord = z.infer<typeof banRecordSchema>;

// ============================================================================
// Form Schemas (for TanStack Form)
// ============================================================================

export const createPetSchema = z.object({
  name: z.string().min(1, "Pet name is required"),
  type: z.string().min(1, "Pet type is required"),
  breed: z.string().min(1, "Breed is required"),
  age: z.number().min(0),
  weight: z.number().min(0),
  color: z.string(),
  microchip: z.string(),
  allergies: z.string(),
  specialNeeds: z.string(),
  imageUrl: z.string().optional(),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;

export const editPetSchema = createPetSchema.extend({
  id: z.number(),
});

export type EditPetInput = z.infer<typeof editPetSchema>;

export const addVaccinationSchema = z.object({
  petId: z.number(),
  vaccineName: z.string().min(1, "Vaccine name is required"),
  administeredDate: z.string().min(1, "Date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  veterinarianName: z.string().optional(),
  veterinaryClinic: z.string().optional(),
  notes: z.string().optional(),
});

export type AddVaccinationInput = z.infer<typeof addVaccinationSchema>;
