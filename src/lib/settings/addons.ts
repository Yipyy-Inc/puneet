import { z } from "zod";

import { addOnCategorySchema, serviceAddOnSchema } from "@/types/facility";
import type { AddOnCategory, ServiceAddOn } from "@/types/facility";

// ============================================================================
// The extras a facility sells on a booking, and the categories they sit in.
//
// ── WHERE THIS USED TO LIVE, AND HOW MANY TIMES ───────────────────────────
//
// `localStorage`, under `settings-service-addons` — and not once. THIRTEEN
// files carried the key, each with its own loader and its own fallback to the
// shipped fixture, including src/lib/pricing-rules.ts, which is the layer that
// prices a booking. Ten more files skipped the key entirely and read
// `defaultServiceAddOns` directly, so they never saw a facility's edits at all.
//
// The effect: a manager configures the upsells their business actually offers,
// and twenty-two other screens go on offering the seed list — at the seed
// list's prices. Two staff on two machines quote different extras for the same
// service, and a cache clear resets what the business sells.
//
// Somebody had noticed the shape of the problem: `getServiceAddOnsStorageKey()`
// scoped the key per facility, `settings-service-addons::facility-11`. A
// per-facility key in a per-browser store is still a per-browser store.
//
// ── THE FALLBACK IS EMPTY, AND IT REMOVES THINGS FROM SCREENS ─────────────
//
// Same decision as NO_DEPOSITS and NO_PRICING_RULES, and it is the most
// visible of the three: a facility that has never opened the add-ons screen now
// offers NO extras, where before every booking flow offered the fixture's.
//
// An add-on is not charged automatically — it is offered, and then somebody
// selects it and the customer pays. That is exactly why the fixture is not a
// safe default: "Nail trim, $15" appearing in a booking flow is this business
// telling a customer it sells a nail trim for $15, and no one here ever said
// so. A facility with no add-ons configured is a facility that has not set them
// up yet; a facility quietly selling a seed file's services at a seed file's
// prices is something worse.
//
// `configured: false` travels with the value so the screen says which it is.
// ============================================================================

export const serviceAddOnsConfigSchema = z.object({
  addOns: z.array(serviceAddOnSchema),
  categories: z.array(addOnCategorySchema),
});

export type ServiceAddOnsConfig = z.infer<typeof serviceAddOnsConfigSchema>;

/** A facility that has not set up its extras sells none. */
export const NO_ADDONS: ServiceAddOnsConfig = {
  addOns: [],
  categories: [],
};

/**
 * The add-ons offered for one service.
 *
 * `applicableServices` is empty or contains "all" to mean every service, which
 * is the normalisation the four booking flows each used to do for themselves.
 */
export function addOnsForService(
  addOns: ServiceAddOn[],
  serviceId: string,
): ServiceAddOn[] {
  return addOns.filter((addOn) => {
    if (!addOn.isActive) return false;
    const services = addOn.applicableServices ?? [];
    if (services.length === 0 || services.includes("all")) return true;
    return services.includes(serviceId);
  });
}

export type { ServiceAddOn, AddOnCategory };
