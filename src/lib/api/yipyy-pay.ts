"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { YipyyPayConfig } from "@/lib/settings/yipyy-pay";

// ============================================================================
// The data behind the Yipyy Pay screens.
//
// Three things, deliberately kept apart because they change at different rates
// and fail in different ways:
//
//   useYipyyPayConfig    the facility's own preferences (facility_settings)
//   useYipyyPayOverview  account, merchant, payouts, activity (one route)
//   useTerminalAdmin     naming a terminal, and asking one if it is awake
//
// The overview is refetched on window focus because a facility authorises at
// Clover in another tab and comes back to this one — the same reason the old
// Clover card did it.
// ============================================================================

export interface YipyyPayConnection {
  connected: boolean;
  status: "pending" | "connected" | "revoked" | "error" | "none";
  merchantId: string | null;
  environment: string | null;
  publicApiKey: string | null;
  currency: string | null;
  country: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

export interface YipyyPayMerchant {
  name: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
}

export interface YipyyPayPayout {
  takenOn: string;
  amountCents: number;
  transactions: number;
  expectedOn: string;
}

export interface YipyyPayActivity {
  id: string;
  at: string;
  description: string;
  amountCents: number;
  tipCents: number;
  status: "paid" | "refunded";
  cardBrand: string | null;
  cardLast4: string | null;
  entry: "card_present" | "card_not_present";
}

export interface YipyyPayOverview {
  ambiguous?: false;
  /** Whether the DEPLOYMENT has a Clover app at all — not this facility. */
  configured: boolean;
  facility: { name: string; slug: string };
  connection: YipyyPayConnection;
  merchant: YipyyPayMerchant | null;
  config: YipyyPayConfig;
  /** Real rows. One entry means the wizard hides its location control. */
  locations: { id: string; name: string; isPrimary: boolean }[];
  payouts: YipyyPayPayout[];
  activity: YipyyPayActivity[];
  hasActivity: boolean;
}

/** The caller administers several facilities and the hostname named none. */
export interface YipyyPayAmbiguous {
  ambiguous: true;
  choices: { id: string; name: string; slug: string }[];
  configured: boolean;
}

export type YipyyPayOverviewResult = YipyyPayOverview | YipyyPayAmbiguous;

export const yipyyPayQueries = {
  overview: () => ({
    queryKey: ["yipyy-pay", "overview"] as const,
    queryFn: async (): Promise<YipyyPayOverviewResult> => {
      const response = await fetch("/api/payments/yipyy-pay/overview");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as YipyyPayOverviewResult;
    },
  }),
};

/**
 * Account, merchant, payouts and recent activity.
 *
 * `refetchOnWindowFocus` is load-bearing rather than a default: the setup flow
 * sends the facility to Clover and back, and a stale "not connected" on return
 * would send them round again.
 */
export function useYipyyPayOverview() {
  return useQuery({
    ...yipyyPayQueries.overview(),
    refetchOnWindowFocus: true,
  });
}

/**
 * The facility's Yipyy Pay preferences.
 *
 * `configured` travels with the value for the same reason it does everywhere
 * else in settings: a facility that has never opened this screen and one that
 * opened it and chose to absorb the card fee must not look the same to the code
 * that decides what a customer is charged.
 */
export function useYipyyPayConfig(): {
  config: YipyyPayConfig;
  configured: boolean;
  isPending: boolean;
} {
  const { settings, isPending } = useFacilitySettings();
  return {
    config: settings.yipyy_pay_config.value,
    configured: settings.yipyy_pay_config.configured,
    isPending,
  };
}

/** Save the whole Yipyy Pay domain. The response is the STORED value. */
export function useSaveYipyyPayConfig() {
  const save = useSaveFacilitySetting();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: YipyyPayConfig) => {
      const saved = await save.mutateAsync({
        domain: "yipyy_pay_config",
        value,
      });
      return saved.value as YipyyPayConfig;
    },
    onSuccess: () => {
      // The overview route computes payout arrival dates from the schedule, so
      // it is now stale. Invalidated rather than patched: the arrival dates are
      // business-day arithmetic the server owns, and recomputing them in the
      // browser would be a second implementation free to disagree.
      void queryClient.invalidateQueries({ queryKey: ["yipyy-pay"] });
    },
  });
}

// ── Terminals ───────────────────────────────────────────────────────────────

export interface AdminTerminal {
  serial: string;
  label: string | null;
  model: string | null;
  isDefault: boolean;
  isActive: boolean;
  supported: boolean;
  support: "supported" | "unsupported" | "unknown";
  locationId: string | null;
}

export type TerminalListResult =
  | { kind: "terminals"; terminals: AdminTerminal[] }
  | { kind: "not_connected" | "unreadable" | "no_terminals"; terminals: [] };

export const terminalAdminQueries = {
  all: () => ({
    queryKey: ["yipyy-pay", "terminals"] as const,
    queryFn: async (): Promise<TerminalListResult> => {
      // Retired ones included: this is the only screen from which a facility
      // can bring one back, so hiding them here would make retiring one
      // irreversible.
      const response = await fetch(
        "/api/payments/clover/terminals?includeRetired=1",
      );
      if (!response.ok) throw new Error("Could not read your terminals.");
      return (await response.json()) as TerminalListResult;
    },
  }),
};

export function useAdminTerminals(enabled: boolean) {
  return useQuery({ ...terminalAdminQueries.all(), enabled });
}

/** Rename a terminal, retire it, or make it the counter's default. */
export function useSaveTerminal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      serial: string;
      label?: string;
      isDefault?: boolean;
      isActive?: boolean;
      locationId?: string | null;
    }) => {
      const response = await fetch("/api/payments/clover/terminals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "That terminal was not changed.");
      }
      return body as unknown as AdminTerminal;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["yipyy-pay", "terminals"],
      });
      // The checkout picker reads its own key and would otherwise keep showing
      // the old name until the next reload.
      void queryClient.invalidateQueries({ queryKey: ["clover-terminals"] });
    },
  });
}

export interface TerminalProbe {
  serial: string;
  kind: "ready" | "busy" | "asleep" | "unreachable";
  detail: string | null;
  checkedAt: string;
}

/**
 * Ask one terminal whether it is awake.
 *
 * Slow on purpose — see the banner on the route. The screen shows a spinner on
 * the card that asked, and the other cards stay usable.
 */
export function useProbeTerminal() {
  return useMutation({
    mutationFn: async (serial: string): Promise<TerminalProbe> => {
      const response = await fetch("/api/payments/clover/terminals/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "The terminal did not answer.");
      }
      return (await response.json()) as TerminalProbe;
    },
  });
}
