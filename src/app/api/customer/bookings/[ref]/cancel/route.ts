import { NextResponse, after, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { notifyStaff } from "@/lib/notifications/notify-staff";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// A customer cancels their own booking, or withdraws a request.
//
//   GET  → what cancelling would mean: may they, is it a withdrawal, is it
//          inside the facility's notice window and at what fee
//   POST { reason? } → cancels, and tells the desk
//
// The portal's Cancel button waited a second and said "cancelled"; nothing was
// written. The database decides everything here (a_customer_cancels_before_
// the_start, 20260919162510): cancel_my_booking admits only the caller's own
// bookings, refuses one that has started, and records the terms on the booking
// itself — so a late cancellation cannot be made to look early by calling
// PostgREST directly. Nothing is charged or refunded; the fee is the
// facility's to apply.
//
// The facility for the staff notice comes from the booking row, never the
// session: getFacilityContext() answers the demo facility for a customer.
// ============================================================================

export const dynamic = "force-dynamic";

// Not in the generated types yet — the same shape require-forms.ts uses.
type UntypedRpc = (
  fn: "my_booking_cancel_terms" | "cancel_my_booking",
  args: Record<string, unknown>,
) => PromiseLike<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;

export interface CancelTerms {
  status: string;
  cancellable: boolean;
  withdrawal: boolean;
  started: boolean;
  late: boolean;
  /**
   * The RULE'S THRESHOLD in hours — the configured window under the old flat
   * rule, the winning tier's minimum under a policy. Not the notice given:
   * that is `noticeGivenHours`, and the two carried one key until 2026-09-22.
   */
  noticeHours: number | null;
  noticeGivenHours?: number | null;
  feePercentage: number | null;
  /** Where the answer came from. `none` means the facility has set nothing. */
  source?: "policy" | "booking_rules" | "none";
  tierId?: string | null;
  /** The facility's own words for this tier, when they gave it any. */
  tierLabel?: string | null;
  charge?: "none" | "keep_deposit" | "percentage" | "flat" | "forfeit_pass";
  /** What it costs, in dollars. Computed by the database, never by a screen. */
  amount?: number | null;
  refund?: "none" | "original" | "store_credit";
  forfeitsPass?: boolean;
  customerMayCancel?: "instant" | "request";
}

async function signedIn() {
  const viewer = await getViewer().catch(() => null);
  return viewer && viewer.source === "session" ? viewer : null;
}

function refOf(ref: string): number | null {
  return /^\d{1,12}$/.test(ref) ? Number(ref) : null;
}

const NOT_FOUND = () =>
  NextResponse.json({ error: "No such booking." }, { status: 404 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  if (!(await signedIn())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const ref = refOf((await params).ref);
  if (ref === null) return NOT_FOUND();

  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
  const { data, error } = await rpc("my_booking_cancel_terms", { p_ref: ref });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Not theirs and not real are the same answer.
  if (!data) return NOT_FOUND();
  return NextResponse.json(data as CancelTerms);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const viewer = await signedIn();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const ref = refOf((await params).ref);
  if (ref === null) return NOT_FOUND();
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };
  const reason = (body.reason ?? "").trim().slice(0, 500);

  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
  const { data, error } = await rpc("cancel_my_booking", {
    p_ref: ref,
    p_reason: reason || null,
  });
  if (error) {
    if (error.code === "P0002") return NOT_FOUND();
    // Started, or no longer open, or a service the facility cancels itself:
    // the booking is past what the owner may do.
    //
    // WHICH of those it is decides what the portal says next, and the trigger
    // cannot say — 42501 already means "you may only cancel this booking".
    // So the terms are read back, from the same evaluator that refused, on
    // the error path only. Guessing from the message text would break the
    // first time somebody reworded an exception.
    if (error.code === "55000" || error.code === "42501") {
      const { data: terms } = await rpc("my_booking_cancel_terms", {
        p_ref: ref,
      });
      const t = terms as CancelTerms | null;
      const mustAsk =
        t?.customerMayCancel === "request" && t?.withdrawal === false;
      return NextResponse.json(
        {
          error: error.message,
          reason: mustAsk ? "approval_required" : "not_cancellable",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: booked } = await supabase
    .from("bookings")
    .select("id, facility_id, service, start_at, clients ( name )")
    .eq("ref", ref)
    .maybeSingle();
  const row = booked as unknown as {
    id: string;
    facility_id: string;
    service: string;
    start_at: string;
    clients: { name: string | null } | null;
  } | null;
  if (row) {
    after(() =>
      notifyStaff({
        facilityId: row.facility_id,
        kind: "booking_cancelled",
        params: {
          client: row.clients?.name ?? undefined,
          service: row.service,
          date: row.start_at?.slice(0, 10),
        },
        link: `/facility/dashboard/bookings/${ref}`,
        sourceId: row.id,
        dedupeKey: `booking_cancelled:${row.id}`,
        actorProfileId: viewer.userId ?? null,
        request,
      }),
    );
  }

  return NextResponse.json({ cancellation: data });
}
