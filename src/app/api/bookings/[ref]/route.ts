import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  BOOKING_SELECT,
  bookingToRow,
  rowToBooking,
} from "@/lib/api/mappers/booking";
import { getFacilityContext } from "@/lib/api/facility-context";
import type { NewBooking } from "@/types/booking";

// ============================================================================
// A single booking, by its app-facing numeric ref.
//
// PATCH rather than PUT: callers send the fields they changed, and
// bookingToRow maps only what it was given. A full replace would blank every
// column the caller omitted — which for a booking means losing the feeding
// schedule because someone edited the price.
// ============================================================================

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
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

  const input = (await request.json()) as Partial<NewBooking>;
  const supabase = await createServerClient();

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // `details` is replaced wholesale rather than merged, so a partial update
  // carrying any long-tail field must carry all of them. Read the current row
  // first and merge, otherwise editing the price would drop the invoice.
  const { data: current } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("ref", bookingRef)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const existing = rowToBooking(current);
  const merged = { ...existing, ...input } as Partial<NewBooking>;

  const row = bookingToRow(merged, {
    facilityId: facility.facilityId,
    timeZone: facility.timeZone,
  });

  const { data: written, error } = await supabase
    .from("bookings")
    .update(row as never)
    .eq("ref", bookingRef)
    .select("id");

  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: denied ? "Not allowed to edit bookings." : error.message },
      { status: denied ? 403 : 500 },
    );
  }

  // An UPDATE filtered out by RLS is not an error in Postgres — it affects
  // zero rows and reports success. Without this check the route returns 200
  // and the unchanged booking, so a caller who is not allowed to edit gets
  // told their edit worked. A write that silently does nothing is worse than
  // one that fails loudly.
  if (!written || written.length === 0) {
    return NextResponse.json(
      { error: "Not allowed to edit this booking." },
      { status: 403 },
    );
  }

  const { data: updated } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("ref", bookingRef)
    .single();

  return NextResponse.json(updated ? rowToBooking(updated) : null);
}
