import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { facilityStaffLinkOrigin } from "@/lib/public-origin";
import {
  kioskLinkFor,
  mintCheckInToken,
  toByteaLiteral,
} from "@/lib/yipyy-go/check-in-token";
import {
  bookingNotFound,
  resolveYipyyGoBooking,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";

// ============================================================================
// /api/customer/yipyy-go/bookings/[ref]/check-in-pass — the code the owner
// shows at the desk.
//
// POST  mints a token, stores only its hash (issue_yipyy_go_check_in_pass —
//       the owner's, for a booking still arriving), and answers the kiosk
//       link the QR code encodes, on the facility's STAFF origin where the
//       desk is signed in. Every call replaces the previous code. Never
//       cached: the answer is the only place the token exists.
// ============================================================================

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ref: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const booking = await resolveYipyyGoBooking(supabase, (await params).ref);
  if (!booking) return bookingNotFound();

  const { token, hash } = mintCheckInToken();
  const { data: expiresAt, error } = await supabase.rpc(
    "issue_yipyy_go_check_in_pass",
    { p_booking_id: booking.id, p_token_hash: toByteaLiteral(hash) },
  );
  if (error) return yipyyGoFailure(error);

  const { data: facility } = await supabase
    .from("facilities")
    .select("slug")
    .eq("id", booking.facilityId)
    .maybeSingle();

  return NextResponse.json(
    {
      url: kioskLinkFor(
        facilityStaffLinkOrigin(
          (facility as { slug: string | null } | null)?.slug,
          request,
        ),
        token,
      ),
      expiresAt,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
