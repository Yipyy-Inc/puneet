"use client";

import { useQuery } from "@tanstack/react-query";

import type { EvaluationAvailability } from "@/lib/evaluations/availability-types";

// ============================================================================
// When an evaluation can start — the booking wizard's "Pick a date & time"
// (the client's mock, 2026-10-02). Staff read through their own session; a
// customer through their client row, and is handed starts and places left
// only, with evaluators by first name when the facility lets them choose.
// ============================================================================

export type { EvaluationAvailability };

export function useEvaluationAvailability(options: {
  asCustomer: boolean;
  /** YYYY-MM-DD, the first day of the strip. */
  from: string;
  days: number;
  pets: number;
  /** Bookings being rebooked (an edit): they hold no places. */
  excludeBookingIds?: readonly string[];
  enabled: boolean;
}) {
  const params = new URLSearchParams({
    from: options.from,
    days: String(options.days),
    pets: String(Math.max(1, options.pets)),
  });
  if (!options.asCustomer && options.excludeBookingIds?.length) {
    params.set("exclude", options.excludeBookingIds.join(","));
  }
  const route = options.asCustomer
    ? "/api/customer/evaluations/availability"
    : "/api/evaluations/availability";
  const url = `${route}?${params.toString()}`;

  return useQuery({
    queryKey: ["evaluation-availability", url],
    queryFn: async (): Promise<EvaluationAvailability> => {
      const response = await fetch(url);
      const body = (await response.json().catch(() => null)) as
        | (EvaluationAvailability & { error?: string })
        | null;
      if (!response.ok || !body) {
        throw new Error(body?.error ?? "Times could not be loaded.");
      }
      return body;
    },
    enabled: options.enabled,
    // Other people book too: a time shown is a time worth re-asking about.
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}
