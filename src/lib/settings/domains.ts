import { z } from "zod";

import { NO_PAYROLL_RULES, payrollConfigSchema } from "@/lib/settings/payroll";

import {
  NO_LOYALTY_PROGRAM,
  loyaltyConfigSchema,
} from "@/lib/settings/loyalty";

import {
  callingDispatchSchema,
  callingFollowUpSchema,
  callingNumberPrefsSchema,
  callingRecordingSchema,
  callingTagsSchema,
  DEFAULT_CALL_TAGS,
  DEFAULT_CALLING_DISPATCH,
  NO_CALL_FOLLOW_UP,
  NO_CALL_RECORDING,
  NO_CALLING_NUMBER,
} from "@/lib/settings/calling";

import { ivrSettingsSchema, NO_IVR } from "@/lib/settings/ivr";
import {
  giftCardConfigSchema,
  NO_GIFT_CARD_CONFIG,
} from "@/lib/settings/gift-cards";
import { NO_PRICING_RULES, pricingRulesSchema } from "@/lib/settings/pricing";
import { depositConfigSchema, NO_DEPOSITS } from "@/lib/settings/deposits";
import {
  SHIPPED_VACCINATION_RULES,
  vaccinationRulesSchema,
} from "@/lib/settings/vaccinations";
import {
  DEFAULT_ESTIMATE_SETTINGS,
  estimateSettingsSchema,
} from "@/lib/settings/estimates";
import {
  DEFAULT_INCIDENT_REPORTING,
  incidentReportingConfigSchema,
} from "@/lib/settings/incidents";
import { NO_REBOOK_CONFIG, rebookConfigSchema } from "@/lib/settings/rebook";
import {
  messagingPolicySchema,
  NO_MESSAGING_POLICY,
} from "@/lib/settings/messaging-policy";
import {
  NO_REPUTATION_CONFIG,
  reputationConfigSchema,
} from "@/lib/settings/reputation";
import { NO_TAX, taxConfigSchema } from "@/lib/settings/tax";
import { NO_YIPYY_PAY, yipyyPayConfigSchema } from "@/lib/settings/yipyy-pay";

