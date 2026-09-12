import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { holds, myPermissions } from "@/lib/auth/permissions";
import { getFacilityContext } from "@/lib/api/facility-context";
import { formatMoney } from "@/lib/i18n/format";
import { sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import { facilityCustomerLinkOrigin } from "@/lib/public-origin";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Send a customer the link to pay what their booking still owes.
//
// The booking page had "Email invoice" and "SMS link" in its action menu, and
// both were `toast.success(…)` and nothing else — the customer received
// nothing while the screen said they had. The pay page (`/pay/{ref}`) has been
// real since 2026-09-11; this is the message that points at it.
//
// ── IT SENDS THROUGH THE ONE SENDER ───────────────────────────────────────
//
// `lib/messaging/send`, which refuses on staging (it shares the production
// database, so a send there reaches a real person) and says so. The answer is
// `{ sent, detail }` either way, and the screen reports exactly that: "not
// sent — outbound messages are off here" is a fact staff can act on.
//
// ── AND IT ASKS THE OPT-OUT LIST FIRST ────────────────────────────────────
//
// A payment link is transactional, so only an "all" suppression (a STOP)
// stops it — the same rule the automations follow.
// ============================================================================

export const dynamic = "force-dynamic";

type Channel = "email" | "sms";

interface BookingRow {
  id: string;
  ref: number;
  facility_id: string;
  amount_due: number | string | null;
  amount_paid: number | string | null;
  clients: {
    name: string;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
  } | null;
  facilities: { name: string; slug: string | null } | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 403 });
  }
  // Asking for money is taking a payment, one step removed: the same key
  // `payments_insert` checks for the charge itself.
  if (!holds(await myPermissions(), "financial_take_payment")) {
    return NextResponse.json(
      { error: "Not allowed to take payments at this facility." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    channel?: string;
  } | null;
  const channel = body?.channel;
  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json(
      { error: "Send by email or by SMS." },
      { status: 422 },
    );
  }

  const { ref } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, facility_id, amount_due, amount_paid, clients ( name, email, phone, preferred_language ), facilities ( name, slug )",
    )
    .eq("ref", Number(ref))
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.clients) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const owedCents = Math.max(
    0,
    Math.round(
      (Number(booking.amount_due ?? 0) - Number(booking.amount_paid ?? 0)) *
        100,
    ),
  );
  if (owedCents === 0) {
    return NextResponse.json(
      { error: "Nothing is owed on this booking." },
      { status: 409 },
    );
  }

  const address =
    channel === "email" ? booking.clients.email : booking.clients.phone;
  if (!address?.trim()) {
    return NextResponse.json({
      sent: false,
      detail:
        channel === "email"
          ? "This client has no email address on file."
          : "This client has no phone number on file.",
    });
  }

  const suppression = await isSuppressed(
    supabase as unknown as SupabaseClient,
    {
      facilityId: booking.facility_id,
      channel,
      address,
      isTransactional: true,
    },
  );
  if (suppression.suppressed) {
    return NextResponse.json({
      sent: false,
      detail:
        suppression.reason === "invalid_address"
          ? "The address on file is not one a message can be sent to."
          : "This client has opted out of these messages.",
    });
  }

  // What the pay page will ask for: the balance, with the facility's tax on
  // top, from the same helper the page and the card route use.
  const taxCents = taxToAddCents(
    await facilityTaxConfig(
      supabase as unknown as SupabaseClient,
      booking.facility_id,
    ),
    owedCents,
  );
  const french = booking.clients.preferred_language?.startsWith("fr");
  const amount = formatMoney(
    (owedCents + taxCents) / 100,
    french ? "fr" : "en",
  );
  const link = `${facilityCustomerLinkOrigin(
    booking.facilities?.slug,
    request,
  )}/pay/${booking.ref}`;
  const facilityName = booking.facilities?.name ?? "";

  const result = await deliver(channel, address, {
    french: Boolean(french),
    amount,
    link,
    facilityName,
    clientName: booking.clients.name,
    ref: booking.ref,
  });

  return NextResponse.json(result);
}

/**
 * The message itself, in the client's language. Plain, short, and with the
 * link as the only call to action — it asks for money, so it says how much and
 * for what, and nothing else.
 */
function deliver(
  channel: Channel,
  address: string,
  m: {
    french: boolean;
    amount: string;
    link: string;
    facilityName: string;
    clientName: string;
    ref: number;
  },
) {
  const subject = m.french
    ? `${m.facilityName} : réservation n° ${m.ref}, ${m.amount} à payer`
    : `${m.facilityName}: booking #${m.ref}, ${m.amount} to pay`;
  const text = m.french
    ? `Bonjour ${m.clientName}, il reste ${m.amount} à payer pour la réservation n° ${m.ref} chez ${m.facilityName}. Payez en ligne : ${m.link}`
    : `Hi ${m.clientName}, ${m.amount} is still owed on booking #${m.ref} at ${m.facilityName}. Pay online: ${m.link}`;

  if (channel === "sms") return sendSms({ to: address, body: text });

  const html = `<p>${escapeHtml(text.split(m.link)[0])}<a href="${escapeHtml(
    m.link,
  )}">${escapeHtml(m.link)}</a></p>`;
  return sendEmail({ to: address, subject, text, html });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
