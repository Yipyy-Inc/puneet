import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// One door for every arrival write.
//
// ── THE ROUTE DECIDES THE STATUS, THE FUNCTION DECIDES THE WORDS ──────────
//
// The same split `/api/boarding/stays` uses. Every `raise` inside
// `record_boarding_arrival` is already a sentence a person at a counter can act
// on ("This guest has no kennel yet. Assign one on Boarding Ops…"), so the
// message passes through untouched and only the HTTP status is mapped here.
//
// ── WHY THERE IS NO `deniedIfUntouched` IN THIS FILE ──────────────────────
//
// Because the refusal RAISES. The function is SECURITY DEFINER and checks
// `check_in_out` itself, so a caller without it gets a 42501 rather than an
// UPDATE that matches nothing and reports success — the failure mode measured
// on the live database in 20260806920000.
// ============================================================================

export type ArrivalAction = "check_in" | "check_out" | "reopen" | "revert";

const STATUS_BY_CODE: Record<string, number> = {
  // Not allowed to check guests in or out here.
  "42501": 403,
  // No such booking.
  P0002: 404,
  // The booking exists but is not ready: no kennel assigned.
  "55000": 409,
  // Not a boarding booking, cancelled, not checked in, wrong undo order.
  "22023": 422,
};

export async function recordArrival(
  bookingRef: number,
  action: ArrivalAction,
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("record_boarding_arrival", {
    p_booking_ref: bookingRef,
    p_action: action,
  });

  if (error) {
    const err = error as PostgrestError;
    return NextResponse.json(
      { error: err.message },
      { status: STATUS_BY_CODE[err.code] ?? 500 },
    );
  }

  return NextResponse.json({ bookingRef, status: data });
}
