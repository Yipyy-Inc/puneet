"use client";

import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A booking's service by name, in the viewer's language.
//
// `bookings.service` is stored as a lowercase id ("boarding"), and screens
// showed it with a capital letter stuck on — English on a French screen. The
// built-in services have names in both catalogues; a facility's own custom
// service keeps the name it was given, which no locale layer touches (§5q).
// ============================================================================

const KEYS: Record<string, string> = {
  daycare: "daycare",
  boarding: "boarding",
  grooming: "grooming",
  training: "training",
  evaluation: "evaluation",
};

export function useServiceName() {
  const { t } = useStaffText("serviceNames");
  return (service: string): string => {
    const key = KEYS[service.toLowerCase()];
    return key ? t(key) : service;
  };
}
