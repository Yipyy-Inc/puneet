import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Paying a booking with a gift card.
//
// One call to `pay_booking_with_gift_card` (20260911003221), which redeems the
// card and records the payment in a single transaction: the card is never
// spent without the booking being paid, or the reverse. The function checks
// the code, the permission, the card's status, expiry and balance, what the
// booking still owes, and that the card is this business's — so this route
// checks none of them itself. A second opinion formed outside the row lock is
// how two tills overdraw one card.
//
// The facility is the booking's, resolved inside the function through RLS;
// nothing here is taken from the request but the code, the ref and the amount.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    bookingRef?: number | string;
    amount?: number;
    /** The tax on `amount`, from the facility's own settings (20260911221947). */
    tax?: number;
    note?: string;
  } | null;
  const code = body?.code?.trim() ?? "";
  const bookingRef = Number(body?.bookingRef);
  const amount = Number(body?.amount);
  const tax = Number(body?.tax ?? 0);
  if (!Number.isFinite(tax) || tax < 0) {
    return NextResponse.json(
      { error: "The tax on a gift card payment has to be a positive amount." },
      { status: 422 },
    );
  }
  if (!code || !Number.isInteger(bookingRef) || !(amount > 0)) {
    return NextResponse.json(
      { error: "A gift card payment needs a code, a booking and an amount." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "pay_booking_with_gift_card" as never,
    {
      p_code: code,
      p_booking_ref: bookingRef,
      p_amount: Math.round(amount * 100) / 100,
      p_note: body?.note ?? null,
      p_tax: Math.round(tax * 100) / 100,
    } as never,
  );

  if (error) {
    // The function's own sentences are written for the counter: "Only $30.00
    // is still owed", "That gift card expired on 2026-08-01", "No gift card
    // with that code that you can redeem". 42501 is a refusal, 22023 a bad
    // amount, 23514 the card's own overdraft check; anything else is ours.
    const status =
      error.code === "42501"
        ? 403
        : error.code === "22023"
          ? 422
          : error.code === "23514"
            ? 409
            : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
