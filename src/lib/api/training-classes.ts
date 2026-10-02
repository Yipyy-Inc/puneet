"use client";

import { useQuery } from "@tanstack/react-query";

import type { OfferedClass } from "@/lib/training/offered-classes";

/**
 * The training classes a booking may join, with the places left — staff
 * through their own facility, a customer through their client row (the
 * booking wizard's "Pick a class", 2026-10-01).
 */
export function useOfferedTrainingClasses(options: {
  asCustomer: boolean;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "training",
      "offered-classes",
      options.asCustomer ? "customer" : "staff",
    ] as const,
    queryFn: async (): Promise<OfferedClass[]> => {
      const response = await fetch(
        options.asCustomer
          ? "/api/customer/training/classes"
          : "/api/training/classes",
      );
      const body = (await response.json().catch(() => null)) as
        | OfferedClass[]
        | { error?: string }
        | null;
      if (!response.ok || !Array.isArray(body)) {
        throw new Error(
          (body && !Array.isArray(body) && body.error) ||
            "Classes could not be loaded.",
        );
      }
      return body;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}
