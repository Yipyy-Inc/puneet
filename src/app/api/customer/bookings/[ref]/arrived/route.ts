import { NextResponse, after, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { notifyStaff } from "@/lib/notifications/notify-staff";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// "I'm here" — a customer telling the desk they have arrived.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
//   export async function handleSalonCheckIn(bookingId, clientId) {
//     // TODO: Notify front desk
//     // In production, this would send notification to facility staff
//     console.log("Salon check-in notification:", notification);
//   }
//
// The button above it said "Checked in — the salon knows you're here." Nothing
// left the browser. A customer stood in a grooming salon believing the desk had
// been told, and the desk had not.
//
// ── IT DOES NOT CHECK ANYONE IN ───────────────────────────────────────────
//
// Deliberately, and this is the whole design of it. Arrival is a STAFF act:
// `PATCH /api/grooming/appointments` needs `edit_bookings`, boarding goes
// through `record_boarding_arrival` with `check_in_out`. A customer saying they
// are here is a REQUEST for attention, not a state change — letting the phone
// in somebody's pocket move a booking's status would put the board's truth in
// the hands of whoever is standing outside.
//
// So this rings the bell, and a person receives the guest. The notice is
// `urgent` and addressed by `check_in_out`, so it reaches the people who can
// actually act on it (lib/notifications/catalog.ts).
//
// ── THE BOOKING MUST BE THEIRS ────────────────────────────────────────────
//
// Read through RLS as the caller: `bookings_read` admits a customer their own
// bookings, so a ref belonging to somebody else simply is not found. The
// facility comes from the BOOKING ROW, never the session — a customer has no
// membership, and `getFacilityContext()` would fall back to the demo facility
// (see the note on it), which would ring a bell in the wrong business.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  if (!/^\d{1,12}$/.test(ref)) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, ref, facility_id, service, status, clients ( name )")
    .eq("ref", Number(ref))
    .maybeSingle();

  // Not theirs, or not real — the same answer to both, because a customer who
  // can tell those apart can enumerate other people's bookings.
  if (!booking) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const row = booking as unknown as {
    id: string;
    ref: number;
    facility_id: string;
    service: string;
    status: string;
    clients: { name: string } | null;
  };

  // Announcing arrival at something already finished, cancelled or declined is
  // not a thing that happens by accident — and a bell rung for it is noise at a
  // desk that is busy.
  if (["completed", "cancelled", "no_show", "declined"].includes(row.status)) {
    return NextResponse.json(
      { error: "That booking is closed." },
      { status: 409 },
    );
  }

  // `after()`, because the customer should not wait for an email fan-out, and
  // notifyStaff never throws: the arrival was reported either way, and a bell
  // that failed must not tell them it did not happen.
  //
  // The dedupe key is the BOOKING, so tapping twice — which somebody standing
  // outside in the rain will do — rings once.
  after(() =>
    notifyStaff({
      facilityId: row.facility_id,
      kind: "customer_arrived",
      params: {
        client: row.clients?.name ?? undefined,
        service: row.service,
      },
      link: `/facility/dashboard/bookings/${row.ref}`,
      sourceId: row.id,
      dedupeKey: `customer_arrived:${row.id}`,
      actorProfileId: viewer.userId,
      request,
    }),
  );

  return NextResponse.json({ announced: true });
}
