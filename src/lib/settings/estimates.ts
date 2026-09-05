import { z } from "zod";

// ============================================================================
// How a facility numbers, expires and converts its estimates.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// `localStorage`, under `settings-estimate-defaults`. So the estimate number
// prefix, the expiry window and whether a customer may accept an estimate
// themselves were all properties of a BROWSER. Two staff sending estimates from
// two machines produced two numbering schemes, and a cache clear reset the lot.
//
// `magicLinkExpiryHours` is the sharpest of them: it decides how long the link
// in a customer's email keeps working. Set to 72 on one machine and left at the
// default on another, the same customer gets two different windows depending on
// which member of staff pressed send.
//
// ── THE FALLBACK KEEPS THE DEFAULTS ───────────────────────────────────────
//
// Unlike NO_DEPOSITS and NO_PRICING_RULES, and for the same reason as the
// vaccination list: nothing here charges anybody. These are the mechanics of a
// document — a prefix, a number width, an expiry window — and a facility that
// has never opened the screen still has to number its estimates something. An
// empty fallback would mean no prefix and a zero-day expiry, which is not
// "unconfigured", it is broken.
// ============================================================================

export const estimateSettingsSchema = z.object({
  defaultExpiryDays: z.number(),
  requireDepositOnAccept: z.boolean(),
  estimateNumberPrefix: z.string(),
  minDigits: z.number(),
  expiryWarningEnabled: z.boolean(),
  expiryWarningHoursBefore: z.number(),
  autoConvertOnAccept: z.boolean(),
  magicLinkExpiryHours: z.number(),
  sendWelcomeEmail: z.boolean(),
  allowCustomerAcceptance: z.boolean(),
  acceptanceRequiresDeposit: z.boolean(),
});

export type EstimateSettings = z.infer<typeof estimateSettingsSchema>;

/** What a facility that has never opened the estimates screen uses. */
export const DEFAULT_ESTIMATE_SETTINGS: EstimateSettings = {
  defaultExpiryDays: 30,
  requireDepositOnAccept: false,
  estimateNumberPrefix: "E",
  minDigits: 5,
  expiryWarningEnabled: true,
  expiryWarningHoursBefore: 24,
  autoConvertOnAccept: false,
  magicLinkExpiryHours: 72,
  sendWelcomeEmail: true,
  allowCustomerAcceptance: true,
  acceptanceRequiresDeposit: false,
};
