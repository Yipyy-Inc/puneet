import { z } from "zod";

// ============================================================================
// When a customer is reminded about an estimate.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// `localStorage`, under `estimate-followup-config`, read by nothing but the
// card that wrote it. There was no sender: a facility could switch reminders
// on, write both messages, press Save and no customer was ever reminded.
//
// ── OFF UNTIL A FACILITY SAYS SO ──────────────────────────────────────────
//
// Unlike the estimate defaults, these send messages to a business's customers
// in its name. A facility that never opened the screen must send nothing, so
// the fallback is disabled — the reputation rule ships the same way. The rule
// shapes inside it are what the screen offers when somebody turns it on.
//
// ── AN EMPTY MESSAGE IS THE STANDARD ONE ──────────────────────────────────
//
// A message a facility typed goes out as typed, in whatever language they
// wrote it. Left empty, the customer gets the standard message in THEIR
// language (lib/estimates/follow-up.ts) — which a saved English default could
// never do for a French customer.
// ============================================================================

export const followUpChannelSchema = z.enum(["email", "sms", "both"]);

export const followUpRuleSchema = z.object({
  enabled: z.boolean(),
  /** Days after the anchor (sent, or viewed) between reminders. */
  delayDays: z.number().int().min(1).max(14),
  channel: followUpChannelSchema,
  /** At most this many reminders for this rule, then stop. */
  maxFollowUps: z.number().int().min(1).max(10),
  /** Empty: the standard message in the customer's language. */
  emailMessage: z.string().max(2000),
  /** Empty: the standard message in the customer's language. */
  smsMessage: z.string().max(320),
});

export const estimateFollowUpsSchema = z.object({
  enabled: z.boolean(),
  /** The estimate was sent and never opened. */
  notViewed: followUpRuleSchema,
  /** The estimate was opened and is still open. */
  viewed: followUpRuleSchema,
});

export type FollowUpChannel = z.infer<typeof followUpChannelSchema>;
export type FollowUpRule = z.infer<typeof followUpRuleSchema>;
export type EstimateFollowUps = z.infer<typeof estimateFollowUpsSchema>;

export const NO_ESTIMATE_FOLLOW_UPS: EstimateFollowUps = {
  enabled: false,
  notViewed: {
    enabled: true,
    delayDays: 3,
    channel: "email",
    maxFollowUps: 2,
    emailMessage: "",
    smsMessage: "",
  },
  viewed: {
    enabled: true,
    delayDays: 2,
    channel: "email",
    maxFollowUps: 1,
    emailMessage: "",
    smsMessage: "",
  },
};

/** The merge tags a message may use. */
export const FOLLOW_UP_MERGE_TAGS = [
  "customer_name",
  "pet_name",
  "service_name",
  "estimate_total",
  "estimate_link",
] as const;
