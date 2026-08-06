"use client";

import { useQuery } from "@tanstack/react-query";

import type { Client } from "@/types/client";

// ============================================================================
// The signed-in customer's own record.
//
// THE SEAM THAT REPLACES `MOCK_CUSTOMER_ID`. That constant — `= 15`, Alice
// Johnson — was hardcoded in 35 customer-portal files, so every signed-in pet
// owner was shown the same fictional person's bookings, pets and household.
//
// Deliberately shaped like `useFacilityViewer()`: a hook that answers "who is
// asking" once, so the portal's screens stop each deciding for themselves. The
// employee portal learned this the hard way — three pages inside a shell read
// the identity cookie directly and disagreed with the shell around them (see
// src/lib/auth/employee-identity.ts).
//
// `resolved` is the part callers must respect. `client` is undefined both while
// the request is in flight and when the person genuinely has no record, and
// those need different screens: a spinner and "no bookings yet". Rendering the
// empty state during the first paint is the customer-portal version of briefly
// showing a colleague's name.
// ============================================================================

export interface CurrentCustomer {
  /** The caller's client record, or undefined while loading / when unlinked. */
  client: Client | undefined;
  /** True once the answer is known, whichever answer it is. */
  resolved: boolean;
  /** True when the caller is signed in but no client record is linked to them. */
  unlinked: boolean;
  isLoading: boolean;
}

export const currentCustomerKeys = {
  me: ["clients", "me"] as const,
};

export function useCurrentCustomer(): CurrentCustomer {
  const { data, isLoading, isSuccess, isError } = useQuery({
    queryKey: currentCustomerKeys.me,
    queryFn: async (): Promise<Client | null> => {
      const response = await fetch("/api/clients/me");

      // 404 is "signed in, no record yet" — an ordinary state, not a failure,
      // so it resolves to null rather than throwing. Anything else is a real
      // error and must not be flattened into "you have no bookings".
      if (response.status === 404) return null;

      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return (await response.json()) as Client;
    },
    // The link is established server-side on first read and does not change
    // within a session; refetching it on every window focus is pure noise.
    staleTime: 5 * 60_000,
    retry: false,
  });

  return {
    client: data ?? undefined,
    resolved: isSuccess || isError,
    unlinked: isSuccess && data === null,
    isLoading,
  };
}
