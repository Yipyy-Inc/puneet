import { z } from "zod";

// ============================================================================
// How the front desk's Take payment dialog behaves (decision 2, 2026-10-03).
//
// `creditAtCheckout` — a client's account credit is applied to what they pay:
//
//   auto  automatically, first, with a switch to keep it for one payment
//   ask   only once staff have asked the client: "Use credit now" or "Save it
//         for later" — the dialog will not take the payment until one is
//         chosen
//
// AUTO when unset, as the client's mock draws it. Credit is the client's own
// money already held by the facility, so spending it on their bill is the
// unsurprising default; a facility whose clients like to bank it says so.
// ============================================================================

export const checkoutConfigSchema = z.object({
  creditAtCheckout: z.enum(["auto", "ask"]),
});

export type CheckoutConfig = z.infer<typeof checkoutConfigSchema>;

export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
  creditAtCheckout: "auto",
};

/**
 * The services the dialog asks for a tip on, when the facility has not said —
 * the mock's: a groom and a training session are where a tip is customary.
 * Read with this default wherever `tip_config.deskServices` is absent.
 */
export const DEFAULT_DESK_TIP_SERVICES = ["grooming", "training"] as const;
