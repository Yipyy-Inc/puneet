import { z } from "zod";

import {
  bookingRulesSchema,
  evaluationConfigSchema,
  evaluationReportCardConfigSchema,
  facilityBookingFlowConfigSchema,
  moduleConfigSchema,
  tipConfigSchema,
} from "@/types/facility";
import {
  boardingConfig,
  bookingRules,
  businessHours,
  daycareConfig,
  evaluationConfig,
  evaluationReportCardConfig,
  facilityBookingFlowConfig,
  groomingConfig,
  tipConfig,
  trainingConfig,
} from "@/data/settings";
import type {
  BookingRules,
  BusinessHours,
  EvaluationConfig,
  EvaluationReportCardConfig,
  FacilityBookingFlowConfig,
  ModuleConfig,
  TipConfig,
} from "@/types/facility";

// ============================================================================
// The settings a facility owns, and what each one must look like.
//
// `public.facility_settings` stores `value jsonb` and Postgres cannot type the
// contents. Deliberately: twenty jsonb columns on `facilities` would make the
// table's shape a changelog, and a check constraint per domain would put each
// shape in two places and let them disagree. So the shape is enforced HERE,
// once, and both the route and the screens read it from this file.
//
// ── A DEFAULT IS NOT A STORED VALUE ───────────────────────────────────────
//
// No rows are seeded. An absent row means "this facility has not configured
// this", and `fallback` below is what the app assumes until it does.
//
// The distinction is the point of the whole exercise. `src/data/settings.ts`
// showed every facility 07:00-19:00 as though somebody had chosen it. These
// same numbers are still the starting point — a booking system has to offer
// SOME hours — but the API reports `configured: false` alongside them, so a
// screen can say "not set up yet" instead of asserting a fact about a business
// it knows nothing about.
//
// ── ADDING A DOMAIN ───────────────────────────────────────────────────────
//
// Add an entry. No migration: the table is keyed by (facility_id, domain), so
// a new domain is an INSERT. That is the whole reason it is shaped this way —
// there are ~20 still living in `useSettings`.
// ============================================================================

const dayHoursSchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string(),
  closeTime: z.string(),
});

export const businessHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

// ── THE DEFAULTS COME FROM THE FIXTURE, AND THIS IS THE ONLY PLACE ────────
//
// `src/data/settings.ts` holds exactly these values, and every screen has been
// rendering them for months. Copying them here would be two copies free to
// drift; changing them in the same commit that makes a domain real would be two
// changes wearing one hat.
//
// So the fixture's remaining legitimate role is being the documented default,
// and THIS FILE is the only module allowed to import it for a converted domain.
// Anywhere else, reading `@/data/settings` for one of these means a screen is
// bypassing the facility's own value — which is the entire bug being fixed.
//
// A default here is still not a stored value: `configured: false` travels with
// it, so a screen can tell "what we assume" from "what they chose".

const DEFAULT_HOURS: BusinessHours = businessHours;
const DEFAULT_RULES: BookingRules = bookingRules;
const DEFAULT_TIPS: TipConfig = tipConfig;

export const SETTING_DOMAINS = {
  business_hours: { schema: businessHoursSchema, fallback: DEFAULT_HOURS },
  booking_rules: { schema: bookingRulesSchema, fallback: DEFAULT_RULES },
  // Money. `enabled`, the percentage options and the preferred index decide
  // what a customer is asked to add to their bill, so a facility running one
  // set of tip tiers while the payment screen offers another is not a display
  // bug.
  tip_config: { schema: tipConfigSchema, fallback: DEFAULT_TIPS },

  // ── WHAT A CUSTOMER MAY BOOK ───────────────────────────────────────────
  //
  // These four gate the booking flow itself: whether an evaluation is required
  // before a service unlocks, which services are hidden, and the client-facing
  // name and base price of each module. A facility that hides a service, or
  // requires an evaluation, was having that decision ignored by the page that
  // takes the booking.
  //
  // The four module domains are named `<service>_config` rather than sharing
  // one row, because they are edited independently and a single row would make
  // two staff saving different services overwrite each other.
  booking_flow: {
    schema: facilityBookingFlowConfigSchema,
    fallback: facilityBookingFlowConfig as FacilityBookingFlowConfig,
  },
  daycare_config: {
    schema: moduleConfigSchema,
    fallback: daycareConfig as ModuleConfig,
  },
  boarding_config: {
    schema: moduleConfigSchema,
    fallback: boardingConfig as ModuleConfig,
  },
  grooming_config: {
    schema: moduleConfigSchema,
    fallback: groomingConfig as ModuleConfig,
  },
  training_config: {
    schema: moduleConfigSchema,
    fallback: trainingConfig as ModuleConfig,
  },
  evaluation_config: {
    schema: evaluationConfigSchema,
    fallback: evaluationConfig as EvaluationConfig,
  },
  // Saved by the same handler as the two above, so it is converted with them —
  // leaving one of three still mutating a module-level object would make that
  // screen half-real in a way nobody could see.
  evaluation_report_card: {
    schema: evaluationReportCardConfigSchema,
    fallback: evaluationReportCardConfig as EvaluationReportCardConfig,
  },
} as const;

export type SettingDomain = keyof typeof SETTING_DOMAINS;

export function isSettingDomain(value: string): value is SettingDomain {
  return Object.prototype.hasOwnProperty.call(SETTING_DOMAINS, value);
}

/** Every domain's default, as the API would report it with nothing stored. */
export function defaultSettings(): {
  [K in SettingDomain]: { value: unknown; configured: boolean };
} {
  return Object.fromEntries(
    Object.entries(SETTING_DOMAINS).map(([domain, spec]) => [
      domain,
      { value: structuredClone(spec.fallback), configured: false },
    ]),
  ) as { [K in SettingDomain]: { value: unknown; configured: boolean } };
}
