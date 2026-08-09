"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SETTING_DOMAINS, type SettingDomain } from "@/lib/settings/domains";
import type { BookingRules, BusinessHours, TipConfig } from "@/types/facility";

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
}

function fallbackSettings(): FacilitySettings {
  return {
    business_hours: {
      value: structuredClone(SETTING_DOMAINS.business_hours.fallback),
      configured: false,
    },
    booking_rules: {
      value: structuredClone(SETTING_DOMAINS.booking_rules.fallback),
      configured: false,
    },
    tip_config: {
      value: structuredClone(SETTING_DOMAINS.tip_config.fallback),
      configured: false,
    },
  };
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
