import { z } from "zod";

import { ivrNodeSchema } from "@/types/calling";

// ============================================================================
// The menu a caller hears.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
//   const handleSave = () => {
//     setSaved(true);
//     setTimeout(() => setSaved(false), 2000);
//   };
//
// The third instance of the same defect in this module, after the calling
// settings and the call tags. Somebody could rewrite the greeting, add a menu
// option, change what pressing 3 does — and a reload put it all back.
//
// ── AND WHY IT SHIPS DISABLED ─────────────────────────────────────────────
//
// The fallback has `enabled: false`, and the greeting is EMPTY.
//
// The fixture's greeting is "Thank you for calling Yipyy, where every tail
// gets a five-star stay." Yipyy is the platform. A facility called Happy Paws
// that turned this on would have its customers answered by a company they have
// never heard of — the same defect as the demo phone number the calling
// settings used to present as the facility's own line, except this one is read
// aloud to whoever rings.
//
// So no default greeting is offered at all. An IVR enabled with nothing to say
// is worse than no IVR: the caller waits through silence and then hangs up,
// and the facility cannot tell that from a quiet week.
//
// ── THE AFTER-HOURS MESSAGE IS NOT WHERE HOURS LIVE ───────────────────────
//
// The fixture's version recites "Monday through Friday 7 AM to 7 PM, and
// weekends 8 AM to 6 PM" — a THIRD copy of the opening hours, after
// `business_hours` and the set the calling settings used to keep. It is free
// text a facility writes, so it cannot be validated against the real hours,
// but the schema does not seed it either: a recording that contradicts the
// booking page is worse than one that says nothing.
// ============================================================================

export const ivrSettingsSchema = z.object({
  enabled: z.boolean(),
  /** Read aloud when a call is answered. Empty means nothing is configured. */
  greeting: z.string().max(1000),
  nodes: z.array(ivrNodeSchema).max(12),
  afterHoursMessage: z.string().max(1000).optional(),
  holdMusic: z.enum(["none", "jazz", "classical", "upbeat"]),
  maxMenuRepeats: z.number().int().min(1).max(5),
});
export type IvrSettings = z.infer<typeof ivrSettingsSchema>;

/**
 * Off, and silent.
 *
 * `enabled: false` for the reason in the banner: the only greeting available
 * to default to names the wrong company, and an IVR with no greeting answers a
 * customer with silence.
 *
 * The empty `nodes` list is the same argument. A menu offering "press 2 for
 * grooming" at a facility that does not groom sends callers somewhere that
 * does not exist, and the fixture's options were written for the demo data.
 */
export const NO_IVR: IvrSettings = {
  enabled: false,
  greeting: "",
  nodes: [],
  afterHoursMessage: undefined,
  holdMusic: "none",
  maxMenuRepeats: 3,
};

/**
 * Whether this configuration could actually answer a call.
 *
 * `enabled` alone does not mean working — a facility can switch the IVR on and
 * leave the greeting empty, and the API accepts that because a half-built menu
 * has to be savable. This is what a screen asks before claiming the IVR is
 * live.
 */
export function ivrIsAnswerable(config: IvrSettings): boolean {
  return config.enabled && config.greeting.trim().length > 0;
}

/** Keys that two options both claim — the caller gets whichever sorts first. */
export function duplicateKeys(config: IvrSettings): string[] {
  const seen = new Set<string>();
  const clashes = new Set<string>();
  for (const node of config.nodes) {
    if (seen.has(node.key)) clashes.add(node.key);
    seen.add(node.key);
  }
  return [...clashes];
}
