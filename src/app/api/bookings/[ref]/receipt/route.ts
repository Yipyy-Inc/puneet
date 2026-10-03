import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import {
  emailItemisedReceipt,
  smsItemisedReceipt,
} from "@/lib/clover/receipt-delivery";
import { escapeHtml } from "@/lib/email/shell";
import { formatDateTimeInZone, formatMoney } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import {
  bookingReceiptInput,
  type ReceiptPaymentRow,
} from "@/lib/payments/booking-receipt";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// POST /api/bookings/[ref]/receipt   { to?: string, channels?: ["email","sms"] }
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
//
// ── CHANNELS, FROM THE PAYMENT DIALOG (2026-10-03) ────────────────────────
//
// The payment dialog's "Receipt: Email · Text" sends `channels`. Then a text
// is the same itemised receipt by SMS, and a booking still part-owed gets a
// short message instead of a receipt — what was received and what is still
// owed — because a receipt says "paid" and this is not. Each channel answers
// for itself under `channels`, and an opted-out address is skipped and says
// so. A caller that sends no `channels` gets exactly the old behaviour.
// ============================================================================

export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  ref: number;
  service: string;
  service_type: string | null;
  base_price: number | string | null;
  discount: number | string | null;
  total_cost: number | string | null;
  extras_total: number | string | null;
  taxable_extras_total: number | string | null;
  taxable: boolean | null;
  payment_status: string | null;
  amount_due: number | string | null;
  amount_paid: number | string | null;
  facility_id: string;
  clients: {
    name: string | null;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
  } | null;
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
  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    channels?: unknown;
  };
  const channels = Array.isArray(body.channels)
    ? ([...new Set(body.channels)].filter(
        (c): c is Channel => c === "email" || c === "sms",
      ) as Channel[])
    : null;

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, service, service_type, base_price, discount, total_cost, extras_total, taxable_extras_total, taxable, payment_status, amount_due, amount_paid, facility_id, clients(name, email, phone, preferred_language), booking_pets(pets(name)), facilities(name, address, phone, email, website, logo_url, timezone)",
    )
    .eq("ref", bookingRef)
    .maybeSingle();
  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.facilities) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (channels && booking.payment_status !== "paid") {
    return NextResponse.json(
      await partPaymentMessages(
        supabase as unknown as SupabaseClient,
        booking,
        channels,
      ),
    );
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
  // With channels, each one answers for itself — a client with no email can
  // still be texted.
  if (!to && !channels) {
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
      totalCost: number(booking.total_cost),
      extrasTotal: number(booking.extras_total),
      taxableExtrasTotal:
        booking.taxable_extras_total == null
          ? undefined
          : number(booking.taxable_extras_total),
      taxable: booking.taxable !== false,
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

  if (channels) {
    const results: ChannelResults = {};
    for (const channel of channels) {
      results[channel] = await sendThrough(
        supabase as unknown as SupabaseClient,
        booking.facility_id,
        channel,
        channel === "email" ? to : (booking.clients?.phone ?? "").trim(),
        (address) =>
          channel === "email"
            ? emailItemisedReceipt(address, receipt)
            : smsItemisedReceipt(address, receipt),
      );
    }
    return NextResponse.json(summarise(results));
  }

  const result = await emailItemisedReceipt(to, receipt);
  return NextResponse.json({ ...result, to });
}

type Channel = "email" | "sms";

interface ChannelResult {
  sent: boolean;
  detail?: string;
  to?: string;
}

type ChannelResults = Partial<Record<Channel, ChannelResult>>;

/** One channel: the address, the client's opt-out, then the send itself. */
async function sendThrough(
  db: SupabaseClient,
  facilityId: string,
  channel: Channel,
  address: string,
  send: (to: string) => Promise<{ sent: boolean; detail?: string }>,
): Promise<ChannelResult> {
  if (!address) {
    return {
      sent: false,
      detail:
        channel === "email"
          ? "This client has no email address on file."
          : "This client has no phone number on file.",
    };
  }
  const suppression = await isSuppressed(db, {
    facilityId,
    channel,
    address,
    isTransactional: true,
  });
  if (suppression.suppressed) {
    return {
      sent: false,
      to: address,
      detail:
        suppression.reason === "invalid_address"
          ? "The address on file is not one a message can be sent to."
          : "This client has opted out of these messages.",
    };
  }
  return { ...(await send(address)), to: address };
}

function summarise(results: ChannelResults) {
  const all = Object.values(results);
  return {
    sent: all.some((r) => r.sent),
    detail: all.find((r) => !r.sent)?.detail,
    channels: results,
  };
}

/**
 * A part payment: what was received and what is still owed, in the client's
 * language — never an itemised "receipt", which would say the booking is paid.
 * The figure owed carries the facility's tax, as the pay link's does.
 */
async function partPaymentMessages(
  db: SupabaseClient,
  booking: BookingRow,
  channels: Channel[],
) {
  const { data: last } = await db
    .from("payments")
    .select("grand_total")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const owedCents = Math.max(
    0,
    Math.round(
      (Number(booking.amount_due ?? 0) - Number(booking.amount_paid ?? 0)) *
        100,
    ),
  );
  const taxCents = taxToAddCents(
    await facilityTaxConfig(db, booking.facility_id),
    owedCents,
    booking,
  );
  const french = Boolean(booking.clients?.preferred_language?.startsWith("fr"));
  const language = french ? "fr" : "en";
  const received = formatMoney(
    Number(
      (last as { grand_total?: number | string } | null)?.grand_total ?? 0,
    ),
    language,
  );
  const owed = formatMoney((owedCents + taxCents) / 100, language);
  const facility = booking.facilities?.name ?? "";
  const name = booking.clients?.name ?? "";
  const subject = french
    ? `${facility} : paiement reçu, réservation n° ${booking.ref}`
    : `${facility}: payment received for booking #${booking.ref}`;
  const text = french
    ? `Bonjour ${name}, nous avons reçu ${received} pour la réservation n° ${booking.ref} chez ${facility}. Il reste ${owed} à payer.`
    : `Hi ${name}, we received ${received} for booking #${booking.ref} at ${facility}. ${owed} is still owed.`;

  const results: ChannelResults = {};
  for (const channel of channels) {
    const address =
      (channel === "email"
        ? booking.clients?.email
        : booking.clients?.phone
      )?.trim() ?? "";
    results[channel] = await sendThrough(
      db,
      booking.facility_id,
      channel,
      address,
      (to) =>
        channel === "sms"
          ? sendSms({ to, body: text })
          : sendEmail({
              to,
              subject,
              text,
              html: `<p>${escapeHtml(text)}</p>`,
            }),
    );
  }
  return summarise(results);
}
