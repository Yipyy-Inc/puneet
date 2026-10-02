"use client";

import { useQuery } from "@tanstack/react-query";

import { waiverQueries, type WaiverRow } from "@/lib/api/waivers";

// ============================================================================
// How many agreements a client has still to sign, for each service — the
// staff "2 unsigned agreements" chip on the service cards (the client's mock,
// 2026-10-01). The same rule as useBookingWaivers: the facility's active
// waivers that apply to the service, less the client's VALID signatures; a
// waiver naming no service, or "general", applies to every one.
//
// Staff only: a customer signs on Confirm, where the list is in front of them.
// ============================================================================

const NO_WAIVERS: WaiverRow[] = [];

function appliesTo(waiver: WaiverRow, service: string): boolean {
  return (
    waiver.services.length === 0 ||
    waiver.services.includes("general") ||
    waiver.services.includes(service)
  );
}

export function useUnsignedAgreements({
  clientRef,
  enabled,
}: {
  clientRef: number | undefined;
  enabled: boolean;
}): (service: string) => number {
  const { data: waivers = NO_WAIVERS } = useQuery({
    ...waiverQueries.active(),
    enabled,
  });
  const { data: signatures } = useQuery({
    ...waiverQueries.signaturesForClient(clientRef),
    enabled: enabled && clientRef !== undefined,
  });

  // Unknown until both have answered: no chip rather than a wrong one.
  if (!enabled || signatures === undefined) return () => 0;
  const signed = new Set(
    signatures
      .filter((s) => s.status === "valid" && s.waiverId)
      .map((s) => s.waiverId as string),
  );
  const needed = waivers.filter((w) => w.active && w.requiresSignature);
  return (service: string) =>
    needed.filter((w) => appliesTo(w, service) && !signed.has(w.id)).length;
}
