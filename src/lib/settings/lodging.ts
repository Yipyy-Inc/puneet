import { z } from "zod";

// ============================================================================
// LODGING SETTINGS — the ones that belong to the lodgings themselves, not to
// the boarding module.
//
// MoéGo keeps these at Settings > Lodgings, beside "Manage lodging type" and
// "Add lodging", and this domain is that page's own row.
//
// ── WHY NOT `boarding_config` ─────────────────────────────────────────────
//
// `boarding_config` is `moduleConfigSchema`, which daycare and grooming share.
// A checkout cut-off on that schema would appear on all three and be read on
// one — the "stored, edited, and decides nothing" defect this codebase keeps
// finding (`size_pricing` on all 6 daycare services charging nobody;
// `requires_evaluation_online` read by nothing for three phases). One field,
// one home, one reader.
//
// ── EVERY FIELD IS OPTIONAL, AND THAT IS NOT LAZINESS ─────────────────────
//
// `settingsFromRows` (lib/settings/from-rows.ts:22-26) DROPS A WHOLE DOMAIN
// whose stored value stops parsing. A facility that saved this row before a
// later field existed must still get its cut-off back, so nothing here is
// required and the fallback is a complete object.
// ============================================================================

/**
 * MoéGo's "Checkout cut-off time".
 *
 * > "Boarding appointments that check out at or after the cut-off time →
 * >  Count toward that night's boarding capacity" — and those that check out
 * >  before it do not.
 *
 * The rule is enforced in Postgres, by `private.boarding_stay_apply_cutoff()`
 * (20260924200000), because it decides whether a kennel is sellable and a rule
 * the client could skip is not a rule. This row is what that trigger reads.
 */
export const lodgingConfigSchema = z.object({
  checkoutCutOff: z
    .object({
      enabled: z.boolean().optional(),
      /**
       * Local time at the facility, `HH:MM` on a 24-hour clock.
       *
       * Deliberately a string and not a number of minutes: it is written by a
       * time input and read by `::time` in SQL, and both speak this. A
       * malformed value leaves the cut-off off rather than guessing at one —
       * see the trigger.
       */
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
    })
    .optional(),
});

export type LodgingConfig = z.infer<typeof lodgingConfigSchema>;

/**
 * Off, with no time.
 *
 * MoéGo ships the cut-off disabled and so do we: enabling it makes kennels
 * UNAVAILABLE that were sellable the day before, and that is a decision a
 * facility makes, not one a default makes for them.
 */
export const DEFAULT_LODGING_CONFIG: LodgingConfig = {
  checkoutCutOff: { enabled: false },
};
