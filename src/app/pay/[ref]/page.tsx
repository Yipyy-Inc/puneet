import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { cloverConfig } from "@/lib/clover/config";
import { chargeableConnection } from "@/lib/clover/connection";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import { tipStillToCollect } from "@/lib/payments/pledged-tip";
import { tipConfigSchema, type TipConfig } from "@/types/facility";
import { SETTING_DOMAINS } from "@/lib/settings/domains";
import { customerText } from "@/lib/customer/text";
import type { AppLocale } from "@/lib/language-settings";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";

import { PayBooking } from "./_components/pay-booking";
import { PayNotice } from "./_components/pay-notice";

// ============================================================================
// Paying a booking by card.
//
// ── WHY THIS IS NOT UNDER A PORTAL ────────────────────────────────────────
//
// Two different people legitimately open this URL: the customer who owes the
// money, and a member of staff standing at the counter with that customer's
// card. Putting it under /customer or /facility would mean picking one of them
// and making the other take a detour to the same booking.
//
// So it sits at the top level and lets `bookings_read` decide — the same policy
// the charge route relies on. It admits a platform admin, the client the
// booking belongs to, or someone with view_bookings at the facility. If the row
// comes back the caller is one of those; if it does not, they are not.
//
// A booking that does not exist and a booking the caller may not see both get
// notFound(). Which of the two it was is not theirs to learn.
//
// ── THE AMOUNT IS READ HERE, NOT PASSED IN ────────────────────────────────
//
// `amount_due - amount_paid`, off the row. It is shown to the customer and sent
// to the browser for the button label only — the charge route reads the same
// two columns again when the token comes back, so a page left open while
// somebody takes a payment at the counter cannot charge the stale figure.
//
// ── THE CONNECTION IS READ WITH THE ADMIN CLIENT ──────────────────────────
//
// `payment_connections_read` admits facility members, and a customer paying
// their own booking is not one. The two fields the browser needs — the merchant
// id and the PUBLIC api key — are public by construction: they are handed to
// Clover's SDK in the page. No token is read here, and the read only happens
// after the booking above came back, so the caller has already proved they may
// see this booking.
// ============================================================================

export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  ref: number;
  facility_id: string;
  /** Whose booking it is — and therefore whose saved cards may be offered. */
  client_id: string | null;
  service: string | null;
  service_type: string | null;
  start_at: string | null;
  status: string;
  amount_due: number | null;
  amount_paid: number | null;
  /** The split between the service and what was added — see BookingBill. */
  total_cost: number | null;
  extras_total: number | null;
  taxable: boolean | null;
  /** The tip the booking carries: the owner's pledge, or one added when booking. */
  tip_amount: number | string | null;
  facilities: { name: string; timezone: string | null } | null;
}

/** Asked for, and not yet a booking: nothing is due until it is confirmed. */
const AWAITING = new Set(["request_submitted", "estimate_sent", "waitlisted"]);

