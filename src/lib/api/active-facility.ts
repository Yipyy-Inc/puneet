"use client";

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// The facility this request resolved to, as the browser can know it.
//
// `/api/facility/switch` answers it (`activeId`) alongside the caller's own
// facilities — the facility switcher already reads it, under the same key, so
// this shares that one request rather than making another. Switching facility
// reloads the page, so within a page the answer does not change.
//
// For keying what a viewer keeps in THIS browser per facility — a saved
// calendar view, a display setting — never for deciding what a request may
// read or write: the server takes the facility from the session.
// ============================================================================

interface MyFacilities {
  activeId: string | null;
  facilities: { id: string; name: string; slug: string }[];
}

export const activeFacilityQueries = {
  mine: () => ({
    queryKey: ["facility", "switch"] as const,
    queryFn: async (): Promise<MyFacilities> => {
      const res = await fetch("/api/facility/switch");
      if (!res.ok) return { activeId: null, facilities: [] };
      return (await res.json()) as MyFacilities;
    },
    staleTime: 5 * 60 * 1000,
  }),
};

/** The active facility's id, or null until it is known (or when signed out). */
export function useActiveFacilityId(): string | null {
  const { data } = useQuery(activeFacilityQueries.mine());
  return data?.activeId ?? null;
}
