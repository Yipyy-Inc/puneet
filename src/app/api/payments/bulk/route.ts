import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";

// ============================================================================
// Settling several bookings in one go.
//
// ── IT DOES NOT ACCEPT AMOUNTS ─────────────────────────────────────────────
//
// Only which bookings. `settle_bookings` (20260806800000) reads each balance
// from the ledger and returns what it actually took, so a screen that has been
// open while somebody else took a payment cannot overcharge — and the receipt
// printed afterwards is printed from THIS response rather than from what the
// screen hoped.
//
// ── ONE RPC, BECAUSE IT IS ONE TRANSACTION ─────────────────────────────────
//
// N payments recorded or none. A loop of N POSTs from the browser can stop
// halfway, and the half that survives is a customer charged for three of five
// bookings with nobody able to say which.
// ============================================================================

export const dynamic = "force-dynamic";

/** What the dialog offers, in the ledger's vocabulary. */
const TENDER: Record<string, string> = {
  card: "new-card",
  cash: "cash",
  terminal: "terminal",
  e_transfer: "e-transfer",
};

interface BulkInput {
  bookingRefs?: number[];
  method?: string;
  receiptChannels?: string[];
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as BulkInput | null;
  const method = TENDER[body?.method ?? ""];
  if (!method) {
    return NextResponse.json(
      { error: "That is not a payment method." },
      { status: 422 },
    );
  }

  const refs = (body?.bookingRefs ?? []).filter((r) => Number.isFinite(r));
  if (refs.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one booking to settle." },
      { status: 422 },
    );
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  // Resolved through a read the caller must be able to make, so a booking they
  // cannot see is "no such booking" rather than an RLS error inside the RPC.
  const { data: rows } = await supabase
    .from("bookings")
    .select("id, ref")
    .in("ref", refs);

  const found = (rows ?? []) as { id: string; ref: number }[];
  if (found.length !== refs.length) {
    // Named rather than counted: "3 of 5" leaves the operator guessing which
    // two, on a screen they are about to take money on.
    const missing = refs.filter((r) => !found.some((f) => f.ref === r));
    return NextResponse.json(
      { error: `No such booking: ${missing.join(", ")}.` },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.rpc("settle_bookings", {
    p_facility_id: context.facilityId,
    p_method: method,
    p_booking_ids: found.map((f) => f.id),
    p_receipt_channels: body?.receiptChannels ?? [],
  });

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to take payments at this facility.",
      duplicate: "Those payments have already been recorded.",
    });
  }

  // Bookings that owed nothing are absent, deliberately (Decision 2). The
  // caller compares this against what it sent and says so.
  const settled = (data ?? []) as unknown as {
    bookingRef: number;
    amount: number;
  }[];
  return NextResponse.json(
    {
      settled,
      total: settled.reduce((sum, s) => sum + Number(s.amount), 0),
    },
    { status: 201 },
  );
}
