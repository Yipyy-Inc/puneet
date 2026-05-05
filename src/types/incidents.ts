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
  "reporter",      // staff member who filed the report
  "manager",       // facility manager / on-duty supervisor
  "owner_contact", // primary contact for facility (owner/admin)
  "shift_lead",    // person on shift the day the task is due
  "specific",      // a specific named staff member
  "any_staff",     // any available staff member
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
});
export type FollowUpTask = z.infer<typeof followUpTaskSchema>;

// ========================================
// INCIDENT
// ========================================

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
  createdAt: z.string(),
  updatedAt: z.string(),
  closedBy: z.string().optional(),
  boardingGuestId: z.string().optional(),
  reservationId: z.string().optional(),
});
export type Incident = z.infer<typeof incidentSchema>;
