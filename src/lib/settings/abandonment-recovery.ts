import { z } from "zod";

import { DEFAULT_ABANDONMENT_RECOVERY_SETTINGS } from "@/data/abandonment-recovery-settings";
import type { AbandonmentRecoverySettings } from "@/types/unfinished-booking";

// ============================================================================
// How a facility wants to follow up a booking a customer left partway.
//
// The settings sheet saved nothing — a "settings saved" toast over a useState
// seeded from src/data. It is the `abandonment_recovery` domain now.
//
// NOTHING SENDS FROM THESE YET. The unfinished booking is recorded
// (unfinished_bookings) and staff follow it up by hand; no automation reads
// these templates. See the debt map (2026-09-14).
// ============================================================================

const channel = z.enum(["email", "sms", "both", "off"]);

const stepRule = z.object({
  enabled: z.boolean(),
  channel: z.union([channel, z.literal("inherit")]),
  delayHours: z.union([z.number().min(0).max(720), z.literal("inherit")]),
  emailSubject: z.string().max(300),
  emailBody: z.string().max(10000),
  smsBody: z.string().max(1000),
});

export const abandonmentRecoverySchema = z.object({
  enabled: z.boolean(),
  defaultChannel: channel,
  defaultDelayHours: z.number().min(0).max(720),
  stepRules: z.object({
    service_selection: stepRule,
    pet_selection: stepRule,
    date_and_details: stepRule,
    add_ons: stepRule,
    forms: stepRule,
    review: stepRule,
    payment: stepRule,
  }),
});

/** The shipped templates, until a facility saves its own. */
export const SHIPPED_ABANDONMENT_RECOVERY: AbandonmentRecoverySettings =
  structuredClone(DEFAULT_ABANDONMENT_RECOVERY_SETTINGS);
