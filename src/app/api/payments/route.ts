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
// ── THE BOOKING MOVES ITSELF ───────────────────────────────────────────────
//
// Nothing here marks the booking paid, and nothing should: `payment_status` and
// `amount_paid` are derived from this ledger by trigger (20260806680000). A
// route that also set them would be a second answer to the same question, and
// the two would disagree the first time a refund was taken somewhere else.
//
// ── THE ARITHMETIC IS NOT RE-DERIVED HERE ──────────────────────────────────
//
// Every figure comes from the dialog, which computed them together. The route
// forwards them and the CHECK constraints decide whether they add up — a
// second implementation of the same sum in TypeScript would be a second answer
// to "what was this customer charged", and the two would drift.
// ============================================================================

export const dynamic = "force-dynamic";

// ============================================================================
// Reading a client's payments.
//
// The billing tab on a client file listed `@/data/payments` filtered by
// clientId, so a REAL client's payment history was whatever the fixture
// happened to hold for that number — usually nothing, and on a colliding id
// somebody else's money.
//
// `payments_read` scopes the rows; the `ref` filter below is a CONVENIENCE, not
// a boundary. A caller naming another facility's client gets an empty list
// because RLS refuses the rows, not because of the eq() here.
// ============================================================================

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const clientRef = request.nextUrl.searchParams.get("clientRef");
  const supabase = await createServerClient();

  // The client's uuid, resolved separately rather than through a PostgREST
  // embed. `clients!inner(ref)` filters correctly but collapses the row type to
  // an error union, and losing every column's type to save one round trip is a
  // bad trade on a money screen.
  let clientId: string | null = null;
  if (clientRef) {
    const ref = Number(clientRef);
    if (!Number.isInteger(ref)) {
      return NextResponse.json(
        { error: "clientRef must be a number." },
        { status: 422 },
      );
    }
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", ref)
      .maybeSingle();

    // RLS refused the client, or there is none. Either way this caller has no
    // payments to see for them — an empty list, not an error, because "no
    // payments" is what the screen would show anyway and a 404 would leak
    // whether the record exists.
    if (!client) return NextResponse.json([]);
    clientId = client.id;
  }

  let query = supabase
    .from("payments")
    // ONE STRING LITERAL, not a concatenation. supabase-js infers the row type
    // from the select at the type level; `"a, b" + "c"` is just `string` to the
    // compiler, and every column silently becomes an error type.
    .select(
      "id, booking_id, client_id, method, grand_total, tip, amount_charged, card_brand, card_last4, entry_method, processor, author_name, created_at, refund_of_payment_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((row) => ({
      id: row.id,
      bookingId: row.booking_id,
      method: row.method,
      // NOT sign-flipped. A refund is stored as its own payment row pointing at
      // the one it reverses, and `grand_total` is ALREADY NEGATIVE on it
      // (checked against the rows, not assumed). Multiplying by -1 here made a
      // refund positive again, so "Total Paid" would have ADDED money the
      // facility gave back. Caught by the spec that asserts the sign.
      amount: Number(row.grand_total),
      tip: Number(row.tip ?? 0),
      cardBrand: row.card_brand,
      cardLast4: row.card_last4,
      entryMethod: row.entry_method,
      processor: row.processor,
      authorName: row.author_name,
      createdAt: row.created_at,
      isRefund: row.refund_of_payment_id !== null,
    })),
  );
}

interface PaymentInput {
  /**
   * The booking this money is against, by reference number. ANY service — the
   * ledger column is `payments.booking_id` and never was grooming-specific.
   * Optional: a retail sale belongs to no booking.
   */
  bookingRef?: string;
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
  customerPackageId?: string;
  /** WHICH POOL the pass comes from. A multi-service bundle has one pool per
   *  service (20260806320000, Decision 2), so a redemption that does not name
   *  one is ambiguous and the database refuses it. */
  packageServiceId?: string;
  petName?: string;
  serviceLabel?: string;
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

  // The booking is optional — a payment need not belong to one, and retail
  // sales will not. When one is named it is resolved here so the RPC gets a
  // uuid it can validate rather than a reference number it cannot.
  //
  // Resolved through a read the caller must be able to make, so a booking they
  // cannot see is "no such booking" rather than an RLS error deeper in.
  let bookingId: string | null = null;
  let clientId: string | null = null;
  if (body.bookingRef) {
    const ref = Number(body.bookingRef);
    if (!Number.isFinite(ref)) {
      return NextResponse.json(
        { error: "That is not a booking reference." },
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
        { error: "That booking does not exist, or is not yours." },
        { status: 404 },
      );
    }
    bookingId = booking.id as string;
    clientId = (booking.client_id as string | null) ?? null;
  }

  // The screens address a customer package by its mock id ("cp-1"); the RPC
  // needs the uuid. Resolved through a read the caller must be able to make,
  // so a package they cannot see is "no such package" rather than an RLS error
  // three statements deeper.
  let customerPackageId: string | null = null;
  if (body.customerPackageId) {
    const { data: pkg } = await supabase
      .from("customer_packages")
      .select("id")
      .eq("legacy_id", body.customerPackageId)
      .maybeSingle();
    if (!pkg) {
      return NextResponse.json(
        { error: "That package does not exist, or is not yours." },
        { status: 404 },
      );
    }
    customerPackageId = pkg.id as string;
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
    p_customer_package_id: customerPackageId,
    p_package_service_id: body.packageServiceId ?? null,
    p_pet_name: body.petName ?? null,
    p_service_label: body.serviceLabel ?? "",
  } as never);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to take payments at this facility.",
      duplicate: "That payment has already been recorded.",
    });
  }

  // The RPC returns both facts it computed in that one transaction: the
  // payment, and how many passes are left. A second round trip to learn the
  // second one would read a number the same transaction already knew.
  const out = data as { payment_id?: string; passes_remaining?: number } | null;
  return NextResponse.json(
    {
      id: out?.payment_id ?? null,
      ...(out?.passes_remaining != null
        ? { passesRemaining: out.passes_remaining }
        : {}),
    },
    { status: 201 },
  );
}
