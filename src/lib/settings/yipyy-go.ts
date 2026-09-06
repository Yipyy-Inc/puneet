import { z } from "zod";

import { yipyyGoConfigSchema } from "@/types/yipyygo";
import { defaultYipyyGoConfig } from "@/data/yipyygo-config";

// ============================================================================
// Yipyy Go — the pre-arrival check-in form a customer fills before a booking.
//
// Which services ask for one, whether it is mandatory or optional, when it is
// sent, what it asks, and what a medication or a tip costs on top.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// A module-level array, mutated in place:
//
//   export function saveYipyyGoConfig(config: YipyyGoConfig): YipyyGoConfig {
//     // In production, this would save to database
//     ...
//     mockYipyyGoConfigs[index] = updatedConfig;
//
// So the settings screen edited a variable, and then said "Express Check-in
// settings saved successfully". It survived until the tab reloaded and reached
// nobody else's browser.
//
// And it was worse than one array, in the way `vaccination_rules` was worse:
// TWELVE call sites read `getYipyyGoConfig()` directly — the customer's booking
// page and their dashboard, the facility check-in screen, the bookings list,
// the grooming pre-visit briefing, BookingModal, the pending widget, the form
// builder and the trigger that decides whether to ask at all. None of them
// would have seen a facility's edits, because the edits never left the tab that
// made them.
//
// ── THE FALLBACK IS THE SHIPPED DEFAULT, WHICH IS ENTIRELY OFF ────────────
//
// NO_PRICING_RULES, NO_TAX and NO_DEPOSITS are deliberately empty because
// inheriting a fixture means charging a customer a number no business agreed
// to. SHIPPED_VACCINATION_RULES goes the other way because an unset requirement
// fails OPEN, into a building full of other people's pets.
//
// This one needs neither argument, because `defaultYipyyGoConfig` is already
// inert: `enabled: false`, and every one of the four services `enabled: false`.
// A facility that has never opened this screen asks nothing of anybody. So the
// fallback keeps the shipped shape — it is the only way the editor has
// something to render — and the shape happens to be off.
//
// One consequence worth stating plainly: the fixture carried an ENABLED config
// for facility 1, with daycare and boarding MANDATORY. That is gone. It was
// never saved anywhere, so nothing is being lost — but a facility that appeared
// to have Yipyy Go switched on was reading a seed file, and now reads its own
// row, which is empty until somebody saves one.
//
// ── WHAT IS NOT STORED ────────────────────────────────────────────────────
//
// `facilityId`, `createdAt`, `updatedAt` and `updatedBy` are row metadata and
// stay out of the value. A facility id INSIDE a facility-scoped row is the
// shape `check:facility-from-session` exists to prevent: copy the value once
// and it claims to belong to a facility it does not.
// ============================================================================

export const yipyyGoSettingsSchema = yipyyGoConfigSchema.omit({
  facilityId: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
});

export type YipyyGoSettings = z.infer<typeof yipyyGoSettingsSchema>;

/**
 * What a facility that has never opened the Yipyy Go screen uses.
 *
 * Cloned on every read, because the domain fallback is handed straight to a
 * component that will edit it.
 */
export function yipyyGoOff(): YipyyGoSettings {
  return structuredClone(defaultYipyyGoConfig) as YipyyGoSettings;
}

/** The inert value the registry hands out. See `yipyyGoOff()` for why cloning matters. */
export const YIPYY_GO_OFF: YipyyGoSettings = yipyyGoOff();

/**
 * Whether Yipyy Go should ask for a form on a booking of this service.
 *
 * Both switches have to be on: the feature for the facility, and the service
 * within it. The old `shouldTriggerYipyyGo` checked exactly this and then went
 * on to check the send window, which is a different question and stays where it
 * is.
 */
export function yipyyGoRequirementFor(
  settings: YipyyGoSettings,
  serviceType: string,
): "mandatory" | "optional" | null {
  if (!settings.enabled) return null;
  const service = settings.serviceConfigs.find(
    (candidate) => candidate.serviceType === serviceType,
  );
  if (!service || !service.enabled) return null;
  return service.requirement;
}
