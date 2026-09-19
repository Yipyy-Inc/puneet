import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/bookings/[ref]/history — what happened to one booking, newest first.
//
// The entries are written by the database, on every write to the booking
// (20260919142555_a_bookings_changes_record_themselves), and read here under
// audit_log's own policy: a member who may see the booking reads its history,
// and its price changes only with view_booking_financials. So this route
// decides nothing about who sees what — a caller who may not see the booking
// gets a 404 from the booking read, and one who may not see money simply
// receives no Financial entries.
//
// The values come back RAW (a status id, a timestamp, a number) so the screen
// can word them in the reader's language; audit_log's own mapper turns every
// value into a string, which is right for the audit screen and wrong here.
// ============================================================================

export const dynamic = "force-dynamic";

/** Newest first, and bounded: a booking's history is dozens of rows, not more. */
const LIMIT = 200;

export interface BookingHistoryEntry {
  id: string;
  at: string;
  who: string;
  category: "Data" | "Financial";
  action: string;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", bookingRef)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("audit_log")
    .select("id, occurred_at, user_name, category, action, changes")
    .eq("entity_type", "booking")
    .eq("entity_id", booking.id)
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries: BookingHistoryEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    at: row.occurred_at,
    who: row.user_name ?? "",
    category: row.category === "Financial" ? "Financial" : "Data",
    action: row.action,
    changes: Array.isArray(row.changes)
      ? (row.changes as BookingHistoryEntry["changes"])
      : [],
  }));
  return NextResponse.json(entries);
}
