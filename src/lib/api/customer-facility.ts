"use client";

import { useQuery } from "@tanstack/react-query";

import type { CustomerFacility } from "@/app/api/customer/facility/route";

// ============================================================================
// The business a signed-in customer belongs to — its name, logo and how to
// reach it — through their own client row (/api/customer/facility).
//
// Customer screens read `businessProfile` from `@/data/settings` for this, so
// every pet owner was told their estimate came from "Example Pet Care
// Facility". Same query key as the invoice template, so the two share one
// request.
// ============================================================================

export function useCustomerFacility(): CustomerFacility | undefined {
  const { data } = useQuery({
    queryKey: ["customer", "facility"],
    queryFn: async (): Promise<CustomerFacility> => {
      const response = await fetch("/api/customer/facility");
      if (!response.ok) throw new Error("Could not load your facility.");
      return (await response.json()) as CustomerFacility;
    },
    staleTime: 5 * 60_000,
  });
  return data;
}
