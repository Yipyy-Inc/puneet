"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BusinessProfile } from "@/types/facility";

// ============================================================================
// The facility's own name, contact details and address.
//
// ── NO FIXTURE FALLBACK, DELIBERATELY ─────────────────────────────────────
//
// Most factories here go through `liveFetch`, which serves mocks on a 401.
// This one does not. The mock IS the bug: every facility rendered "PawCare
// Facility / contact@pawcare.com", and a fallback would put it back the moment
// a request failed — on the screens that print a phone number to a customer.
//
// An error is the right answer. A wrong phone number on an estimate is worse
// than an empty one, because the customer dials it.
// ============================================================================

const EMPTY: BusinessProfile = {
  businessName: "",
  email: "",
  phone: "",
  website: "",
  address: { street: "", city: "", state: "", zipCode: "", country: "" },
  logo: "",
  description: "",
  socialMedia: {},
  preferences: {
    clockFormat: "12h",
    weightUnit: "lbs",
    temperatureUnit: "celsius",
  },
};

/**
 * A profile shaped object with every field blank.
 *
 * For the render that happens before the query resolves. Blank fields say "not
 * filled in yet", which may be true and is never misleading; a placeholder name
 * says something false about somebody's business.
 */
export function emptyBusinessProfile(): BusinessProfile {
  return structuredClone(EMPTY);
}

export const facilityProfileQueries = {
  detail: () => ({
    queryKey: ["facility", "profile"] as const,
    queryFn: async (): Promise<BusinessProfile> => {
      const response = await fetch("/api/facility/profile");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as BusinessProfile;
    },
  }),
};

/**
 * The profile, with a blank stand-in while it loads.
 *
 * One hook because nearly every caller wants exactly this: something to render
 * now, and the truth as soon as it arrives. `isPending` is returned too, so a
 * screen that must not show blanks (a printed estimate) can wait instead.
 */
export function useFacilityProfile() {
  const { data, isPending, error } = useQuery(facilityProfileQueries.detail());
  return { profile: data ?? emptyBusinessProfile(), isPending, error };
}

/** Save part of the profile. The response is the STORED row, not the request. */
export function useUpdateFacilityProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<BusinessProfile>) => {
      const response = await fetch("/api/facility/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const parsed = (await response.json().catch(() => null)) as
        | (BusinessProfile & { error?: string })
        | null;

      if (!response.ok) {
        // The route passes the database's own refusal through ("Not allowed to
        // edit this facility's details"), which a user can act on.
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return parsed as BusinessProfile;
    },
    onSuccess: (saved) => {
      // Seed rather than only invalidate: the name shows in several places at
      // once, and a refetch round trip would leave them briefly disagreeing.
      queryClient.setQueryData(["facility", "profile"], saved);
      void queryClient.invalidateQueries({ queryKey: ["facility", "profile"] });
    },
  });
}
