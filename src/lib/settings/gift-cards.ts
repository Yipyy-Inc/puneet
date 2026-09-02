import { z } from "zod";

// ============================================================================
// How a facility's gift cards behave.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
//   const handleSave = async () => {
//     setSaving(true);
//     await new Promise((r) => setTimeout(r, 1000));
//     setSaving(false);
//     setSaved(true);
//   };
//
// A one-second delay impersonating a network request, then a tick. Worse than
// the calling panel's version of the same defect, which at least did not
// pretend to be waiting on anything. Every control worked, the button said
// "Saved", and a reload restored the fixture.
//
// It matters more here because these are terms on MONEY THE BUSINESS OWES.
// A gift card is a liability: somebody paid for it and holds a claim. The
// settings on this screen decide when that claim dies, what it can be spent
// on, and how much can be spent without proving ownership.
//
// ── EXPIRY IS THE ONE TO BE CAREFUL WITH ──────────────────────────────────
//
// `expiryEnabled` decides whether a customer's remaining balance is taken from
// them. In several jurisdictions that is not a business decision to make:
// Quebec's Consumer Protection Act prohibits expiry on most gift cards
// outright, Ontario and British Columbia likewise, and the US CARD Act sets a
// five-year federal floor. The demo data throughout this product uses a 514
// area code, which is Montreal.
//
// So the fallback is OFF, and it would be OFF even if the fixture said
// otherwise — the NO_TAX rule, applied to a liability that is measured in
// somebody else's money. A facility that has never opened this screen cannot
// be quietly expiring cards its customers paid for.
//
// ── AND THE PIN THRESHOLD IS A FRAUD CONTROL, NOT A PREFERENCE ────────────
//
// `pinRequiredAbove` is the amount above which redeeming requires the card's
// PIN. Set high, a stolen card number spends freely. The fixture's $200 is
// carried over as the documented default rather than something laxer, because
// a facility that never configures this should not end up with the weakest
// setting on the screen.
// ============================================================================

export const walletUsageRulesSchema = z.object({
  boarding: z.boolean(),
  daycare: z.boolean(),
  grooming: z.boolean(),
  training: z.boolean(),
  retail: z.boolean(),
  packages: z.boolean(),
  deposits: z.boolean(),
  addons: z.boolean(),
  tips: z.boolean(),
});
export type WalletUsageRules = z.infer<typeof walletUsageRulesSchema>;

export const giftCardConfigSchema = z
  .object({
    digitalEnabled: z.boolean(),
    physicalEnabled: z.boolean(),
    /** Physical stock level that raises a reorder warning. */
    lowStockThreshold: z.number().int().min(0).max(10_000),

    /** Whether a customer's remaining balance is ever taken from them. */
    expiryEnabled: z.boolean(),
    expiryDays: z.number().int().min(30).max(3650),

    partialRedemptionAllowed: z.boolean(),
    /** Redeeming more than this requires the card's PIN. */
    pinRequiredAbove: z.number().int().min(0).max(100_000),

    redemptionLocationScope: z.enum([
      "this_location",
      "all_locations",
      "selected",
    ]),
    redemptionLocationIds: z.array(z.string()).max(200),

    refundToGiftCard: z.boolean(),
    allowGiftCardCancellation: z.boolean(),

    walletUsageRules: walletUsageRulesSchema,
  })
  .superRefine((config, ctx) => {
    // "Selected locations" with nothing selected redeems NOWHERE. Refused at
    // the API rather than left to a disabled button somebody can work around,
    // because the result is a customer holding a card no branch will take.
    if (
      config.redemptionLocationScope === "selected" &&
      config.redemptionLocationIds.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["redemptionLocationIds"],
        message:
          "Choose at least one location, or the card cannot be redeemed anywhere.",
      });
    }
    // Expiry off means the number beside it is inert; expiry ON with a
    // nonsensical term is a claim about somebody's money. The schema's min of
    // 30 days already refuses the worst of it.
    if (config.expiryEnabled && config.expiryDays < 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDays"],
        message: "An expiry shorter than 30 days is not permitted.",
      });
    }
  });
export type GiftCardConfig = z.infer<typeof giftCardConfigSchema>;

/**
 * What a facility that has never opened this screen gets.
 *
 * EXPIRY OFF. See the banner — this is the NO_TAX rule applied to money the
 * business owes rather than money it collects, and it is the entry in this
 * file that would do real harm if it were copied from the fixture without
 * thinking. It happens that the fixture also says false; the fallback is
 * written here independently so that changing the fixture cannot change it.
 *
 * Everything else matches what the product has been showing, so adopting this
 * domain changes no behaviour until somebody configures it. `all_locations` is
 * the generous default deliberately: a customer holding a card should be able
 * to spend it, and a facility that wants to narrow that can say so.
 */
export const NO_GIFT_CARD_CONFIG: GiftCardConfig = {
  digitalEnabled: true,
  physicalEnabled: true,
  lowStockThreshold: 50,

  expiryEnabled: false,
  expiryDays: 365,

  partialRedemptionAllowed: true,
  pinRequiredAbove: 200,

  redemptionLocationScope: "all_locations",
  redemptionLocationIds: [],

  refundToGiftCard: true,
  allowGiftCardCancellation: true,

  walletUsageRules: {
    boarding: true,
    daycare: true,
    grooming: true,
    training: true,
    retail: true,
    packages: true,
    deposits: true,
    addons: true,
    // Off, and the only one that is. A tip is meant for a person, and paying
    // it from a gift card moves the cost onto the business's own liability
    // rather than the customer's pocket.
    tips: false,
  },
};
