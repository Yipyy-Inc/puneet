/**
 * Incidents domain types.
 * Single source of truth — data files re-export from here.
 */

import { z } from "zod";

// ========================================
// INCIDENT TYPES
// ========================================

export const incidentTypeEnum = z.enum([
  "injury",
  "illness",
  "behavioral",
  "accident",
  "escape",
  "fight",
  "other",
]);
export type IncidentType = z.infer<typeof incidentTypeEnum>;

export const incidentSeverityEnum = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export type IncidentSeverity = z.infer<typeof incidentSeverityEnum>;

export const incidentStatusEnum = z.enum([
  "open",
  "investigating",
  "resolved",
  "closed",
]);
export type IncidentStatus = z.infer<typeof incidentStatusEnum>;

// ========================================
// FOLLOW-UP PROTOCOL TYPES
// ========================================

export const contactMethodEnum = z.enum([
  "phone",
  "email",
  "sms",
  "in_person",
  "video_call",
  "other",
]);
export type ContactMethod = z.infer<typeof contactMethodEnum>;

export const assigneeRoleEnum = z.enum([
  "reporter", // staff member who filed the report
  "manager", // facility manager / on-duty supervisor
  "owner_contact", // primary contact for facility (owner/admin)
  "shift_lead", // person on shift the day the task is due
  "specific", // a specific named staff member
  "any_staff", // any available staff member
]);
export type AssigneeRole = z.infer<typeof assigneeRoleEnum>;

export const customerSentimentEnum = z.enum([
  "positive",
  "neutral",
  "concerned",
  "upset",
  "unreachable",
]);
export type CustomerSentiment = z.infer<typeof customerSentimentEnum>;

// A protocol step is either an owner-contact follow-up (the classic call/email)
// or an in-stay care action to run while the pet is boarding (2B).
export const followUpStepTypeEnum = z.enum(["owner_contact", "in_stay_care"]);
export type FollowUpStepType = z.infer<typeof followUpStepTypeEnum>;

// Care-action shapes (0.2) — declared here so both in-stay-care protocol steps
// (below) and the incident care model reuse them.
// How often a care action recurs while the pet is boarding.
export const careActionFrequencyEnum = z.enum([
  "once",
  "every_x_hours",
  "twice_daily",
  "once_daily",
  "custom",
]);
export type CareActionFrequency = z.infer<typeof careActionFrequencyEnum>;

// How long the care action stays active.
export const careActionDurationEnum = z.enum([
  "until_checkout",
  "x_days",
  "until_stopped",
]);
export type CareActionDuration = z.infer<typeof careActionDurationEnum>;

// When the first occurrence is scheduled.
export const careActionStartEnum = z.enum([
  "immediately",
  "next_care_time",
  "next_morning_8am",
]);
export type CareActionStart = z.infer<typeof careActionStartEnum>;

export const followUpProtocolStepSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  description: z.string(),
  instructions: z.string(),
  // Schedule offset relative to incident time
  daysAfterIncident: z.number(),
  hoursAfterIncident: z.number(),
  contactMethod: contactMethodEnum,
  assigneeRole: assigneeRoleEnum,
  assigneeName: z.string().optional(), // when assigneeRole === "specific"
  questionsToAsk: z.array(z.string()),
  requiresPhoto: z.boolean(),
  requiresClientResponse: z.boolean(),
  // If client cannot be reached after N attempts, escalate
  escalateAfterAttempts: z.number().optional(),

  // ── Step type (2B) ──────────────────────────────────────────────────
  stepType: followUpStepTypeEnum.default("owner_contact"),
  // Care-action fields — used when stepType === "in_stay_care" (shapes 0.2).
  careActionName: z.string().optional(),
  frequency: careActionFrequencyEnum.optional(),
  duration: careActionDurationEnum.optional(),
  starts: careActionStartEnum.optional(),
  staffInstructions: z.string().optional(),
});
export type FollowUpProtocolStep = z.infer<typeof followUpProtocolStepSchema>;

export const followUpProtocolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // Which incidents this protocol applies to (used as auto-suggest)
  severityScopes: z.array(incidentSeverityEnum),
  typeScopes: z.array(incidentTypeEnum),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  steps: z.array(followUpProtocolStepSchema),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FollowUpProtocol = z.infer<typeof followUpProtocolSchema>;

// ========================================
// FOLLOW-UP TASK & CONVERSATION TYPES
// ========================================

export const followUpConversationEntrySchema = z.object({
  id: z.string(),
  loggedAt: z.string(),
  loggedBy: z.string(),
  contactMethod: contactMethodEnum,
  reachedClient: z.boolean(),
  // Free-form summary by staff
  summary: z.string(),
  // What the customer said (verbatim or paraphrased)
  customerStatement: z.string(),
  // What staff communicated back
  staffResponse: z.string(),
  // Customer sentiment after the call
  sentiment: customerSentimentEnum,
  // Topics or tags for quick scan in next follow-up
  topics: z.array(z.string()),
  // Follow-up directives the customer requested
  customerRequests: z.string().optional(),
  // What we said we would do next
  nextSteps: z.string().optional(),
  durationMinutes: z.number().optional(),
});
export type FollowUpConversationEntry = z.infer<
  typeof followUpConversationEntrySchema
>;

