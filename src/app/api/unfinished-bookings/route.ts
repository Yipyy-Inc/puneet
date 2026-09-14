import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import {
  UNFINISHED_BOOKING_STAFF_SELECT,
  rowToUnfinishedBooking,
  type UnfinishedBookingRow,
} from "@/lib/api/mappers/unfinished-booking";
import type { UnfinishedBookingRecoverySend } from "@/types/unfinished-booking";

// ============================================================================
// The facility's unfinished bookings — what customers started and left.
//
// Staff with view_bookings read them (RLS). Scoped to the session's active
// facility, because RLS alone would merge every facility a platform admin can
// see (check:facility-scoped-reads). Newest first; a long tail of old
// abandonments is not a to-do list, so the last 500.
//
// Each carries its recovery message: the tick's outcome from the row, and what
// became of each message in the outbox (message_sends, source_kind
// booking_recovery) — a queued email can still be skipped for an unsubscribe
// or quiet hours, and staff are shown what actually happened.
// ============================================================================

export const dynamic = "force-dynamic";

type SendRow = {
  source_id: string | null;
  channel: "email" | "sms";
  status: string;
  sent_at: string | null;
  skip_reason: string | null;
};

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json([]);

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("unfinished_bookings")
    .select(UNFINISHED_BOOKING_STAFF_SELECT)
    .match(inFacility(scope))
    .order("abandoned_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const bookings = ((data ?? []) as unknown as UnfinishedBookingRow[]).map(
    rowToUnfinishedBooking,
  );

  const queuedIds = bookings
    .filter((b) => b.recovery?.outcome === "queued")
    .map((b) => b.id);
  if (queuedIds.length > 0) {
    const { data: sends } = await supabase
      .from("message_sends")
      .select("source_id, channel, status, sent_at, skip_reason")
      .match(inFacility(scope))
      .eq("source_kind", "booking_recovery")
      .in("source_id", queuedIds);

    const bySource = new Map<string, UnfinishedBookingRecoverySend[]>();
    for (const send of (sends ?? []) as SendRow[]) {
      if (!send.source_id) continue;
      const list = bySource.get(send.source_id) ?? [];
      list.push({
        channel: send.channel,
        status: send.status,
        sentAt: send.sent_at ?? undefined,
        skipReason: send.skip_reason ?? undefined,
      });
      bySource.set(send.source_id, list);
    }
    for (const booking of bookings) {
      if (booking.recovery) {
        booking.recovery.sends = bySource.get(booking.id) ?? [];
      }
    }
  }

  return NextResponse.json(bookings);
}
