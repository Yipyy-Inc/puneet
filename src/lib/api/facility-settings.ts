"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GiftCardConfig } from "@/lib/settings/gift-cards";
import type { IvrSettings } from "@/lib/settings/ivr";
import type {
  CallingDispatch,
  CallingFollowUp,
  CallingNumberPrefs,
  CallingRecording,
  CallingTags,
} from "@/lib/settings/calling";
import { SETTING_DOMAINS, type SettingDomain } from "@/lib/settings/domains";
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
import type { PricingRules } from "@/lib/settings/pricing";
import type {
  DepositConfig,
  DepositRefundPolicy,
  DepositRuleSet,
} from "@/lib/settings/deposits";
import type { VaccinationRules } from "@/lib/settings/vaccinations";
import type { TaxConfig } from "@/lib/settings/tax";
import type { PayrollConfig } from "@/lib/settings/payroll";
import type { RebookConfig } from "@/lib/settings/rebook";
import type { ReputationConfig } from "@/lib/settings/reputation";
import type { MessagingPolicy } from "@/lib/settings/messaging-policy";
import type { LoyaltyProgramConfig } from "@/lib/settings/loyalty";
import type { YipyyPayConfig } from "@/lib/settings/yipyy-pay";

// ============================================================================
// A facility's own settings, per domain.
//
// ── NO FIXTURE FALLBACK ───────────────────────────────────────────────────
//
// Not via `liveFetch`. The mock IS the bug being fixed: every facility rendered
// one shared set of opening hours and booking rules, and a fallback would
// restore exactly that the first time a request failed — on values that decide
// what a customer is offered and what a deposit costs.
//
// `configured` travels with each value so a screen can distinguish "this is
// what we assume" from "this is what they chose". Losing that distinction is
// how the fixture looked like data for so long.
// ============================================================================

export interface SettingState<T> {
  value: T;
  /** False means no row: this is the app's default, not the facility's choice. */
  configured: boolean;
}

