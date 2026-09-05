import { z } from "zod";

import { vaccinationRuleSchema } from "@/types/facility";
import type { VaccinationRule } from "@/types/facility";
import { vaccinationRules as SHIPPED_RULES } from "@/data/settings";

// ============================================================================
// Which vaccines a facility requires, of which species, for which services.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// A module-level array in src/data/vaccination-rules.ts, spliced in place:
//
//   export function syncVaccinationRules(next: VaccinationRule[]): void {
//     rules.splice(0, rules.length, ...next);
//     notify();
//   }
//
// So the settings screen edited a variable. It survived until the tab was
// reloaded and reached nobody else's browser — on a record staff check before
// admitting an animal.
//
// And it was worse than one array. THREE screens never even read that array:
// CreateClientModal, CustomerBookingModal and the eligibility builder imported
// `vaccinationRules` from `@/data/settings` directly, so they enforced the
// shipped list no matter what the facility had entered. A facility could
// configure a requirement, watch it appear in settings and on the client's
// vaccination page, and have the customer's own booking screen still check
// something else.
//
// ── THE FALLBACK KEEPS THE SHIPPED LIST, AND THAT BREAKS THE PATTERN ──────
//
// NO_PRICING_RULES, NO_TAX and NO_DEPOSITS are all deliberately EMPTY, and the
// reasoning there is explicit: inheriting a fixture means charging a customer a
// number no business agreed to. This domain does the opposite on purpose,
// because the harm runs the other way.
//
// An unset FEE fails safe — nothing is charged. An unset REQUIREMENT fails
// OPEN: the animal is admitted, unvaccinated, into a building full of other
// people's pets. And a requirement cannot take money whichever way it is wrong;
// the worst a default does is prompt for a rabies certificate the facility
// would have asked for anyway.
//
// So an unconfigured facility keeps checking the standard list, exactly as it
// does today, and `configured: false` still travels with the value so the
// screen can say the list has not been reviewed rather than implying somebody
// chose it.
//
// If that is the wrong call for this business it is one edit away, which is the
// whole point of the domain. Silently dropping every vaccination check on every
// facility that has not opened this screen is not.
// ============================================================================

export const vaccinationRulesSchema = z.array(vaccinationRuleSchema);

export type VaccinationRules = z.infer<typeof vaccinationRulesSchema>;

/**
 * The list Yipyy ships: the vaccines a boarding and daycare business is
 * normally expected to check. Cloned, because the domain fallback is handed out
 * by reference and a caller that edited it would edit every facility's default.
 */
export const SHIPPED_VACCINATION_RULES: VaccinationRules = SHIPPED_RULES.map(
  (rule): VaccinationRule => ({ ...rule }),
);
