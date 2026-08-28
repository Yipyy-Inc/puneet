import "server-only";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Telling the automations engine that something happened.
//
// ── ONE IMPLEMENTATION, BECAUSE THERE ARE NOW SEVERAL EMITTERS ────────────
//
// `booking_created` was emitted inline from the bookings route, which was right
// while it was the only one. Check-out happens on two different routes —
// daycare and boarding keep separate attendance tables — and a third would make
// three copies of the same four decisions: emit idempotently, tolerate the
// duplicate, dispatch after the response, never let any of it fail the write.
//
// ── EVERY PART OF THIS IS BEST EFFORT, ON PURPOSE ─────────────────────────
//
// A dog that has been checked out HAS been checked out. If the confirmation
// cannot be queued, the answer is a log line, not a 500 handed to somebody
// standing at a counter with the dog's owner in front of them. The same
// argument the bookings route makes, and the reason `booking_created` is
// emitted after the RPC rather than from a trigger on the table: an AFTER
// INSERT trigger that raises fails the booking.
//
// ── THE DEDUPE KEY IS THE OCCASION, NOT THE MOMENT ────────────────────────
//
// `check_out:<booking>` and not a timestamp. Checking a dog out, reopening the
// visit and checking them out again is one check-out as far as the customer is
// concerned, and they should not get two emails about it.
// ============================================================================

export type EmittableTrigger =
  | "booking_created"
  | "check_in"
  | "check_out"
  | "payment_received";

/**
 * Record an event and dispatch it once the response is on its way.
 *
 * Returns the event id when one was created, and null when the event already
 * existed or could not be written — neither of which the caller should treat as
 * a failure of the thing it was actually doing.
 */
export async function emitAutomationEvent(
  supabase: SupabaseClient,
  input: {
    facilityId: string;
    kind: EmittableTrigger;
    /** The thing this happened to. One event per occasion. */
    dedupeKey: string;
    clientId?: string | null;
    bookingId?: string | null;
    petId?: string | null;
    locationId?: string | null;
  },
): Promise<number | null> {
  let eventId: number | null = null;

  try {
    const { data, error } = await supabase.rpc("emit_automation_event", {
      p_facility_id: input.facilityId,
      p_kind: input.kind,
      p_dedupe_key: input.dedupeKey,
      ...(input.clientId ? { p_client_id: input.clientId } : {}),
      ...(input.bookingId ? { p_booking_id: input.bookingId } : {}),
      ...(input.petId ? { p_pet_id: input.petId } : {}),
      ...(input.locationId ? { p_location_id: input.locationId } : {}),
    });

    if (error) {
      console.warn(`[automations] emit ${input.kind} failed:`, error.message);
      return null;
    }
    // NULL means the event already existed — a retry, or a second check-out of
    // the same visit. Whoever created it dispatches it.
    eventId = (data as number | null) ?? null;
  } catch (failure) {
    console.warn(`[automations] emit ${input.kind} threw:`, failure);
    return null;
  }

  if (eventId === null) return null;

  // `after()` so the person at the counter waits for the check-out and not for
  // Resend. The row is the durable part: if this process dies first, the event
  // is still unclaimed.
  const id = eventId;
  after(async () => {
    const { dispatchEvent } = await import("@/lib/messaging/dispatch");
    const result = await dispatchEvent(id);
    if (result.problems.length > 0) {
      console.warn("[automations] dispatch problems:", result.problems);
    }
  });

  return eventId;
}

/**
 * The facility, client and location a booking belongs to.
 *
 * Read through the CALLER'S client, so a request that could not see the booking
 * cannot emit an event about it. Returns null rather than throwing — see the
 * best-effort note above.
 */
export async function bookingEventContext(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{
  facilityId: string;
  clientId: string | null;
  locationId: string | null;
} | null> {
  const { data } = await supabase
    .from("bookings")
    .select("facility_id, client_id, location_id")
    .eq("id", bookingId)
    .maybeSingle();

  const row = data as {
    facility_id?: string;
    client_id?: string | null;
    location_id?: string | null;
  } | null;

  if (!row?.facility_id) return null;
  return {
    facilityId: row.facility_id,
    clientId: row.client_id ?? null,
    locationId: row.location_id ?? null,
  };
}
