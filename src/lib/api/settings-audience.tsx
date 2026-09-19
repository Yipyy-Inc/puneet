"use client";

import { createContext, useContext, type ReactNode } from "react";

// ============================================================================
// Who is reading the facility's settings: its staff, or one of its customers.
//
// Every settings hook reads through one query. For staff it is
// /api/facility/settings; for a customer it is /api/customer/settings, which
// resolves the facility through their own client row. The staff route answers
// a customer with the DEMO facility (getFacilityContext falls back to it for a
// caller with no membership), so the customer booking wizard was quoting the
// demo facility's prices, deposits and schedules to every pet owner.
//
// Provided once, by SettingsProviderWrapper, so every hook under the customer
// portal switches together rather than one call site at a time.
// ============================================================================

export type SettingsAudience = "staff" | "customer";

const SettingsAudienceContext = createContext<SettingsAudience>("staff");

export function SettingsAudienceProvider({
  audience,
  children,
}: {
  audience: SettingsAudience;
  children: ReactNode;
}) {
  return (
    <SettingsAudienceContext.Provider value={audience}>
      {children}
    </SettingsAudienceContext.Provider>
  );
}

export function useSettingsAudience(): SettingsAudience {
  return useContext(SettingsAudienceContext);
}