export default async function PayBookingPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isInteger(bookingRef) || bookingRef <= 0) notFound();

  const locale: AppLocale = (await getLocale()) === "fr" ? "fr" : "en";
  const t = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      customerText(locale, "pay", key),
    );

  const viewer = await getViewer();
  if (viewer.source !== "session") {
    // The PARSED ref, not the raw segment — "/pay/0896" and "/pay/896" are the
    // same booking, and only one of them should ever appear in a `next=`.
    redirect(`/sign-in?next=${encodeURIComponent(`/pay/${bookingRef}`)}`);
  }

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, facility_id, client_id, service, service_type, start_at, status, amount_due, amount_paid, total_cost, extras_total, taxable, tip_amount, facilities ( name, timezone )",
    )
    .eq("ref", bookingRef)
    .maybeSingle();

  const booking = data as BookingRow | null;
  if (!booking) notFound();

  const facilityName = booking.facilities?.name ?? t("theFacility");
  // Back to the booking, where this person reads it: a customer's own page,
  // or the facility's.
  const back = {
    href:
      viewer.memberships.length === 0 && !viewer.isPlatformAdmin
        ? `/customer/bookings/${booking.ref}`
        : `/facility/dashboard/bookings/${booking.ref}`,
    label: t("backToBooking"),
  };
  // The booking's day on the facility's own clock, not the server's.
  const startDay = booking.start_at
    ? wallClockParts(
        booking.start_at,
        booking.facilities?.timezone ?? DEFAULT_TIMEZONE,
      ).date
    : null;
  const owedCents = Math.round(
    (Number(booking.amount_due ?? 0) - Number(booking.amount_paid ?? 0)) * 100,
  );

  if (booking.status === "cancelled") {
    return (
      <PayNotice
        tone="neutral"
        title={t("cancelledTitle")}
        body={t("cancelledBody", { ref: booking.ref, facility: facilityName })}
        back={back}
      />
    );
  }

  // A request is priced at nothing until the facility accepts it, so it read
  // "Paid in full" — true of the number and false of the booking.
  if (AWAITING.has(booking.status)) {
    return (
      <PayNotice
        tone="waiting"
        title={t("notConfirmedTitle")}
        body={t("notConfirmedBody", { facility: facilityName })}
        back={back}
      />
    );
  }

  if (owedCents <= 0) {
    return (
      <PayNotice
        tone="paid"
        title={t("paidTitle")}
        body={t("paidBody", { ref: booking.ref })}
        back={back}
      />
    );
  }

  // Everything below is about whether a card CAN be taken. Each branch says
  // which part is missing rather than one blanket "unavailable", because the
  // person who can fix it is different in each case.
  // ── THE TIPS THIS FACILITY OFFERS ───────────────────────────────────────
  //
  // Read with the ADMIN client for the same reason the connection below is:
  // `facility_settings` is readable by facility members, and a customer paying
  // their own booking is not one. An RLS-scoped read returns nothing here and
  // the page would silently offer no tips at all.
  //
  // Safe to read this way because the booking above already came back — the
  // caller has proved they may see it — and because tip suggestions are shown
  // to this person anyway. Nothing else from the row is used.
  const tipConfig = await tipsFor(booking.facility_id);
  // A tip the booking carries that no payment has collected starts the tip
  // control — only where the facility offers tips, because a tip the payer
  // cannot see must never ride along into the charge.
  const pledgedTipCents = tipConfig
    ? Math.round(
        tipStillToCollect(
          booking.tip_amount === null ? 0 : Number(booking.tip_amount),
          await tipsCollected(booking.id),
        ) * 100,
      )
    : 0;
  // The tax the card route will ADD, shown before the card is asked for — the
  // same helper, so what is shown here is what is charged
  // (lib/payments/booking-tax). Admin client for the reason tips use one.
  const taxCents = taxToAddCents(
    await facilityTaxConfig(createAdminClient(), booking.facility_id),
    owedCents,
    booking,
  );

  const connection = await chargeableConnection(booking.facility_id);
  if (!connection) {
    return (
      <PayNotice
        tone="problem"
        title={t("noMerchantTitle")}
        body={t("noMerchantBody", { facility: facilityName })}
        back={back}
      />
    );
  }

  // The merchant's OWN estate. This decides which Clover the BROWSER loads its
  // SDK from, so a sandbox merchant served production's sdk.js would tokenise
  // against an account that does not exist there.
  const config = cloverConfig(connection.environment);
  if (!config) {
    return (
      <PayNotice
        tone="problem"
        title={t("notSetUpTitle")}
        body={t("notSetUpBody")}
        back={back}
      />
    );
  }

  // Both are refusals rather than defaults. A missing currency would mean
  // guessing what a merchant settles in, and a missing key would mean the card
  // fields could not be rendered at all.
  if (!connection.currency || !connection.publicApiKey) {
    return (
      <PayNotice
        tone="problem"
        title={t("notReadyTitle")}
        body={t("notReadyBody", { facility: facilityName })}
        back={back}
      />
    );
  }

  return (
    <PayBooking
      bookingId={booking.id}
      bookingRef={booking.ref}
      clientId={booking.client_id}
      facilityName={facilityName}
      service={booking.service}
      serviceType={booking.service_type}
      startDay={startDay}
      backHref={back.href}
      amountCents={owedCents + taxCents}
      taxCents={taxCents}
      currency={connection.currency}
      merchantId={connection.merchantId}
      publicApiKey={connection.publicApiKey}
      sdkUrl={config.checkoutSdkUrl}
      tipConfig={tipConfig}
      pledgedTipCents={pledgedTipCents}
    />
  );
}

/**
 * The facility's tip settings, or null when they offer none.
 *
 * Null covers three cases that are one case to the payer: tips switched off, a
 * facility that never configured them, and a row that fails the schema. In all
 * three the page shows no tip control rather than inventing percentages — this
 * page hardcoded 10/15/20 until 2026-08-26, which is what it is replacing.
 */
async function tipsFor(facilityId: string): Promise<TipConfig | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("facility_settings")
      .select("value")
      .eq("facility_id", facilityId)
      .eq("domain", "tip_config")
      .maybeSingle();

    // An unconfigured facility gets the SAME fallback the settings API would
    // report and the Settings screen shows, taken from the domain registry
    // rather than restated here. Restating it is how this page came to offer
    // 10/15/20 while the checkout dialog offered its own three.
    const stored = tipConfigSchema.safeParse(data?.value);
    const config = stored.success
      ? stored.data
      : (SETTING_DOMAINS.tip_config.fallback as TipConfig);

    return config.enabled ? config : null;
  } catch {
    // A tip is optional; a payment is not. Never let this stop the page.
    return null;
  }
}

/**
 * The tips this booking's payments collected, net of refunds.
 *
 * Admin client, for the reason the tip settings use one: the booking above
 * already came back, so the caller may see it. A failed read counts as
 * everything collected — offering no tip is recoverable, and asking again for
 * a tip that was paid is not.
 */
async function tipsCollected(bookingId: string): Promise<number> {
  try {
    const { data, error } = await createAdminClient()
      .from("payments")
      .select("tip")
      .eq("booking_id", bookingId);
    if (error) return Number.POSITIVE_INFINITY;
    return (data ?? []).reduce((sum, row) => sum + Number(row.tip ?? 0), 0);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
