import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  UNFINISHED_BOOKING_SELECT,
  rowToUnfinishedBooking,
  type UnfinishedBookingRow,
} from "@/lib/api/mappers/unfinished-booking";

// ============================================================================
// One of a customer's own unfinished bookings: read it to resume the form,
// mark it recovered once they have booked, or dismiss it.
//
// RLS admits only the client's own row (own_client_ids), so "not yours" and
// "not there" are the same 404. A customer may set `recovered` and nothing
// else — the trigger refuses any other status with 42501.
// ============================================================================

export const dynamic = "force-dynamic";

const NOT_FOUND = "No such unfinished booking.";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("unfinished_bookings")
    .select(UNFINISHED_BOOKING_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  return NextResponse.json(
    rowToUnfinishedBooking(data as unknown as UnfinishedBookingRow),
  );
}

/** They came back and booked. */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("unfinished_bookings")
    .update({ status: "recovered" })
    .eq("id", id)
    .select("id");
  if (error)
    return writeFailure(error, { duplicate: NOT_FOUND, denied: NOT_FOUND });
  const denied = deniedIfUntouched(data, NOT_FOUND);
  if (denied) return denied;
  return NextResponse.json({ id, status: "recovered" });
}

/** Dismissed: they do not want to finish it. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("unfinished_bookings")
    .delete()
    .eq("id", id)
    .select("id");
  if (error)
    return writeFailure(error, { duplicate: NOT_FOUND, denied: NOT_FOUND });
  const denied = deniedIfUntouched(data, NOT_FOUND);
  if (denied) return denied;
  return NextResponse.json({ id });
}
