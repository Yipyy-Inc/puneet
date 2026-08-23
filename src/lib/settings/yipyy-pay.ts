import { z } from "zod";

// ============================================================================
// Yipyy Pay — the facility's own payment preferences.
//
// ── YIPYY PAY IS A NAME, NOT A PROCESSOR ──────────────────────────────────
//
// The money moves through Clover: OAuth to the facility's own merchant account,
// card-not-present charges, card-present sales on their terminal, refunds. That
// is real and it is proven. What was missing was a product around it — a
// facility met "Clover" as a green card between Twilio and SendGrid, with no
// setup, no dashboard, and somebody else's brand as the headline.
//
// So the screens say Yipyy Pay, and "Powered by Clover" appears only where a
// facility is actually dealing with the processor: the landing hero, the
// dashboard header, and either side of the redirect that hands them over to
// Clover's own consent screen. Nowhere else.
//
// ── WHAT THIS DOMAIN MAY AND MAY NOT CLAIM ────────────────────────────────
//
// Clover is an acquirer, not a platform. It exposes NO partner-driven identity
// or business verification, NO payout/settlement API on an OAuth token, and no
// way to set a merchant's statement descriptor or payout schedule from here.
//
// Every field below is therefore something Yipyy genuinely owns, or something
// the facility is DECLARING so Yipyy can do arithmetic with it. Nothing here
// commands Clover, and no screen reading it may imply otherwise:
//
//   payoutSchedule     what their Clover account is set to. Drives estimated
//                      arrival dates on the dashboard and nothing else. The
//                      screen says to change it at Clover.
//   receiptDescriptor  what YIPYY prints on its own receipts, invoices and
//                      emails. The bank-statement line is Clover's and is shown
//                      read-only beside it.
//   feePayer           who absorbs the card fee. This one is not decorative:
//                      "client" adds a disclosed line item at checkout.
//
// ── THE FALLBACK IS OFF, AND THAT IS THE POINT ────────────────────────────
//
// Same rule as tax_config and pricing_rules: a default that changes what a
// customer is charged is not a default, it is a decision made on the facility's
// behalf. So feePayer starts at "business" (the facility absorbs it, i.e. the
// customer's total is unchanged), setupCompletedAt is null, and no screen shows
// a dashboard until a human has walked the wizard.
// ============================================================================

/** The two schedules a Clover merchant account can be on. */
export const payoutScheduleSchema = z.enum(["standard", "next_day"]);
export type PayoutSchedule = z.infer<typeof payoutScheduleSchema>;

/**
 * The published card rates, in the shape the fee arithmetic needs.
 *
 * Card-present is cheaper than card-not-present everywhere, because the card
 * was physically read. These are stored per facility rather than hardcoded
 * because a merchant who negotiates their own rate would otherwise be shown
 * somebody else's number on every invoice.
 */
export const feeRateSchema = z.object({
  /** A FRACTION, not a percentage: 0.029 means 2.9%. Same convention as tax. */
  percent: z.number().min(0).max(1),
  /** The per-transaction fixed amount, in cents. */
  fixedCents: z.number().int().min(0),
});
export type FeeRate = z.infer<typeof feeRateSchema>;

