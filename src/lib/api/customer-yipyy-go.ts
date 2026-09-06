"use client";

import { useQuery } from "@tanstack/react-query";

import { yipyyGoOff } from "@/lib/settings/yipyy-go";
import type { YipyyGoSettings } from "@/lib/settings/yipyy-go";

// ============================================================================
// The Yipyy Go setup, read as a CUSTOMER.
//
// A separate hook from `useYipyyGoConfig()` on purpose, and the separation is
// the point rather than an inconvenience. That one goes to
// /api/facility/settings, which resolves the facility from the caller's
// MEMBERSHIP — and `getFacilityContext()` falls back to the DEMO facility for a
// caller who has none. A customer calling it would be shown a different
// business's form, its deadline and its fees, with no error anywhere.
//
// This one goes through the client row. See the banner on
// src/app/api/customer/yipyy-go/route.ts.
// ============================================================================

interface CustomerYipyyGo {
  config: YipyyGoSettings;
  configured: boolean;
}

export const customerYipyyGoQueries = {
  detail: () => ({
    queryKey: ["customer", "yipyy-go"] as const,
    queryFn: async (): Promise<CustomerYipyyGo> => {
      const response = await fetch("/api/customer/yipyy-go");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as CustomerYipyyGo;
    },
  }),
};

/**
 * What this customer's facility asks of them before an arrival.
 *
 * `isPending` matters more here than on most reads. Every caller uses this to
 * decide whether to ASK the customer for something, and "nothing is asked" and
 * "not loaded yet" both come back as a switched-off config — so a screen that
 * renders through the pending state tells somebody they are done when nobody
 * has looked yet. Wait for it before concluding no form is needed.
 */
export function useCustomerYipyyGo(): {
  config: YipyyGoSettings;
  /** False means the facility has no usable row: they have not set Yipyy Go up. */
  configured: boolean;
  isPending: boolean;
} {
  const { data, isPending } = useQuery(customerYipyyGoQueries.detail());
  return {
    // A fresh clone rather than the shared constant: a caller that edits what
    // it is given would otherwise edit the fallback for every other caller in
    // the tab.
    config: data?.config ?? yipyyGoOff(),
    configured: data?.configured ?? false,
    isPending,
  };
}
