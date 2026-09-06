"use client";

import { useQuery } from "@tanstack/react-query";

import { noMobileApp } from "@/lib/settings/mobile-app";
import type { MobileAppConfig } from "@/lib/settings/mobile-app";

// ============================================================================
// The facility's app configuration, read as a CUSTOMER.
//
// Separate from `useMobileAppConfig()` for the same reason
// `useCustomerYipyyGo()` is separate: that one goes to /api/facility/settings,
// which resolves the facility from MEMBERSHIP, and `getFacilityContext()` falls
// back to the DEMO facility for a caller with none. A customer calling it would
// be offered another business's features.
//
// See the banner on src/app/api/customer/mobile-app/route.ts.
// ============================================================================

interface CustomerMobileApp {
  config: MobileAppConfig;
  configured: boolean;
}

export const customerMobileAppQueries = {
  detail: () => ({
    queryKey: ["customer", "mobile-app"] as const,
    queryFn: async (): Promise<CustomerMobileApp> => {
      const response = await fetch("/api/customer/mobile-app");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as CustomerMobileApp;
    },
  }),
};

/**
 * What this customer's facility offers through its app.
 *
 * `isPending` matters: the fallback has every feature OFF, so a screen that
 * renders through the pending state hides a camera feed the facility does offer
 * and then makes it appear. Wait for it before concluding a feature is absent.
 */
export function useCustomerMobileApp(): {
  config: MobileAppConfig;
  /** False means no row: this facility has not set up a mobile app. */
  configured: boolean;
  isPending: boolean;
} {
  const { data, isPending } = useQuery(customerMobileAppQueries.detail());
  return {
    // A fresh clone rather than the shared constant — a caller that edits what
    // it is handed would otherwise edit the fallback for every other caller.
    config: data?.config ?? noMobileApp(),
    configured: data?.configured ?? false,
    isPending,
  };
}