import {
  bookingRulesSchema,
  groomingSchedulingSchema,
  accountingStructureSchema,
  networkPolicySchema,
  dropOffPickUpOverrideSchema,
  evaluationFormTemplateSchema,
  moduleAddonSchema,
  notificationToggleSchema,
  reportCardConfigSchema,
  scheduleTimeOverrideSchema,
  serviceDateBlockSchema,
  serviceNotificationDefaultSchema,
  weatherWarningRuleSchema,
  evaluationConfigSchema,
  evaluationReportCardConfigSchema,
  facilityBookingFlowConfigSchema,
  moduleConfigSchema,
  tipConfigSchema,
  tipAttributionSchema,
} from "@/types/facility";
import {
  boardingConfig,
  bookingRules,
  businessHours,
  daycareConfig,
  evaluationConfig,
  evaluationReportCardConfig,
  facilityBookingFlowConfig,
  dropOffPickUpOverrides,
  evaluationFormTemplate,
  groomingConfig,
  moduleAddons,
  notificationToggles,
  reportCardConfig,
  scheduleTimeOverrides,
  serviceDateBlocks,
  serviceNotificationDefaults,
  tipConfig,
  trainingConfig,
  weatherWarningRules,
} from "@/data/settings";
import type {
  BookingRules,
  DropOffPickUpOverride,
  EvaluationFormTemplate,
  ModuleAddon,
  NotificationToggle,
  ReportCardConfig,
  ScheduleTimeOverride,
  ServiceDateBlock,
  ServiceNotificationDefault,
  WeatherWarningRule,
  BusinessHours,
  EvaluationConfig,
  EvaluationReportCardConfig,
  FacilityBookingFlowConfig,
  ModuleConfig,
  TipConfig,
  TipAttribution,
  GroomingScheduling,
  AccountingStructure,
  NetworkPolicy,
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

// ── WHO A TIP IS OWED TO, WHEN NOBODY HAS SAID ────────────────────────────
//
// `assigned` everywhere. It is the answer that is right most often -- a tip
// follows the person who did the work -- and, more importantly, it is the one
// that is VISIBLE when it is wrong: the money appears against a named person on
// the payout report, where somebody will correct it.
//
// `pool` would have been the cautious-looking default and is the worse one. It
// attributes nothing, so a facility that never opens this screen accumulates an
// unallocated pile that looks like nobody earned anything, and the error is
// silent for exactly as long as nobody goes looking.
const DEFAULT_TIP_ATTRIBUTION: TipAttribution = {
  defaultMode: "assigned",
  byService: {},
};

// The shipped defaults, kept as the fallback rather than seeded into every
// facility: a facility that has never opened the screen behaves exactly as it
// did before this domain existed.
const DEFAULT_GROOMING_SCHEDULING: GroomingScheduling = {
  smartSchedulingEnabled: true,
  slotGranularityMin: 30,
  defaultBufferMin: 15,
};

// One set of books for the business is the ordinary case, and the safe one: a
// facility that never opens the screen keeps every branch in one company rather
// than being told to connect several.
const DEFAULT_ACCOUNTING_STRUCTURE: AccountingStructure = {
  multiLocationMode: "single_company",
};

// Every toggle "not shared" and every scope "per_location" -- a facility that
// never opens this screen keeps its branches isolated from each other rather
// than being told its customer data, gift cards or loyalty points are pooled
// on a choice nobody made. `staff_choice` for transfer pricing is the same
// idea for a one-shot decision: defer to a human instead of picking a side.
const DEFAULT_NETWORK_POLICY: NetworkPolicy = {
  sharedStaffPool: false,
  centralizedCustomerData: false,
  pricingModel: "per_location",
  agreementsScope: "per_location",
  tagsScope: "per_location",
  paymentMethodsScope: "per_location",
  internalNotesScope: "per_location",
  transferRequiresCustomerApproval: false,
  transferPricingPolicy: "staff_choice",
  sharedEmailTemplates: false,
  sharedAutomations: false,
  crossLocationLoyalty: false,
  crossLocationGiftCards: false,
  sharedWaivers: false,
  sharedIncidentHistory: false,
  sharedMedicalRecords: false,
  brandingNameScope: "per_location",
  brandingLogoScope: "per_location",
  brandingColorScope: "per_location",
};

export const SETTING_DOMAINS = {
  business_hours: { schema: businessHoursSchema, fallback: DEFAULT_HOURS },
  booking_rules: { schema: bookingRulesSchema, fallback: DEFAULT_RULES },
  // How grooming slots are offered. Read by the booking dialog, so a facility
  // running one granularity while a colleague's browser runs another is not a
  // display bug — the two book different things.
  grooming_scheduling: {
    schema: groomingSchedulingSchema,
    fallback: DEFAULT_GROOMING_SCHEDULING,
  },
  // Whether the business keeps one set of books or one per branch. A fact about
  // how the company is incorporated, so it belongs to the facility rather than
  // to whoever's browser last answered it.
  //
  // The QuickBooks CONNECTION is deliberately not a settings domain and is not
  // stored anywhere: src/lib/quickbooks/ has 27 files, zero API routes and zero
  // tables. See the note on `accountingStructureSchema` in types/facility.ts.
  accounting_structure: {
    schema: accountingStructureSchema,
    fallback: DEFAULT_ACCOUNTING_STRUCTURE,
  },
  // ── HQ NETWORK POLICY ────────────────────────────────────────────────────
  //
  // The cross-location toggles on HQ Settings: what data is pooled across
  // branches (customers, staff, agreements, tags, payment methods, notes,
  // loyalty, gift cards, waivers, incident history, medical records), how
  // pricing and branding are scoped, and what happens when a booking
  // transfers between locations. Multi-location-only, but it is a fact about
  // the business, so it belongs here rather than in a browser.
  network_policy: {
    schema: networkPolicySchema,
    fallback: DEFAULT_NETWORK_POLICY,
  },
  // Money. `enabled`, the percentage options and the preferred index decide
  // what a customer is asked to add to their bill, so a facility running one
  // set of tip tiers while the payment screen offers another is not a display
  // bug.
  tip_config: { schema: tipConfigSchema, fallback: DEFAULT_TIPS },
  // Who the tip belongs to once it is collected. A SEPARATE domain from
  // tip_config, deliberately: one decides what the customer is offered and is
  // edited by whoever runs the front desk; this one decides who gets paid.
  tip_attribution: {
    schema: tipAttributionSchema,
    fallback: DEFAULT_TIP_ATTRIBUTION,
  },
  // Money, and the most consequential entry here: it decides what a customer
  // is CHARGED and what the facility owes a revenue authority.
  //
  // The fallback is NO_TAX — an empty list — and not the fixture's Quebec
  // GST + QST. Carrying the fixture over would have every facility that never
  // opened the screen quietly adding 14.975% to its receipts, in Ontario, in
  // Alberta, in the United States. See the banner in lib/settings/tax.ts.
  tax_config: { schema: taxConfigSchema, fallback: NO_TAX },
  // Money, and the one a facility is most likely to get charged FOR rather
  // than charge: surcharges and discounts — late pickup, peak dates, multi-pet,
  // room-type adjustments, bundles.
  //
  // These lived in localStorage until 2026-08-20, so a facility's late fee was
  // whatever the browser in front of you remembered. The fallback is EMPTY for
  // the same reason tax_config's is NO_TAX: the fixture ships an enabled $10
  // late fee, and inheriting it would have every facility on the platform
  // taking money from customers on a number a seed file invented. See the
  // banner in lib/settings/pricing.ts.
  pricing_rules: { schema: pricingRulesSchema, fallback: NO_PRICING_RULES },
  // ── DEPOSITS ───────────────────────────────────────────────────────────
  //
  // What the facility asks for up front, and what happens to it if the booking
  // is cancelled. The same localStorage fault as pricing_rules above and worse
  // in one respect: `loadDepositRules()` was read by BookingModal and by the
  // booking detail page, not only by the settings editor — so the deposit a
  // customer was asked for depended on which browser took the booking, and a
  // cache clear reset the business's terms without telling anybody.
  //
  // Empty fallback, for the third time and the same reason. The fixture shipped
  // 30% on boarding, $25 on grooming, 50% on training and 25% over $200, and
  // any browser that had never opened the settings screen was taking those off
  // real cards. See the banner in lib/settings/deposits.ts.
  deposit_rules: { schema: depositConfigSchema, fallback: NO_DEPOSITS },
  // ── VACCINATION REQUIREMENTS ───────────────────────────────────────────
  //
  // Which vaccines are required, of which species, for which services. This
  // was a module-level array spliced in place, so a facility's requirements
  // lived until the tab reloaded — and three screens read the shipped fixture
  // directly and never saw the facility's edits at all.
  //
  // The fallback KEEPS the shipped list, breaking the empty-fallback pattern
  // of the three domains above it. Deliberately: an unset fee fails safe, an
  // unset requirement fails open. See the banner in lib/settings/vaccinations.ts.
  vaccination_rules: {
    schema: vaccinationRulesSchema,
    fallback: SHIPPED_VACCINATION_RULES,
  },
  // ── ESTIMATE DEFAULTS ──────────────────────────────────────────────────
  //
  // Numbering, expiry, and whether a customer may accept an estimate
  // themselves. localStorage until 2026-09-05, so two staff sending estimates
  // from two machines produced two numbering schemes — and
  // `magicLinkExpiryHours` gave the same customer a different window
  // depending on who pressed send.
  estimate_settings: {
    schema: estimateSettingsSchema,
    fallback: DEFAULT_ESTIMATE_SETTINGS,
  },
  // ── INCIDENT REPORTING ─────────────────────────────────────────────────
  //
  // Who is told when an animal is hurt, whether a photo is required on a
  // critical report, and whether the medication given is charged for. A
  // facility policy, stored per browser until 2026-09-05: the front desk could
  // file a critical incident with no photo because the requirement lived on the
  // manager's laptop.
  incident_reporting: {
    schema: incidentReportingConfigSchema,
    fallback: DEFAULT_INCIDENT_REPORTING,
  },
  // ── YIPYY PAY ──────────────────────────────────────────────────────────
  //
  // The facility's payment preferences: which payout schedule their Clover
  // account is on, what Yipyy prints on a receipt, and — the one that touches
  // a customer's total — whether the card processing fee is absorbed by the
  // business or added to the invoice as a disclosed line.
  //
  // No credential lives here. The Clover tokens are in Vault behind
  // `private.payment_credentials`, and `facility_settings` is readable by every
  // member of the facility, so this row holds preferences only. See the
  // "deliberately not here" note at the foot of this file.
  //
  // The fallback absorbs the fee (`feePayer: "business"`), so a facility that
  // never opens the screen cannot be surcharging its customers on a default
  // nobody chose — the same rule as NO_TAX and NO_PRICING_RULES.
  yipyy_pay_config: { schema: yipyyPayConfigSchema, fallback: NO_YIPYY_PAY },

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

  // ── WORKFLOW AND DISPLAY ───────────────────────────────────────────────
  //
  // Lower stakes than the block above — these change what STAFF see and how a
  // day is shaped, not what a customer is charged. They are converted for the
  // same reason: they are decisions a facility makes, and every facility was
  // being handed one answer.
  //
  // The array domains store the WHOLE list. Each is edited as a list in its
  // screen (add a rule, delete a block), and per-item rows would need an
  // identity these types do not carry.
  evaluation_form_template: {
    schema: evaluationFormTemplateSchema,
    fallback: evaluationFormTemplate as EvaluationFormTemplate,
  },
  report_cards: {
    schema: reportCardConfigSchema,
    fallback: reportCardConfig as ReportCardConfig,
  },
  service_date_blocks: {
    schema: z.array(serviceDateBlockSchema),
    fallback: serviceDateBlocks as ServiceDateBlock[],
  },
  schedule_time_overrides: {
    schema: z.array(scheduleTimeOverrideSchema),
    fallback: scheduleTimeOverrides as ScheduleTimeOverride[],
  },
  drop_off_pick_up_overrides: {
    schema: z.array(dropOffPickUpOverrideSchema),
    fallback: dropOffPickUpOverrides as DropOffPickUpOverride[],
  },
  notification_toggles: {
    schema: z.array(notificationToggleSchema),
    fallback: notificationToggles as NotificationToggle[],
  },
  service_notification_defaults: {
    schema: z.array(serviceNotificationDefaultSchema),
    fallback: serviceNotificationDefaults as ServiceNotificationDefault[],
  },
  module_addons: {
    schema: z.array(moduleAddonSchema),
    fallback: moduleAddons as ModuleAddon[],
  },
  weather_rules: {
    schema: z.array(weatherWarningRuleSchema),
    fallback: weatherWarningRules as WeatherWarningRule[],
  },
  // ── WHAT A FACILITY PAYS ABOVE THE BASE RATE ───────────────────────────
  //
  // Overtime rules and the statutory-holiday list. Money, and the kind that is
  // owed to a PERSON rather than collected from a customer — so the fallback
  // being empty does not mean "nothing is owed", it means nobody has said, and
  // `payroll_summary` returns `overtime_configured` so a screen cannot present
  // an unconfigured run as a complete one. See the banner in
  // lib/settings/payroll.ts.
  //
  // `holidays` here IS the holiday-rate list the calendar draws — one list,
  // read by the roster and billed by payroll. It is not a third holiday
  // concept; see the same banner.
  payroll_config: { schema: payrollConfigSchema, fallback: NO_PAYROLL_RULES },

  // ── THE LOYALTY PROGRAMME ──────────────────────────────────────────────
  //
  // Tiers, earn rules, badges, reward types, referrals and the redemption
  // rate — everything the twelve screens under /facility/dashboard/loyalty
  // edit. It lived in `localStorage` under `loyalty-program-1` until
  // 2026-08-21: per browser, and under a facility id hardcoded to 1, so every
  // facility on the platform shared one key.
  //
  // The fallback is OFF and EMPTY, not the fixture's four-tier scheme.
  // Points are a liability a facility owes its customers, and one nobody
  // agreed to is not a default. See the banner in lib/settings/loyalty.ts,
  // which also says how much of this is validated and how much is not.
  loyalty_config: {
    schema: loyaltyConfigSchema,
    fallback: NO_LOYALTY_PROGRAM,
  },

  // How often each service is expected to come round again, and whether a
  // lapsed client for it may be written to. `configured: false` means nobody
  // has said — so the Lapsed list still computes, and nothing sends.
  rebook_config: { schema: rebookConfigSchema, fallback: NO_REBOOK_CONFIG },

  // Thresholds, windows and the apology-credit ceiling for review requests.
  // NOT the send delay (that is automation_rules.offset_minutes), NOT the
  // channels (review_channels), and emphatically NOT any switch that decides
  // who is shown a public review link.
  reputation_config: {
    schema: reputationConfigSchema,
    fallback: NO_REPUTATION_CONFIG,
  },

  // Quiet hours, the per-day send cap and how late a queued message may be.
  // Deliberately messaging-wide rather than reputation-scoped: a 4 a.m. booking
  // reminder is the same offence as a 4 a.m. review request.
  messaging_policy: {
    schema: messagingPolicySchema,
    fallback: NO_MESSAGING_POLICY,
  },

  // ── THE PHONE SYSTEM ───────────────────────────────────────────────────
  //
  // Four rows, not one, because the panel's Save writes every section and a
  // single row would let two staff editing different sections overwrite each
  // other — the same reason the module configs are separate. They also differ
  // enormously in stakes: one of them is a legal question.
  //
  // Calling's own `businessHours` is deliberately NOT a fifth domain. It
  // duplicated `business_hours` in a different shape and from a different
  // fixture, so a facility had two answers to "when are you open" and the
  // after-hours greeting followed the one nobody edited. The panel reads the
  // existing domain.
  //
  // No credential is here. See lib/settings/calling.ts and the note below.
  calling_number_prefs: {
    schema: callingNumberPrefsSchema,
    fallback: NO_CALLING_NUMBER,
  },
  calling_dispatch: {
    schema: callingDispatchSchema,
    fallback: DEFAULT_CALLING_DISPATCH,
  },
  // The fallback is recording OFF, and it is not a matter of taste. The
  // fixture ships `autoRecord: true`; inheriting it would have every facility
  // that never opened the screen recording its customers on a choice nobody
  // made — a criminal offence in a two-party jurisdiction, of which Quebec,
  // whose area code the demo data uses throughout, is one. Same rule as
  // NO_TAX. See the banner in lib/settings/calling.ts.
  calling_recording: {
    schema: callingRecordingSchema,
    fallback: NO_CALL_RECORDING,
  },
  // Missed-call auto-SMS and the facility's own call tags. Auto-SMS defaults
  // OFF for the NO_TAX reason again: on, it texts real customers from a number
  // the facility does not own.
  calling_follow_up: {
    schema: callingFollowUpSchema,
    fallback: NO_CALL_FOLLOW_UP,
  },
  // The facility's own call-tag vocabulary. A separate row from
  // calling_follow_up because the list saves as it is edited while everything
  // else on that panel waits for a Save button — sharing one would make a
  // rename race a Save. The fallback IS the fixture's eight, deliberately: an
  // empty taxonomy costs a facility something and a starting one costs nobody
  // anything, which is when copying a fixture is right.
  calling_tags: { schema: callingTagsSchema, fallback: DEFAULT_CALL_TAGS },
  // The menu a caller hears. Ships DISABLED with an EMPTY greeting, and both
  // halves matter: the only greeting available to default to is the fixture's
  // "Thank you for calling Yipyy", which names the platform rather than the
  // facility and is read aloud to whoever rings. An IVR enabled with nothing
  // to say answers a customer with silence. See lib/settings/ivr.ts.
  ivr_config: { schema: ivrSettingsSchema, fallback: NO_IVR },

  // ── GIFT CARDS ─────────────────────────────────────────────────────────
  //
  // Terms on money the business OWES. A gift card is a liability: somebody
  // paid for it and holds a claim, and these settings decide when that claim
  // dies, what it can be spent on, and how much can be spent without proving
  // ownership of the card.
  //
  // The panel's Save was `await new Promise(r => setTimeout(r, 1000))`
  // followed by a tick — a fake network delay, so it looked more convincing
  // than the calling panel's version of the same defect.
  //
  // The fallback has EXPIRY OFF, and that is the NO_TAX rule applied to
  // somebody else's money: Quebec's Consumer Protection Act prohibits expiry
  // on most gift cards, as do Ontario and BC, and the demo data uses a 514
  // number. A facility that never opens this screen must not be quietly
  // expiring cards its customers paid for. See lib/settings/gift-cards.ts.
  gift_card_config: {
    schema: giftCardConfigSchema,
    fallback: NO_GIFT_CARD_CONFIG,
  },

  // No exported schema for this one — it is a plain map of id -> hex, defined
  // in lib/operations-calendar rather than types/facility.
  service_color_overrides: {
    schema: z.object({
      services: z.record(z.string(), z.string()),
      statuses: z.record(z.string(), z.string()),
    }),
    fallback: { services: {}, statuses: {} },
  },
} as const;

// ── DELIBERATELY NOT HERE ────────────────────────────────────────────────
//
// `integrations` holds `accountSid` and `authToken` for Twilio, and
// `facility_settings` is readable by every member of the facility with a
// session. A credential belongs in Vault or the deployment environment — the
// pattern the Clover connection follows — never in a jsonb column with a broad
// read policy. Do not convert it by pattern-matching the entries above.
//
// `facilityHolidays` is read-only: the context exposes it and nothing writes
// it, so converting it would add a domain with no writer and change nothing
// until an editor exists. It becomes a domain on the day something can edit it.

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
