import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { emailItemisedReceipt } from "@/lib/clover/receipt-delivery";
import { formatDateTimeInZone } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { facilityTaxConfig } from "@/lib/payments/booking-tax";
import {
  bookingReceiptInput,
  type ReceiptPaymentRow,
} from "@/lib/payments/booking-receipt";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// POST /api/bookings/[ref]/receipt   { to?: string }
//
// Emails a settled booking's itemised receipt — to the client's own address
// unless staff give another — built from the payment ledger
// (src/lib/payments/booking-receipt.ts). The booking page offered no way to do
// this: the checkout's email and text buttons were toasts and were removed.
//
// Staff who may see the booking's money (view_booking_financials) may send it.
// A booking with something still owed is refused: a receipt says "paid", and
// what such a booking needs is the pay link. The answer says whether the email
// went — `sent: false` with the reason, never a success that did not happen.
// ============================================================================

export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  ref: number;
  service: string;
  service_type: string | null;
  base_price: number | string | null;
  discount: number | string | null;
  payment_status: string | null;
  facility_id: string;
  clients: { name: string | null; email: string | null } | null;
  booking_pets: Array<{ pets: { name: string | null } | null }> | null;
  facilities: {
    name: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    } | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    timezone: string | null;
  } | null;
}

type FacilityAddress = NonNullable<BookingRow["facilities"]>["address"];

function addressLine(address: FacilityAddress): string | null {
  if (!address) return null;
  const line = [
    address.street,
    address.city,
    [address.state, address.zipCode].filter(Boolean).join(" "),
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const viewer = await getViewer().catch(() => null);
  if (!viewer || (viewer.memberships.length === 0 && !viewer.isPlatformAdmin)) {
    return NextResponse.json(
      { error: "Only the facility sends receipts." },
      { status: 403 },
    );
  }
  if (
    !viewer.isPlatformAdmin &&
    !holds(await myPermissions(), "view_booking_financials")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to see this booking's payments." },
      { status: 403 },
    );
  }

  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { to?: string };

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, service, service_type, base_price, discount, payment_status, facility_id, clients(name, email), booking_pets(pets(name)), facilities(name, address, phone, email, website, logo_url, timezone)",
    )
    .eq("ref", bookingRef)
    .maybeSingle();
  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.facilities) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.payment_status !== "paid") {
    return NextResponse.json(
      {
        error:
          "This booking is not paid in full. Send the pay link instead; a receipt says it is paid.",
        reason: "not_settled",
      },
      { status: 409 },
    );
  }

  const to = (body.to ?? booking.clients?.email ?? "").trim();
  if (!to) {
    return NextResponse.json(
      {
        error:
          "This client has no email address. Add one, then send the receipt.",
        reason: "no_email",
      },
      { status: 422 },
    );
  }

  const [{ data: payments }, { data: items }, taxConfig] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "method, subtotal, tax, tip, grand_total, card_brand, card_last4, entry_method, auth_code, processor_payment_id",
      )
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("booking_line_items")
      .select("name, price, unit_price, quantity")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    facilityTaxConfig(
      supabase as unknown as SupabaseClient,
      booking.facility_id,
    ),
  ]);

  const number = (v: number | string | null | undefined) => Number(v ?? 0);
  const facility = booking.facilities;
  const receipt = bookingReceiptInput({
    booking: {
      ref: booking.ref,
      serviceLabel: serviceTypeLabel(
        "en",
        booking.service_type || booking.service,
      ),
      basePrice: number(booking.base_price),
      discount: number(booking.discount),
      clientName: booking.clients?.name ?? null,
      petNames: (booking.booking_pets ?? [])
        .map((bp) => bp.pets?.name)
        .filter((name): name is string => Boolean(name)),
    },
    items: (
      (items ?? []) as Array<{
        name: string;
        price: number | string | null;
        unit_price: number | string;
        quantity: number;
      }>
    ).map((item) => ({
      name: item.name,
      price: item.price === null ? null : number(item.price),
      unitPrice: number(item.unit_price),
      quantity: item.quantity,
    })),
    payments: (
      (payments ?? []) as Array<{
        method: string;
        subtotal: number | string | null;
        tax: number | string | null;
        tip: number | string | null;
        grand_total: number | string | null;
        card_brand: string | null;
        card_last4: string | null;
        entry_method: string | null;
        auth_code: string | null;
        processor_payment_id: string | null;
      }>
    ).map(
      (p): ReceiptPaymentRow => ({
        method: p.method,
        subtotal: number(p.subtotal),
        tax: number(p.tax),
        tip: number(p.tip),
        grandTotal: number(p.grand_total),
        cardBrand: p.card_brand,
        cardLast4: p.card_last4,
        entryMethod: p.entry_method,
        authCode: p.auth_code,
        processorPaymentId: p.processor_payment_id,
      }),
    ),
    facility: {
      name: facility.name,
      address: addressLine(facility.address),
      phone: facility.phone,
      email: facility.email,
      website: facility.website,
      logoUrl: facility.logo_url || null,
    },
    taxConfig,
    printedAt: formatDateTimeInZone(
      new Date(),
      "en",
      facility.timezone ?? DEFAULT_TIMEZONE,
    ),
  });
  if (receipt === "nothing_paid") {
    return NextResponse.json(
      { error: "Nothing was paid on this booking.", reason: "nothing_paid" },
      { status: 409 },
    );
  }

  const result = await emailItemisedReceipt(to, receipt);
  return NextResponse.json({ ...result, to });
}
