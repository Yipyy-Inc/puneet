import { z } from "zod";

import { automationTriggerEnum } from "@/types/communications";

// ============================================================================
// The REAL automation rule — the one backed by `public.automation_rules`.
//
// ── WHY THIS IS NOT `AutomationRule` IN @/types/communications ────────────
//
// That one is the FIXTURE shape, and it is a different shape, not just an
// older one:
//
//   fixture              real
//   ───────────────────  ──────────────────────────────────────────────────
//   templateId: string   emailTemplateId + smsTemplateId, one per channel
//   messageType: 'both'  implied by which of the two is set
//   stats: {totalSent}   derived from message_sends, never stored
//
// The single `templateId` paired with `messageType: 'both'` is what produced
// the off-by-one that shipped: one id standing in for two media, so the
// "Payment Receipt" rule rendered the Check-Out SMS body while its name still
// read correctly. Splitting the column makes that unrepresentable, so the two
// shapes cannot be unified without reintroducing the bug.
//
// The fixture type stays until the last screen reading `communications-hub` is
// converted. Import THIS one for anything touching the database.
// ============================================================================

export const automationChannelEnum = z.enum(["email", "sms"]);
export type AutomationChannel = z.infer<typeof automationChannelEnum>;

export const templateCategoryEnum = z.enum([
  "reminder",
  "confirmation",
  "update",
  "general",
]);

export const messageTemplateSchema = z.object({
  id: z.string(),
  /** Stable handle for a template Yipyy ships; null for a facility's own. */
  key: z.string().nullable(),
  name: z.string(),
  channel: automationChannelEnum,
  category: templateCategoryEnum,
  subject: z.string().nullable(),
  body: z.string(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  /**
   * Computed from the body at read time by `templateVariableKeys()`, never
   * stored. A persisted copy is one more thing that can disagree with what the
   * body actually says — which is precisely how the fixture ended up with seven
   * rules naming templates that no longer existed.
   */
  variables: z.array(z.string()),
});
export type RealMessageTemplate = z.infer<typeof messageTemplateSchema>;

export const automationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: automationTriggerEnum,
  enabled: z.boolean(),
  emailTemplateId: z.string().nullable(),
  smsTemplateId: z.string().nullable(),
  serviceTypes: z.array(z.string()),
  /** Empty means every location, never "no locations". */
  locationIds: z.array(z.string()),
  minAmount: z.number().nullable(),
  /** Signed minutes from the trigger. -1440 is "24 hours before". */
  offsetMinutes: z.number().nullable(),
  cooldownDays: z.number(),
  /** CASL: exempt from a `scope: 'marketing'` suppression. */
  isTransactional: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // ── Derived, read-only ──────────────────────────────────────────────────
  /** Sends attributed to this rule. From `message_sends`, not a column. */
  totalSent: z.number(),
  lastTriggeredAt: z.string().nullable(),
  /**
   * False when nothing in the system can currently produce this rule's trigger.
   *
   * The rule is still listed and still editable — hiding it is what created the
   * eight-of-seventeen problem in the first place — but the enable toggle is
   * disabled and the row says "Not yet delivering". Same reasoning as
   * `usedByGroups` on the chore list: say so before anyone clicks, rather than
   * letting a rule look armed when nothing will ever fire it.
   */
  deliverable: z.boolean(),
});
export type RealAutomationRule = z.infer<typeof automationRuleSchema>;

/**
 * The triggers something actually emits today.
 *
 * Every other value in `automationTriggerEnum` is a rule a facility can write
 * and save, that will never fire until its emitter is wired. Keeping the honest
 * list HERE — one exported constant — means the screen, the API and the
 * dispatcher cannot disagree about which those are.
 *
 * Grows as emitters land. `booking_created` is the whole of it today.
 */
export const DELIVERABLE_TRIGGERS: ReadonlySet<string> = new Set([
  "booking_created",
]);

export const SEND_STATUSES = [
  "queued",
  "sending",
  "sent",
  "failed",
  "skipped",
  "cancelled",
] as const;
export type SendStatus = (typeof SEND_STATUSES)[number];

export interface MessageSendRow {
  id: string;
  channel: AutomationChannel;
  toAddress: string;
  sourceKind: "automation_rule" | "workflow" | "manual";
  sourceId: string | null;
  status: SendStatus;
  skipReason: string | null;
  subject: string | null;
  scheduledFor: string;
  sentAt: string | null;
  lastError: string | null;
  clientId: string | null;
  createdAt: string;
}
