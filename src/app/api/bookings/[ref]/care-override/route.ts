import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// POST /api/bookings/[ref]/care-override   { reason, items }
//
// Checkout asks when a meal or dose planned for today is not logged. Going
// ahead needs a reason, kept append-only by public.record_care_gate_override
// (20260919153807) with the items that were not logged; the booking's history
// shows it. The function decides who may — whoever may check the pet out — so
// this route only carries the question to it.
// ============================================================================

export const dynamic = "force-dynamic";

// Not in the generated types yet — the same shape require-forms.ts uses.
type UntypedRpc = (
  fn: "record_care_gate_override",
  args: Record<string, unknown>,
) => PromiseLike<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;

interface CareOverrideItem {
  kind: string;
  label: string;
  critical: boolean;
}

export async function POST(
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
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    items?: CareOverrideItem[];
  };
  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "Say why the pet goes home with this care not logged." },
      { status: 422 },
    );
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

  const items = (Array.isArray(body.items) ? body.items : []).map((item) => ({
    kind: String(item.kind ?? ""),
    label: String(item.label ?? ""),
    critical: Boolean(item.critical),
  }));
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
  const { data, error } = await rpc("record_care_gate_override", {
    p_booking_id: booking.id,
    p_reason: reason,
    p_items: items,
  });
  if (error) {
    const status =
      error.code === "42501" ? 403 : error.code === "22023" ? 422 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ id: String(data ?? "") }, { status: 201 });
}
