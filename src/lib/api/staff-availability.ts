"use client";

import { useQuery } from "@tanstack/react-query";

import type { StaffAvailability } from "@/lib/bookings/wizard/availability-types";

// ============================================================================
// When groomers or trainers can take an appointment of `minutes` — the
// booking wizard's "Groomer & time" and "Trainer & time" (the client's mock,
// 2026-10-01). Staff read through their own session; a customer through
// their client row, and is handed open start times only.
// ============================================================================

export type { StaffAvailability };

const EMPTY: StaffAvailability = { staff: [], days: [] };

const ROUTES = {
  grooming: {
    staff: "/api/grooming/availability",
    customer: "/api/customer/grooming/availability",
  },
  training: {
    staff: "/api/training/availability",
    customer: "/api/customer/training/availability",
  },
} as const;

export function useStaffAvailability(options: {
  kind: keyof typeof ROUTES;
  asCustomer: boolean;
  /** YYYY-MM-DD, the first day of the strip. */
  from: string;
  days: number;
  /** The whole appointment. */
  minutes: number;
  /** A customer's minimum notice, in hours. */
  noticeHours?: number;
  /** Bookings being rebooked (an edit): their time is not busy. */
  excludeBookingIds?: readonly string[];
  enabled: boolean;
}) {
  const params = new URLSearchParams({
    from: options.from,
    days: String(options.days),
    minutes: String(Math.max(1, Math.round(options.minutes))),
  });
  if (options.asCustomer && options.noticeHours) {
    params.set("notice", String(options.noticeHours));
  }
  if (!options.asCustomer && options.excludeBookingIds?.length) {
    params.set("exclude", options.excludeBookingIds.join(","));
  }
  const route = ROUTES[options.kind][options.asCustomer ? "customer" : "staff"];
  const url = `${route}?${params.toString()}`;

  return useQuery({
    queryKey: ["staff-availability", url],
    queryFn: async (): Promise<StaffAvailability> => {
      const response = await fetch(url);
      const body = (await response.json().catch(() => null)) as
        | (StaffAvailability & { error?: string })
        | null;
      if (!response.ok || !body) {
        throw new Error(body?.error ?? "Times could not be loaded.");
      }
      return body;
    },
    enabled: options.enabled && options.minutes > 0,
    // Other people book too: a time shown is a time worth re-asking about.
    staleTime: 30_000,
    placeholderData: (previous) => previous ?? EMPTY,
  });
}