export const yipyyPayConfigSchema = z.object({
  /**
   * Where the wizard should resume — a HINT, never a claim.
   *
   * Whether step 1 and step 2 are actually done is derived from
   * `payment_connections` and the Clover merchant profile every time the screen
   * loads. A facility that uninstalls Yipyy at Clover must not come back to
   * three green ticks because a jsonb column still says 3.
   */
  setupStep: z.number().int().min(1).max(3).default(1),
  /** Set once the facility finishes step 3. Null means show the wizard. */
  setupCompletedAt: z.string().nullable().default(null),

  /** What their Clover account is set to. Estimates only — see the banner. */
  payoutSchedule: payoutScheduleSchema.default("standard"),

  /**
   * What Yipyy prints on its own receipts and invoices. Capped at 22 characters
   * because that is the card networks' descriptor budget, and a facility that
   * types 40 here would see it truncated somewhere they never look.
   */
  receiptDescriptor: z.string().max(22).default(""),

  /** Who absorbs the card fee. "client" adds a disclosed line at checkout. */
  feePayer: z.enum(["business", "client"]).default("business"),
  /** What the client sees the fee called on their invoice. */
  feeLabel: z.string().max(40).default("Card processing fee"),
  /**
   * Several card networks PROHIBIT surcharging a debit transaction. Yipyy
   * cannot always tell debit from credit before the charge, so this is the
   * facility's instruction for when it can.
   */
  feeExcludeDebit: z.boolean().default(true),
  feeCardPresent: feeRateSchema.default({ percent: 0.029, fixedCents: 50 }),
  feeCardNotPresent: feeRateSchema.default({ percent: 0.034, fixedCents: 30 }),

  /** Multi-location only. Single-location facilities never see this. */
  locationScope: z.enum(["all", "selected"]).default("all"),
  locationIds: z.array(z.string()).default([]),

  /**
   * Pre-authorising a saved card with a small hold.
   *
   * Off, and the screen renders it disabled with the reason: a Clover
   * pre-authorisation is `final: false`, which Canadian acquiring REFUSES, and
   * Yipyy has no card-on-file vault to hold against in the first place. It is
   * shown rather than hidden so a facility can see the capability is understood
   * and not merely forgotten.
   */
  cardAuthEnabled: z.boolean().default(false),
});

export type YipyyPayConfig = z.infer<typeof yipyyPayConfigSchema>;

/** Nothing set up, nobody charged anything extra. See the banner above. */
export const NO_YIPYY_PAY: YipyyPayConfig = {
  setupStep: 1,
  setupCompletedAt: null,
  payoutSchedule: "standard",
  receiptDescriptor: "",
  feePayer: "business",
  feeLabel: "Card processing fee",
  feeExcludeDebit: true,
  feeCardPresent: { percent: 0.029, fixedCents: 50 },
  feeCardNotPresent: { percent: 0.034, fixedCents: 30 },
  locationScope: "all",
  locationIds: [],
  cardAuthEnabled: false,
};

/** The prefix the card networks put in front of the facility's descriptor. */
export const DESCRIPTOR_PREFIX = "YIPYYPAY*";
/** The card networks' budget for the facility's own portion. */
export const DESCRIPTOR_MAX = 22;

/**
 * Exactly what a customer would read on their statement line.
 *
 * Upper-cased because card networks render descriptors in caps regardless of
 * what was submitted — showing a facility "Doggieville Mtl" and then printing
 * "DOGGIEVILLE MTL" makes the preview a small lie.
 */
export function descriptorPreview(descriptor: string, fallback: string) {
  const own = (descriptor.trim() || fallback.trim())
    .slice(0, DESCRIPTOR_MAX)
    .toUpperCase();
  return own ? `${DESCRIPTOR_PREFIX} ${own}` : DESCRIPTOR_PREFIX;
}

/**
 * The card fee on a sale, when the CLIENT is the one paying it.
 *
 * @param baseCents what the client owes before the fee — subtotal plus tax.
 *   The tip is excluded by the caller and must stay excluded: a tip is the
 *   staff's money, and charging a processing fee on top of a customer's own
 *   generosity is the kind of line that ends up in a chargeback.
 *
 * Returns 0 when the facility absorbs the fee, which is the default, so a
 * caller that forgets to check `feePayer` cannot accidentally bill anyone.
 */
export function clientProcessingFeeCents(
  baseCents: number,
  config: YipyyPayConfig,
  entry: "card_present" | "card_not_present",
): number {
  if (config.feePayer !== "client" || baseCents <= 0) return 0;
  const rate =
    entry === "card_present" ? config.feeCardPresent : config.feeCardNotPresent;
  return Math.round(baseCents * rate.percent) + rate.fixedCents;
}

/** "2.9% + 50c", for the copy that has to quote a rate back to a facility. */
export function formatFeeRate(rate: FeeRate): string {
  const percent = `${(rate.percent * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
  return rate.fixedCents > 0 ? `${percent} + ${rate.fixedCents}¢` : percent;
}
