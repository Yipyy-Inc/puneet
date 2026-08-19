"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
} from "@/types/facility";
import type { TaxConfig } from "@/lib/settings/tax";

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
  tip_config: SettingState<TipConfig>;
  tax_config: SettingState<TaxConfig>;
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
