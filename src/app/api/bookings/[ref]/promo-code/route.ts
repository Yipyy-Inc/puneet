import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Put a promo code on a booking's bill (redeem_promo_code, 20260911173538).
//
// The database checks the code — active, in its dates, for this service and
// day, under its limits, not already on this bill — and writes the negative
// line and the redemption together, with the code locked so two tills cannot
// both take its last use. A refusal comes back with `reason` (the function's
// HINT), which the screen says in the viewer's language.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { ref } = await params;
  const body = (await request.json().catch(() => null)) as {
    code?: string;
  } | null;
  const code = body?.code?.trim();
  if (!code) {
    return NextResponse.json(
      { error: "Enter a code.", reason: "promo_unknown" },
      { status: 422 },
    );
  }
  const n = Number(ref);
  if (!Number.isFinite(n)) {
    return NextResponse.json({ error: "Invalid booking." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", n)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_booking_id: booking.id as string,
    p_code: code,
  });
  if (error) {
    const reason = error.hint || null;
    return NextResponse.json(
      { error: error.message, reason },
      { status: error.code === "42501" ? 403 : 409 },
    );
  }
  return NextResponse.json(
    data as { code: string; amount: number; lineItemId: string },
    { status: 201 },
  );
}
