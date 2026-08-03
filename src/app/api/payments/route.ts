import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";

// ============================================================================
// Recording a payment.
//
// ── ONE RPC, BECAUSE IT IS ONE TRANSACTION ─────────────────────────────────
//
// The route does not insert. `public.record_payment` (20260806260000) writes
// the payment and — when store credit was applied — the ledger entry that
// spends it, in a single transaction. Two PostgREST calls could half-succeed,
// and the half that survives is a payment recorded as having consumed credit
// that was never deducted. The balance is derived from the ledger, so nothing
// downstream would ever notice the money appear.
//
// The function is SECURITY INVOKER: it is not a way around the policies. Taking
// a payment still needs `financial_take_payment`, a refund still needs
// `process_refund`, and a groomer still cannot do either.
//
// ── THE ARITHMETIC IS NOT RE-DERIVED HERE ──────────────────────────────────
//
// Every figure comes from the dialog, which computed them together. The route
// forwards them and the CHECK constraints decide whether they add up — a
// second implementation of the same sum in TypeScript would be a second answer
// to "what was this customer charged", and the two would drift.
// ============================================================================

export const dynamic = "force-dynamic";

interface PaymentInput {
  appointmentId?: string;
  method?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  storeCreditApplied?: number;
  packagePassApplied?: number;
  loyaltyDiscountApplied?: number;
  amountCharged?: number;
  grandTotal?: number;
  cashReceived?: number;
  savedCardId?: string;
  packagePassId?: string;
  receiptChannels?: string[];
  creditNote?: string;
}

const MONEY_FIELDS = [
  "subtotal",
  "tax",
  "tip",
  "amountCharged",
  "grandTotal",
] as const;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PaymentInput | null;
  if (!body?.method) {
    return NextResponse.json(
      { error: "A payment method is required." },
      { status: 422 },
    );
  }
  for (const field of MONEY_FIELDS) {
    if (!Number.isFinite(body[field])) {
      return NextResponse.json(
        { error: `${field} must be a number.` },
        { status: 422 },
      );
    }
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  // The appointment is optional — a payment need not belong to a booking, and
  // retail sales will not. When one is named it is resolved here so the RPC
  // gets a uuid it can validate rather than a reference number it cannot.
  let bookingId: string | null = null;
  let clientId: string | null = null;
  if (body.appointmentId) {
    const ref = Number(body.appointmentId);
    if (!Number.isFinite(ref)) {
      return NextResponse.json(
        { error: "That is not an appointment reference." },
        { status: 422 },
      );
    }
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id")
      .eq("ref", ref)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json(
        { error: "That appointment does not exist, or is not yours." },
        { status: 404 },
      );
    }
    bookingId = booking.id as string;
    clientId = (booking.client_id as string | null) ?? null;
  }

  const { data, error } = await supabase.rpc("record_payment", {
    p_facility_id: context.facilityId,
    p_method: body.method,
    p_subtotal: body.subtotal,
    p_tax: body.tax,
    p_tip: body.tip,
    p_amount_charged: body.amountCharged,
    p_grand_total: body.grandTotal,
    p_booking_id: bookingId,
    p_client_id: clientId,
    p_store_credit_applied: body.storeCreditApplied ?? 0,
    p_package_pass_applied: body.packagePassApplied ?? 0,
    p_loyalty_discount_applied: body.loyaltyDiscountApplied ?? 0,
    p_cash_received: body.cashReceived ?? null,
    p_saved_card_id: body.savedCardId ?? null,
    p_package_pass_id: body.packagePassId ?? null,
    p_receipt_channels: body.receiptChannels ?? [],
    p_credit_note: body.creditNote ?? "",
  } as never);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to take payments at this facility.",
      duplicate: "That payment has already been recorded.",
    });
  }

  return NextResponse.json({ id: data }, { status: 201 });
}
