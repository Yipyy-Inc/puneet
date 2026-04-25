import { z } from "zod";

// ── Conversation Status ──────────────────────────────────────────────

export const conversationStatusSchema = z.enum([
  "open",
  "pending_client",
  "pending_staff",
  "follow_up",
  "resolved",
  "archived",
]);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

// ── Thread Tags ──────────────────────────────────────────────────────

export const threadTagSchema = z.enum([
  "vip",
  "new_lead",
  "overdue_payment",
  "boarding_now",
  "high_priority",
  "needs_follow_up",
  "vaccine_expired",
  "complaint",
  "upsell_opportunity",
]);
export type ThreadTag = z.infer<typeof threadTagSchema>;

// ── Internal Note ────────────────────────────────────────────────────

export const internalNoteSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  body: z.string(),
  author: z.string(),
  createdAt: z.string(),
  pinned: z.boolean().default(false),
});
export type InternalNote = z.infer<typeof internalNoteSchema>;

// ── Message Template ─────────────────────────────────────────────────

export const templateCategorySchema = z.enum([
  "booking",
  "boarding",
  "grooming",
  "vaccination",
  "payment",
  "general",
]);
export type TemplateCategory = z.infer<typeof templateCategorySchema>;

export const messageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: templateCategorySchema,
  smsBody: z.string().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  variables: z.array(z.string()),
  charCount: z.number().optional(),
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

// ── Campaign ─────────────────────────────────────────────────────────

export const campaignChannelSchema = z.enum(["sms", "email"]);
export type CampaignChannel = z.infer<typeof campaignChannelSchema>;

export const campaignStatusSchema = z.enum([
  "draft",
  "scheduled",
  "sending",
  "sent",
  "cancelled",
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignAudienceFilterSchema = z.enum([
  "all_active",
  "inactive_6m",
  "boarding_clients",
  "grooming_clients",
  "vaccine_expired",
  "membership_holders",
  "custom",
]);
export type CampaignAudienceFilter = z.infer<typeof campaignAudienceFilterSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: campaignChannelSchema,
  status: campaignStatusSchema,
  audience: campaignAudienceFilterSchema,
  recipientCount: z.number(),
  message: z.string(),
  subject: z.string().optional(),
  scheduledAt: z.string().optional(),
  sentAt: z.string().optional(),
  smsCost: z.number().optional(),
  smsSegments: z.number().optional(),
  openRate: z.number().optional(),
  clickRate: z.number().optional(),
  deliveryRate: z.number().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

// ── Automation ────────────────────────────────────────────────────────

export const automationTriggerSchema = z.enum([
  "booking_confirmed",
  "boarding_check_in",
  "boarding_check_out",
  "vaccine_expiring_30d",
  "vaccine_expiring_7d",
  "missed_call",
  "abandoned_booking",
  "payment_overdue",
  "birthday",
  "post_visit_24h",
  "inactive_90d",
]);
export type AutomationTrigger = z.infer<typeof automationTriggerSchema>;

export const automationSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: automationTriggerSchema,
  channel: campaignChannelSchema,
  templateId: z.string().optional(),
  message: z.string(),
  delayMinutes: z.number().default(0),
  enabled: z.boolean(),
  sentCount: z.number().default(0),
  lastTriggered: z.string().optional(),
});
export type Automation = z.infer<typeof automationSchema>;

// ── Messaging Analytics ───────────────────────────────────────────────

export const messagingAnalyticsSchema = z.object({
  period: z.string(),
  totalSent: z.number(),
  smsSent: z.number(),
  emailSent: z.number(),
  chatMessages: z.number(),
  emailOpenRate: z.number(),
  avgResponseTimeMin: z.number(),
  avgResolutionTimeHours: z.number(),
  conversionRate: z.number(),
  revenueInfluenced: z.number(),
  missedChats: z.number(),
  hourlyVolume: z.array(z.object({ hour: z.number(), messages: z.number() })),
  channelBreakdown: z.array(z.object({ channel: z.string(), count: z.number(), pct: z.number() })),
  topThreadTags: z.array(z.object({ tag: z.string(), count: z.number() })),
  statusBreakdown: z.array(z.object({ status: z.string(), count: z.number() })),
  staffPerformance: z.array(z.object({
    name: z.string(),
    replied: z.number(),
    avgResponseMin: z.number(),
    resolved: z.number(),
    csat: z.number().optional(),
  })),
});
export type MessagingAnalytics = z.infer<typeof messagingAnalyticsSchema>;

// ── Thread metadata (enriches Message threads) ────────────────────────

export const threadMetaSchema = z.object({
  threadId: z.string(),
  status: conversationStatusSchema.default("open"),
  tags: z.array(threadTagSchema).default([]),
  starred: z.boolean().default(false),
  assignedTo: z.string().optional(),
  lastStatusChange: z.string().optional(),
});
export type ThreadMeta = z.infer<typeof threadMetaSchema>;
