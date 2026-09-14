import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  UNFINISHED_BOOKING_STAFF_SELECT,
  rowToUnfinishedBooking,
  unfinishedBookingStaffPatchSchema,
  type UnfinishedBookingRow,
} from "@/lib/api/mappers/unfinished-booking";
import type { UnfinishedBookingNote } from "@/types/unfinished-booking";

// ============================================================================
// Following up an unfinished booking: marking it contacted or recovered, and
// writing a note.
//
// edit_bookings, by RLS. A note is appended here, stamped with the signed-in
// member's name — never a name the request carries. The write ends in
// `.select()` so a refusal is a 403 (check:rls-writes). Nothing here sends a
// message: "contacted" records that somebody reached the customer.
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "You do not have permission to follow up bookings here.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = unfinishedBookingStaffPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a change to an unfinished booking." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("unfinished_bookings")
    .select("id, notes")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json(
      { error: "No such unfinished booking." },
      { status: 404 },
    );
  }

  const update: {
    status?: string;
    notes?: UnfinishedBookingNote[];
  } = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.note) {
    const viewer = await getViewer().catch(() => null);
    update.notes = [
      ...(((current as { notes: UnfinishedBookingNote[] | null }).notes ??
        []) as UnfinishedBookingNote[]),
      {
        id: crypto.randomUUID(),
        text: parsed.data.note,
        createdAt: new Date().toISOString(),
        staffName: viewer?.fullName ?? viewer?.email ?? "Staff",
      },
    ];
  }

  const { data, error } = await supabase
    .from("unfinished_bookings")
    .update(update as never)
    .eq("id", id)
    .select(UNFINISHED_BOOKING_STAFF_SELECT);

  if (error) return writeFailure(error, { duplicate: DENIED, denied: DENIED });
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return NextResponse.json(
    rowToUnfinishedBooking((data as unknown as UnfinishedBookingRow[])[0]),
  );
}
