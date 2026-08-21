import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Spending a reward, exactly once.
//
// ── WHY THIS IS ITS OWN ROUTE AND NOT A PATCH ─────────────────────────────
//
// A PATCH would invite a caller to send `{"status": "used"}`, and any caller
// who could send that could also send it a second time, or send it back to
// `active`. Consuming is not an edit to a row; it is an event that may happen
// once, and naming it that way is the difference.
//
// ── AND WHY THE GUARANTEE IS NOT IN THIS FILE ─────────────────────────────
//
// `consume_loyalty_voucher` updates WHERE the voucher is still active and not
// past expiry, and raises when that matches nothing. Two tills scanning the
// same reward at the same moment both arrive here; one row changes, and the
// other caller is told the reward is spent.
//
// A read-then-write in this route could not promise that however carefully it
// was written — between the read and the write is exactly where the second till
// gets its answer. What it replaces did not even try: `consumeRedemption()`
// spliced an in-memory array, so a refresh brought the voucher back.
//
// ── NO FACILITY CONTEXT IS READ HERE, DELIBERATELY ────────────────────────
//
// The voucher's own row says which facility it belongs to, and the function
// checks `take_payment` (or `marketing_manage_loyalty`) against THAT. Taking
// the facility from the session instead would be the same answer on the happy
// path and a way to spend another facility's voucher on the unhappy one.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    bookingRef?: number | string;
  } | null;

  const supabase = await createServerClient();

  // ── WHICH BILL IT WAS SPENT ON ──────────────────────────────────────────
  //
  // A `ref`, because that is what the checkout screens hold — the same reason
  // the accounts route takes a client ref. Resolved here rather than sent as a
  // uuid, so no screen has to carry an id it never displays.
  //
  // Resolution failing is NOT fatal: the reward is still spent, and recording
  // it against no booking is better than refusing a payment because a lookup
  // missed. RLS narrows the read to bookings this caller can see anyway.
  let bookingId: string | undefined;
  if (body?.bookingRef !== undefined && body.bookingRef !== null) {
    const n = Number(body.bookingRef);
    if (Number.isFinite(n)) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("ref", n)
        .maybeSingle();
      bookingId = (booking as { id: string } | null)?.id ?? undefined;
    }
  }

  const { data, error } = await supabase.rpc("consume_loyalty_voucher", {
    p_voucher_id: id,
    p_booking_id: bookingId,
  });

  if (error) {
    const denied = error.message.includes("permission");
    // "Already used, or expired" is a 409: the request was well formed and the
    // world had moved on. A 400 would read as "you sent something wrong".
    const spent = error.message.includes("already been used");
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : spent ? 409 : 400 },
    );
  }

  const row = data as unknown as {
    id: string;
    status: string;
    used_at: string | null;
    used_on_booking_id: string | null;
  };

  return NextResponse.json({
    voucher: {
      id: row.id,
      status: row.status,
      usedAt: row.used_at,
      usedOnBookingId: row.used_on_booking_id,
    },
  });
}
