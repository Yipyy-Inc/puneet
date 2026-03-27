/**
 * Support Tickets domain types.
 * Single source of truth — data files re-export from here.
 */

import { z } from "zod";

// ========================================
// SUPPORT TICKET TYPES
// ========================================

export const ticketTimelineEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "created",
    "status_change",
    "assignment",
    "priority_change",
    "message",
    "sla_update",
    "escalation",
    "note",
  ]),
  timestamp: z.string(),
  actor: z.string(),
  details: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    message: z.string().optional(),
    note: z.string().optional(),
  }),
});
export type TicketTimelineEvent = z.infer<typeof ticketTimelineEventSchema>;

export const slaConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  firstResponseTime: z.number(),
  resolutionTime: z.number(),
  escalationTime: z.number(),
  description: z.string(),
});
export type SLAConfig = z.infer<typeof slaConfigSchema>;

export const ticketSLASchema = z.object({
  configId: z.string(),
  firstResponseDue: z.string(),
  resolutionDue: z.string(),
  escalationDue: z.string(),
  firstResponseMet: z.boolean().optional(),
  resolutionMet: z.boolean().optional(),
  isEscalated: z.boolean(),
  breachCount: z.number(),
});
export type TicketSLA = z.infer<typeof ticketSLASchema>;

export const supportAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().optional(),
  role: z.enum(["Agent", "Senior Agent", "Team Lead", "Manager"]),
  department: z.string(),
  status: z.enum(["Available", "Busy", "Away", "Offline"]),
  activeTickets: z.number(),
  specializations: z.array(z.string()),
});
export type SupportAgent = z.infer<typeof supportAgentSchema>;

// SupportTicket is complex with nested optional objects — keep as interface
export interface SupportTicket extends Record<string, unknown> {
  id: string;
  title: string;
  description: string;
  status:
    | "Open"
    | "In Progress"
    | "Resolved"
    | "Closed"
    | "Escalated"
    | "Pending";
  priority: "Low" | "Medium" | "High" | "Urgent";
  requester: string;
  requesterEmail?: string;
  facility: string;
  facilityId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedAgentId?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  sla?: TicketSLA;
  timeline?: TicketTimelineEvent[];
  messages?: {
    id: string;
    sender: string;
    message: string;
    timestamp: string;
    isInternal?: boolean;
  }[];
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolutionNote: string;
    satisfactionRating?: number;
  };
  escalation?: {
    escalatedAt: string;
    escalatedTo: string;
    reason: string;
    previousAssignee?: string;
  };
}