export interface FacilitySettings {
  business_hours: SettingState<BusinessHours>;
  booking_rules: SettingState<BookingRules>;
  grooming_scheduling: SettingState<GroomingScheduling>;
  /** One set of books for the business, or one per branch. */
  accounting_structure: SettingState<AccountingStructure>;
  /** The cross-location toggles HQ Settings edits. */
  network_policy: SettingState<NetworkPolicy>;
  tip_config: SettingState<TipConfig>;
  /** Who a tip is owed to once collected. Read by the attribution trigger too. */
  tip_attribution: SettingState<TipAttribution>;
  tax_config: SettingState<TaxConfig>;
  /** Overtime rule + statutory holidays. `configured: false` = nobody has said. */
  payroll_config: SettingState<PayrollConfig>;
  /**
   * Tiers, earn rules, badges, referrals, the redemption rate.
   *
   * `configured: false` means no programme has been set up — which is NOT the
   * same as one that is switched off, and the loyalty screens say which.
   */
  loyalty_config: SettingState<LoyaltyProgramConfig>;
  pricing_rules: SettingState<PricingRules>;
  /** What is asked for up front, and what happens to it on a cancellation. */
  deposit_rules: SettingState<DepositConfig>;
  /** Which vaccines are required, of which species, for which services. */
  vaccination_rules: SettingState<VaccinationRules>;
  /**
   * Expected visit frequency per service, and whether lapsed clients for it may
   * be messaged. `configured: false` means the Lapsed list is computed from the
   * app's assumed intervals and NOTHING may be sent off the back of it.
   */
  rebook_config: SettingState<RebookConfig>;
  /**
   * Review-request thresholds and windows.
   *
   * `configured: false` is the ordinary state and changes nothing: the review
   * rule ships DISABLED, so a facility that has never opened this screen sends
   * nothing and these numbers only describe how the ask would behave.
   */
  reputation_config: SettingState<ReputationConfig>;
  /**
   * Quiet hours, the per-day send cap and how late a queued message may be.
   *
   * MESSAGING-WIDE, not per feature: changing it changes every automation and
   * every workflow step. The defaults are deliberately inert except
   * `maxLatenessHours`, which is a correctness rule rather than a preference.
   */
  messaging_policy: SettingState<MessagingPolicy>;
  /**
   * Yipyy Pay preferences.
   *
   * `configured: false` means nobody has walked the setup wizard — which is
   * NOT the same as a facility that has, and chose to absorb the card fee.
   * The Yipyy Pay screens read `setupCompletedAt` to tell those apart.
   */
  yipyy_pay_config: SettingState<YipyyPayConfig>;
  booking_flow: SettingState<FacilityBookingFlowConfig>;
  daycare_config: SettingState<ModuleConfig>;
  boarding_config: SettingState<ModuleConfig>;
  grooming_config: SettingState<ModuleConfig>;
  training_config: SettingState<ModuleConfig>;
  evaluation_config: SettingState<EvaluationConfig>;
  evaluation_report_card: SettingState<EvaluationReportCardConfig>;
  evaluation_form_template: SettingState<EvaluationFormTemplate>;
  report_cards: SettingState<ReportCardConfig>;
  service_date_blocks: SettingState<ServiceDateBlock[]>;
  schedule_time_overrides: SettingState<ScheduleTimeOverride[]>;
  drop_off_pick_up_overrides: SettingState<DropOffPickUpOverride[]>;
  notification_toggles: SettingState<NotificationToggle[]>;
  service_notification_defaults: SettingState<ServiceNotificationDefault[]>;
  module_addons: SettingState<ModuleAddon[]>;
  weather_rules: SettingState<WeatherWarningRule[]>;
  service_color_overrides: SettingState<{
    services: Record<string, string>;
    statuses: Record<string, string>;
  }>;
  /** What outbound calls present as the caller ID. Not a provisioned line. */
  calling_number_prefs: SettingState<CallingNumberPrefs>;
  /** How a call reaches somebody: ring mode, alerts, forwarding, ring duration. */
  calling_dispatch: SettingState<CallingDispatch>;
  /**
   * Recording, retention, the compliance announcement, transcription and AI
   * summaries.
   *
   * `configured: false` means recording is OFF because nobody has turned it on
   * — not because a facility chose to. Both read the same on this screen and
   * they are not the same fact; recording somebody without consent is a
   * criminal offence in a two-party jurisdiction.
   */
  calling_recording: SettingState<CallingRecording>;
  /** Missed-call auto-SMS and its template. */
  calling_follow_up: SettingState<CallingFollowUp>;
  /**
   * The facility's call-tag vocabulary.
   *
   * `configured: false` means nobody has edited the list, so these are the
   * eight the product ships with — which is why the tags editor must not write
   * until it has loaded, or it would save the defaults as though they were a
   * choice and lose whatever a colleague had set.
   */
  calling_tags: SettingState<CallingTags>;
  /**
   * Gift-card terms: expiry, PIN threshold, redemption scope, wallet rules.
   *
   * `configured: false` means nobody has set terms — so cards do NOT expire,
   * which is both the safe default and the legally required one in several
   * jurisdictions. A screen must not present that as a choice the facility
   * made, any more than it may present an unset tax rate as zero tax.
   */
  gift_card_config: SettingState<GiftCardConfig>;
  /**
   * The phone menu callers hear.
   *
   * `configured: false` means it is OFF with nothing to say — not that a
   * facility chose a silent IVR. Nothing may present it as live: see
   * `ivrIsAnswerable`.
   */
  ivr_config: SettingState<IvrSettings>;
}

/**
 * Every domain's documented default.
 *
 * Built from SETTING_DOMAINS rather than listed by hand: the list grows every
 * time a domain is converted, and a hand-written copy is one that silently
 * omits the newest one — which would hand a screen `undefined` where it expects
 * a config object.
 */
function fallbackSettings(): FacilitySettings {
  return Object.fromEntries(
    Object.entries(SETTING_DOMAINS).map(([domain, spec]) => [
      domain,
      { value: structuredClone(spec.fallback), configured: false },
    ]),
  ) as unknown as FacilitySettings;
}

export const facilitySettingsQueries = {
  all: () => ({
    queryKey: ["facility", "settings"] as const,
    queryFn: async (): Promise<FacilitySettings> => {
      const response = await fetch("/api/facility/settings");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as FacilitySettings;
    },
  }),
};

