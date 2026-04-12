import { z } from "zod";

// ============================================================================
// Messages (from communications-hub.ts)
// ============================================================================

export const messageSchema = z.object({
  id: z.string(),
  type: z.enum(["email", "sms", "in-app"]),
  direction: z.enum(["inbound", "outbound"]),
  from: z.string(),
  to: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string(),
  clientId: z.number().optional(),
  threadId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number(),
        url: z.string(),
      }),
    )
    .optional(),
  hasRead: z.boolean(),
});
export type Message = z.infer<typeof messageSchema>;

export const messageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["email", "sms"]),
  subject: z.string().optional(),
  body: z.string(),
  category: z.enum(["reminder", "confirmation", "update", "general"]),
  variables: z.array(z.string()),
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

// ============================================================================
// Automation Rules
// ============================================================================

export const automationTriggerEnum = z.enum([
  "booking_created",
  "24h_before",
  "check_in",
  "check_out",
  "payment_received",
  "vaccination_expiry",
  "appointment_reminder",
  "form_link_sent",
  "form_started",
  "form_submitted",
  "form_incomplete_by_deadline",
  "form_red_flag_answer",
  "booking_abandoned",
]);

export const automationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: automationTriggerEnum,
  enabled: z.boolean(),
  messageType: z.enum(["email", "sms", "both"]),
  templateId: z.string(),
  conditions: z
    .object({
      serviceTypes: z.array(z.string()).optional(),
      minAmount: z.number().optional(),
    })
    .optional(),
  schedule: z
    .object({
      hoursBefore: z.number().optional(),
      daysBeforeExpiry: z.number().optional(),
    })
    .optional(),
  stats: z.object({
    totalSent: z.number(),
    lastTriggered: z.string().optional(),
  }),
});
export type AutomationRule = z.infer<typeof automationRuleSchema>;

// ============================================================================
// Pet Updates
// ============================================================================

export const petUpdateSchema = z.object({
  id: z.string(),
  petId: z.number(),
  petName: z.string(),
  clientId: z.number(),
  updateType: z.enum([
    "eating",
    "potty",
    "playtime",
    "naptime",
    "medication",
    "grooming",
    "custom",
  ]),
  message: z.string(),
  photo: z.string().optional(),
  timestamp: z.string(),
  staffName: z.string(),
  notificationSent: z.boolean(),
});
export type PetUpdate = z.infer<typeof petUpdateSchema>;

// ============================================================================
// Call Logs & Routing
// ============================================================================

export const callLogSchema = z.object({
  id: z.string(),
  type: z.enum(["inbound", "outbound"]),
  from: z.string(),
  to: z.string(),
  clientId: z.number().optional(),
  clientName: z.string().optional(),
  duration: z.number(),
  status: z.enum(["completed", "missed", "voicemail", "failed"]),
  timestamp: z.string(),
  recordingUrl: z.string().optional(),
  transcription: z.string().optional(),
  aiHandled: z.boolean(),
  outcome: z
    .enum([
      "booking_created",
      "question_answered",
      "transferred_to_staff",
      "voicemail_left",
    ])
    .optional(),
  notes: z.string().optional(),
});
export type CallLog = z.infer<typeof callLogSchema>;

export const routingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  priority: z.number(),
  conditions: z.object({
    callerType: z.enum(["new", "existing", "vip"]).optional(),
    timeOfDay: z.object({ start: z.string(), end: z.string() }).optional(),
    dayOfWeek: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }),
  action: z.enum([
    "ai_handles",
    "transfer_to_staff",
    "voicemail",
    "specific_extension",
  ]),
  destination: z.string().optional(),
});
export type RoutingRule = z.infer<typeof routingRuleSchema>;

// ============================================================================
// Internal Messages
// ============================================================================

export const internalMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  message: z.string(),
  mentions: z.array(z.string()),
  timestamp: z.string(),
  channel: z.enum(["general", "shifts", "urgent"]),
  hasRead: z.array(z.string()),
});
export type InternalMessage = z.infer<typeof internalMessageSchema>;

// ============================================================================
// Communication Records (from communications.ts)
// ============================================================================

export const communicationRecordSchema = z.object({
  id: z.string(),
  clientId: z.number(),
  facilityId: z.number(),
  type: z.enum(["email", "sms", "call", "in-app", "note"]),
  subject: z.string(),
  content: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  timestamp: z.string(),
  staffName: z.string().optional(),
  staffId: z.number().optional(),
  attachments: z.array(z.string()).optional(),
  status: z.enum(["sent", "delivered", "read", "failed"]).optional(),
});
export type CommunicationRecord = z.infer<typeof communicationRecordSchema>;

export const callRecordSchema = z.object({
  id: z.string(),
  clientId: z.number(),
  facilityId: z.number(),
  direction: z.enum(["inbound", "outbound"]),
  duration: z.number(),
  timestamp: z.string(),
  staffName: z.string().optional(),
  staffId: z.number().optional(),
  recordingUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["completed", "missed", "voicemail"]),
});
export type CallRecord = z.infer<typeof callRecordSchema>;

// ============================================================================
// Quick Replies (from quick-replies.ts)
// ============================================================================

export const quickReplyCategoryEnum = z.enum([
  "general",
  "booking",
  "payment",
  "support",
]);
export type QuickReplyCategory = z.infer<typeof quickReplyCategoryEnum>;

export const quickReplyTemplateSchema = z.object({
  name: z.string(),
  body: z.string(),
  category: quickReplyCategoryEnum,
});
export type QuickReplyTemplate = z.infer<typeof quickReplyTemplateSchema>;
