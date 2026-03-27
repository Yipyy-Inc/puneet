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

export const followUpTaskSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  title: z.string(),
  description: z.string(),
  assignedTo: z.string(),
  dueDate: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
  completedDate: z.string().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
});
export type FollowUpTask = z.infer<typeof followUpTaskSchema>;

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
  managerNotified: z.boolean(),
  managersNotified: z.array(z.string()),
  clientNotified: z.boolean(),
  clientNotificationDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedBy: z.string().optional(),
});
export type Incident = z.infer<typeof incidentSchema>;