export const followUpTaskSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  title: z.string(),
  description: z.string(),
  assignedTo: z.string(),
  dueDate: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  completedDate: z.string().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),

  // ── Protocol linkage (optional for ad-hoc tasks) ──────────────────
  protocolId: z.string().optional(),
  protocolStepId: z.string().optional(),
  protocolName: z.string().optional(),
  stepOrder: z.number().optional(),

  // ── Procedure ─────────────────────────────────────────────────────
  contactMethod: contactMethodEnum.optional(),
  instructions: z.string().optional(),
  questionsToAsk: z.array(z.string()).optional(),
  requiresPhoto: z.boolean().optional(),
  requiresClientResponse: z.boolean().optional(),

  // ── Conversation log ──────────────────────────────────────────────
  conversationLog: z.array(followUpConversationEntrySchema).optional(),
  attemptCount: z.number().optional(),
  escalated: z.boolean().optional(),
  escalateAfterAttempts: z.number().optional(),

  // ── Surfacing in daily task list ──────────────────────────────────
  // The day this should appear on the assignee's daily task list
  scheduledFor: z.string().optional(),
  surfacedToDailyTasks: z.boolean().optional(),

  // ── Archival ──────────────────────────────────────────────────────
  // "Dismiss as historical": archive a long-overdue task without marking it
  // complete (status stays as-is). Removes it from the active/overdue lists but
  // keeps it on record. Reason is required at dismissal.
  archived: z.boolean().optional(),
  archiveReason: z.string().optional(),
  archivedAt: z.string().optional(),
});
export type FollowUpTask = z.infer<typeof followUpTaskSchema>;

// ========================================
// IN-STAY CARE (2B)
// ========================================

// Care-action frequency/duration/start enums are declared above (shared with
// in-stay-care protocol steps).

export const incidentCareActionSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  name: z.string(),
  frequency: careActionFrequencyEnum,
  everyXHours: z.number().optional(), // when frequency === "every_x_hours"
  customSchedule: z.string().optional(), // when frequency === "custom"
  duration: careActionDurationEnum,
  days: z.number().optional(), // when duration === "x_days"
  starts: careActionStartEnum,
  staffInstructions: z.string(),
  requiresPhoto: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  active: z.boolean(),
});
export type IncidentCareAction = z.infer<typeof incidentCareActionSchema>;

// Mirrors src/components/bookings/MedicationSection.tsx so an incident-scoped
// medication can render identically in the in-stay care UI.
export const incidentMedTypeEnum = z.enum([
  "oral",
  "topical",
  "injection",
  "other",
]);
export type IncidentMedType = z.infer<typeof incidentMedTypeEnum>;

export const incidentMedFeeTypeEnum = z.enum(["per_admin", "one_time"]);
export type IncidentMedFeeType = z.infer<typeof incidentMedFeeTypeEnum>;

export const incidentMedicationSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  name: z.string(),
  medType: incidentMedTypeEnum,
  dosage: z.string(),
  frequency: z.string(),
  instructions: z.string(),
  critical: z.boolean(),
  chargeFee: z.boolean(),
  feeType: incidentMedFeeTypeEnum.optional(),
  feeAmount: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type IncidentMedication = z.infer<typeof incidentMedicationSchema>;

// One log entry per care/medication administration (photo optional).
export const incidentCareLogSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  careActionId: z.string().optional(),
  medicationId: z.string().optional(),
  loggedBy: z.string(),
  loggedAt: z.string(),
  note: z.string().optional(),
  photoUrl: z.string().optional(),
});
export type IncidentCareLog = z.infer<typeof incidentCareLogSchema>;

// ========================================
// INCIDENT
// ========================================

// Per-owner notification state (2E). Incidents can involve pets from multiple
// owner accounts; each owner is notified independently.
export const clientNotificationSchema = z.object({
  clientId: z.number(),
  notified: z.boolean(),
  notifiedAt: z.string().optional(),
});
export type ClientNotification = z.infer<typeof clientNotificationSchema>;

export const incidentSchema = z.object({
  id: z.string(),
  type: incidentTypeEnum,
  severity: incidentSeverityEnum,
  status: incidentStatusEnum,
  title: z.string(),
  description: z.string(),
  internalNotes: z.string(),
  clientFacingNotes: z.string(),
  petIds: z.array(z.number()),
  petNames: z.array(z.string()),
  staffInvolved: z.array(z.string()),
  reportedBy: z.string(),
  incidentDate: z.string(),
  reportedDate: z.string(),
  resolvedDate: z.string().optional(),
  closedDate: z.string().optional(),
  photos: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      caption: z.string(),
      isClientVisible: z.boolean(),
    }),
  ),
  followUpTasks: z.array(followUpTaskSchema),
  followUpProtocolId: z.string().optional(),
  managerNotified: z.boolean(),
  managersNotified: z.array(z.string()),
  clientNotified: z.boolean(),
  clientNotificationDate: z.string().optional(),
  // Per-owner notification (2E) — one entry per distinct owner account across
  // the incident's pets. When absent, `clientNotified` applies to every owner.
  clientNotifications: z.array(clientNotificationSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedBy: z.string().optional(),
  // Reason recorded when closing the incident (required if open follow-up tasks
  // remain — Flow C). Those tasks are left in the system, not auto-completed.
  closeReason: z.string().optional(),
  boardingGuestId: z.string().optional(),
  // Booking linkage (spec 2A). `reservationId` is the human-readable reservation
  // code (e.g. "RES-001"); `bookingId` is the numeric booking id used as the
  // booking-overview route param (/clients/[clientId]/bookings/[bookingId]).
  reservationId: z.string().optional(),
  bookingId: z.number().optional(),
  // Owner account, so customer grouping (2E) doesn't need a pet→client lookup.
  clientId: z.number().optional(),

  // ── In-stay care (2B) ─────────────────────────────────────────────
  careActions: z.array(incidentCareActionSchema).default([]),
  incidentMedications: z.array(incidentMedicationSchema).default([]),
  careLogs: z.array(incidentCareLogSchema).default([]),
  // Set true at checkout so care can no longer be modified (Flow C).
  inStayCareLocked: z.boolean().optional(),
});
export type Incident = z.infer<typeof incidentSchema>;