/**
 * The facility's settings, with the documented defaults while they load.
 *
 * The defaults are returned rather than `undefined` because the booking modals
 * that read this cannot render half a form — and they are the SAME defaults the
 * server would report for an unconfigured facility, so nothing changes shape
 * when the request lands.
 */
export function useFacilitySettings() {
  const { data, isPending, error } = useQuery(facilitySettingsQueries.all());
  return { settings: data ?? fallbackSettings(), isPending, error };
}

/**
 * The facility's surcharges and discounts.
 *
 * A named hook rather than five call sites reaching into
 * `settings.pricing_rules.value` themselves, because these decide what a
 * customer is CHARGED — and `configured` has to travel with them. A screen
 * showing no late fee because the facility chose none, and one showing no late
 * fee because the settings have not loaded, must not look the same to the code
 * that puts a number on a bill.
 */
export function usePricingRules(): {
  rules: PricingRules;
  /** False means no row: no fees at all, not "we could not tell". */
  configured: boolean;
  isPending: boolean;
} {
  const { settings, isPending } = useFacilitySettings();
  return {
    rules: settings.pricing_rules.value,
    configured: settings.pricing_rules.configured,
    isPending,
  };
}

/**
 * The facility's deposit terms.
 *
 * A named hook rather than four call sites reaching into
 * `settings.deposit_rules.value` themselves, for the same reason
 * `usePricingRules` is one: these decide what a customer is ASKED FOR, and
 * `isPending` has to travel with them.
 *
 * That is not defensive. Until 2026-09-05 the readers called
 * `loadDepositRules()`, which returned the SEED FILE's rules synchronously
 * whenever localStorage was empty — so a booking opened before anything had
 * loaded still quoted 30% on boarding, confidently, on a number no business
 * had agreed to. A screen asking for no deposit because the facility
 * configured none, and one asking for no deposit because the settings have not
 * arrived, must not look the same to the code putting a figure in front of a
 * customer.
 */
export function useDepositRules(): {
  rules: DepositRuleSet;
  refundPolicy: DepositRefundPolicy;
  /** False means no row: this facility asks for nothing, not "we cannot tell". */
  configured: boolean;
  isPending: boolean;
} {
  const { settings, isPending } = useFacilitySettings();
  return {
    rules: settings.deposit_rules.value.rules,
    refundPolicy: settings.deposit_rules.value.refundPolicy,
    configured: settings.deposit_rules.configured,
    isPending,
  };
}

/**
 * The vaccines this facility requires.
 *
 * A named hook because six screens read these and three of them used to read
 * the SHIPPED FIXTURE instead — so a facility could configure a requirement,
 * see it on two screens, and have the customer's own booking flow check
 * something else entirely.
 *
 * `configured` says whether anybody has reviewed the list. Unlike the money
 * domains the fallback is not empty, so `configured: false` does NOT mean "no
 * requirements" — it means "the standard list, unreviewed". A screen that wants
 * to say so needs the flag; one that just enforces the rules does not.
 */
export function useVaccinationRules(): {
  rules: VaccinationRules;
  configured: boolean;
  isPending: boolean;
} {
  const { settings, isPending } = useFacilitySettings();
  return {
    rules: settings.vaccination_rules.value,
    configured: settings.vaccination_rules.configured,
    isPending,
  };
}

/** Save one whole domain. The response is the STORED value. */
export function useSaveFacilitySetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { domain: SettingDomain; value: unknown }) => {
      const response = await fetch("/api/facility/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        domain?: string;
        value?: unknown;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return parsed as {
        domain: SettingDomain;
        value: unknown;
        configured: true;
      };
    },
    onSuccess: (saved) => {
      // Seed the one domain rather than invalidating everything: the booking
      // modals read these too, and a refetch round trip would leave the screen
      // that just saved disagreeing with the one beside it.
      queryClient.setQueryData(
        ["facility", "settings"],
        (current: FacilitySettings | undefined) => ({
          ...(current ?? fallbackSettings()),
          [saved.domain]: { value: saved.value, configured: true },
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ["facility", "settings"],
      });
    },
  });
}
