"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { waiverQueries, type WaiverRow } from "@/lib/api/waivers";

// ============================================================================
// The waivers a booking still needs signed — the facility's, for this client.
//
// The New Booking form read `digitalWaivers` and `waiverSignatures` from the
// sample data, and took ANY signature in that list as signed — nobody's in
// particular. So whether Confirm was blocked depended on the demo file, never
// on the facility's waivers or on what this client had actually signed, and a
// signature captured in the form was a line in React state.
//
// It asks Postgres now: the facility's active waivers that apply to the
// service, minus this client's VALID signatures (`status` is computed on the
// server, so a lapsed one counts as unsigned).
// ============================================================================

const NO_WAIVERS: WaiverRow[] = [];

/** A waiver with no services applies to every service, like "general". */
function appliesTo(waiver: WaiverRow, service: string): boolean {
  return (
    waiver.services.length === 0 ||
    waiver.services.includes("general") ||
    waiver.services.includes(service)
  );
}

export function useBookingWaivers(input: {
  service: string;
  /** The client's ref. Undefined until one is chosen. */
  clientRef: number | undefined;
  /** A customer reads their own signatures; staff read the client's. */
  asCustomer: boolean;
}) {
  const { data: waivers = NO_WAIVERS, isPending: waiversPending } = useQuery(
    waiverQueries.active(),
  );
  const mine = useQuery({
    ...waiverQueries.mine(),
    enabled: input.asCustomer,
  });
  const theirs = useQuery({
    ...waiverQueries.signaturesForClient(input.clientRef),
    enabled: !input.asCustomer && input.clientRef !== undefined,
  });
  const signatures = input.asCustomer ? mine.data : theirs.data;
  const signaturesPending = input.asCustomer
    ? mine.isPending
    : input.clientRef !== undefined && theirs.isPending;

  const { applicable, pending } = useMemo(() => {
    const signed = new Set(
      (signatures ?? [])
        .filter((s) => s.status === "valid" && s.waiverId)
        .map((s) => s.waiverId as string),
    );
    const applicable = waivers.filter(
      (w) => w.active && w.requiresSignature && appliesTo(w, input.service),
    );
    return {
      applicable,
      pending: applicable.filter((w) => !signed.has(w.id)),
    };
  }, [waivers, signatures, input.service]);

  return {
    applicable,
    pending,
    /** Still loading: not "nothing to sign". */
    loading: waiversPending || signaturesPending,
  };
}
