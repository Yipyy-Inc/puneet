import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Recording that a staff member's tips have been paid out.
//
// ── THE FACILITY COMES FROM THE SESSION, NOT THE BODY ─────────────────────
//
// `mark_tips_paid` is SECURITY DEFINER and checks `edit_payroll` against
// whatever facility id it is handed. If this route passed the caller's, the
// permission check would be answering a question the caller asked — "may I edit
// payroll at the facility I have just named" — which is not the same question.
// The body's facilityId is compared against the session's and refused if it
// disagrees, rather than trusted.
//
// ── ZERO IS NOT SUCCESS ───────────────────────────────────────────────────
//
// The RPC returns how many allocations it actually changed, and already-paid
// rows are skipped so a second run cannot restamp settled tips with today. That
// count is passed straight back, because a screen saying "paid" on the strength
// of a call that changed nothing is the defect `check:success-claims` exists to
// catch — here it would tell an owner they had paid somebody twice.
// ============================================================================

export const dynamic = "force-dynamic";

const Payout = z.object({
  facilityId: z.string().uuid(),
  staffId: z.string().uuid(),
  /** Defaults to a wide window: the report shows six months. */
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  note: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = Payout.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name a facility and a staff member." },
      { status: 400 },
    );
  }

  // facility-from-request-ok: the session decides, and the body is only allowed
  // to agree with it.
  const context = await getFacilityContext();
  if (!context || context.facilityId !== parsed.data.facilityId) {
    return NextResponse.json(
      { error: "That is not your facility." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("mark_tips_paid", {
    p_facility_id: context.facilityId,
    p_staff_id: parsed.data.staffId,
    // Ten years back rather than "all time": a payout run is bounded by the
    // report it was launched from, and an unbounded update on money is worth
    // avoiding even when the effect is the same today.
    p_from:
      parsed.data.from ??
      new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    p_to: parsed.data.to ?? new Date().toISOString().slice(0, 10),
    p_note: parsed.data.note,
  });

  if (error) {
    // 42501 is the permission refusal raised inside the RPC — not a server
    // fault, and it must not read like one.
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You cannot record tip payouts for this facility."
          : error.message,
      },
      { status: denied ? 403 : 500 },
    );
  }

  return NextResponse.json({ marked: Number(data ?? 0) });
}
