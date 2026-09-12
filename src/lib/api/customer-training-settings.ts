"use client";

import { fetchCustomerTrainingSettings } from "@/lib/api/training-book";

// ============================================================================
// The training a CUSTOMER is offered, read as a customer.
//
// Separate from trainingQueries.moduleSettings / trainingPathways /
// disciplines on purpose: those go to /api/facility/settings, which resolves
// the facility from a staff membership, so a customer was always shown the
// shipped defaults. This goes through the client row — see the banner on
// src/app/api/customer/training-settings/route.ts. One request serves all
// three; each screen picks its part with `select`.
// ============================================================================

export const customerTrainingSettingsQueries = {
  all: () => ({
    queryKey: ["customer", "training-settings"] as const,
    queryFn: fetchCustomerTrainingSettings,
  }),
};
