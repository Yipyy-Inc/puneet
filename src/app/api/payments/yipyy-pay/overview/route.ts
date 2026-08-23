import { NextResponse } from "next/server";

import {
  activeAdminFacility,
  getFacilityContext,
} from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { cloverConfig } from "@/lib/clover/config";
import { connectionStatus } from "@/lib/clover/status";
import { validAccessToken } from "@/lib/clover/connection";
import {
  fetchMerchantSummary,
  type MerchantSummary,
} from "@/lib/clover/merchant";
import { estimatePayouts, type EstimatedPayout } from "@/lib/clover/payouts";
import {
  NO_YIPYY_PAY,
  yipyyPayConfigSchema,
  type YipyyPayConfig,
} from "@/lib/settings/yipyy-pay";

// ============================================================================
// Everything the Yipyy Pay dashboard shows, in one request.
//
// ── WHY ONE ROUTE AND NOT FOUR ────────────────────────────────────────────
//
// Account status, the merchant read-back, upcoming payouts and recent activity
// are four reads that are only ever rendered together, and three of them are
// cheap Postgres queries. Four round trips would give the Overview tab four
// independent loading states and four ways to be half-drawn.
//
// The one genuinely slow read — asking a physical terminal whether it is awake
// — is deliberately NOT here. It costs ~40 seconds and belongs behind a button.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// Never the request. This returns a merchant id, a bank-facing summary and a
// list of what a business took last week; a caller who could name the facility
// could read a competitor's takings. `check:facility-from-session` fails the
// build on the other shape.
//
// ── AND IT NEVER RETURNS A TOKEN ──────────────────────────────────────────
//
// `connectionStatus` selects columns by name and the token is not among them.
// The access token IS read here, but only to make one call to Clover from the
// server; it does not enter the response.
// ============================================================================

export const dynamic = "force-dynamic";

/** How far back to look for money that has not settled yet. */
const PAYOUT_WINDOW_DAYS = 10;
/** The Overview tab shows five. Read a few more so refunds cannot empty it. */
const ACTIVITY_LIMIT = 8;

interface ActivityRow {
  id: string;
  created_at: string;
  grand_total: number;
  tip: number | null;
  method: string;
  card_brand: string | null;
  card_last4: string | null;
  entry_method: string | null;
  refund_of_payment_id: string | null;
  bookings: {
    ref: number;
    service: string | null;
    clients: { name: string } | null;
    booking_pets: { pets: { name: string } | null }[] | null;
  } | null;
}

/** "Grooming — Buddy (Alice Johnson)", or as much of it as the row knows. */
function describe(row: ActivityRow): string {
  const booking = row.bookings;
  if (!booking) return "Payment";
  const pets = (booking.booking_pets ?? [])
    .map((link) => link.pets?.name)
    .filter((name): name is string => Boolean(name));
  const service = booking.service
    ? booking.service.charAt(0).toUpperCase() + booking.service.slice(1)
    : "Booking";
  const who = booking.clients?.name;
  const subject = pets.length ? pets.join(", ") : `#${booking.ref}`;
  return who ? `${service} — ${subject} (${who})` : `${service} — ${subject}`;
}

/**
 * What the row is, in the four words a status badge can hold.
 *
 * Derived from the ledger rather than stored: a `payments` row exists only
 * because money moved, so there is no "failed" state to read — a declined card
 * never becomes a payment. "Failed" appears on this screen only for an intent
 * that was approved and never reconciled, which is a different query and a
 * different alarm (`public.unreconciled_payments`).
 */
function statusOf(row: ActivityRow): "paid" | "refunded" {
  return row.refund_of_payment_id || Number(row.grand_total) < 0
    ? "refunded"
    : "paid";
}

export async function GET() {
  const configured = cloverConfig() !== null;
  const active = await activeAdminFacility();

  if (active.kind === "none") {
    return NextResponse.json(
      { error: "Only an owner or administrator can see Yipyy Pay." },
      { status: 403 },
    );
  }

  // Two facilities and a hostname that names neither. Answered rather than
  // guessed — the same shape /status uses, so the screen has one branch for it.
  if (active.kind === "ambiguous") {
    return NextResponse.json({
      ambiguous: true,
      choices: active.choices,
      configured,
    });
  }

  const facilityId = active.facility.id;
  const supabase = await createServerClient();
  const context = await getFacilityContext(facilityId);
  const timeZone = context?.timeZone ?? "America/Toronto";

  const connection = await connectionStatus(facilityId);

  // ── The facility's own preferences ──────────────────────────────────────
  //
  // Read here rather than trusted from the client: the payout estimate depends
  // on the schedule, and a browser that could name its own schedule could make
  // the arrival dates say anything.
  const { data: settingRow } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "yipyy_pay_config")
    .maybeSingle();

  const parsed = settingRow
    ? yipyyPayConfigSchema.safeParse(settingRow.value)
    : null;
  // A row that fails its schema is IGNORED in favour of the default, the same
  // way /api/facility/settings treats it. A half-understood money setting is
  // worse than none.
  const config: YipyyPayConfig = parsed?.success ? parsed.data : NO_YIPYY_PAY;

  // ── Who Clover says this merchant is ────────────────────────────────────
  //
  // Best effort. It decorates the setup screen; it does not gate anything, so a
  // rate limit here must not make a connected facility look disconnected.
  let merchant: MerchantSummary | null = null;
  if (connection.connected && connection.merchantId) {
    const token = await validAccessToken(facilityId).catch(() => null);
    if (token) {
      // The token carries the estate it is good against. Re-deriving it from
      // the connection row would be a second answer to the same question, and
      // the two disagree the moment a facility reconnects on the other one.
      merchant = await fetchMerchantSummary(
        token.accessToken,
        token.merchantId,
        token.environment,
      ).catch(() => null);
    }
  }

  // ── Where the facility trades ───────────────────────────────────────────
  //
  // Real rows, not the multi-location fixture. The setup wizard hides its
  // location control entirely when there is one — a single-site business should
  // not be asked to choose between its one site and itself — and it can only
  // make that judgement from something that knows how many there are.
  const { data: locationRows } = await supabase
    .from("locations")
    .select("id, name, is_primary")
    .eq("facility_id", facilityId)
    .order("is_primary", { ascending: false })
    .order("name");

  // ── Money ───────────────────────────────────────────────────────────────
  //
  // Only Clover rows: cash and store credit never reach a bank account, and
  // including them would inflate a payout estimate by whatever the facility
  // took over the counter.
  const since = new Date(
    Date.now() - PAYOUT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: settling } = await supabase
    .from("payments")
    .select("created_at, grand_total")
    .eq("facility_id", facilityId)
    .eq("processor", "clover")
    .gte("created_at", since);

  const payouts: EstimatedPayout[] = estimatePayouts(
    (settling ?? []).map((row) => ({
      createdAt: row.created_at as string,
      // Cents. `grand_total` is numeric dollars in the ledger and already
      // negative on a reversal — see the note in PayoutInput.
      amountCents: Math.round(Number(row.grand_total) * 100),
    })),
    config.payoutSchedule,
    timeZone,
    new Date(),
  );

  // ── Recent activity ─────────────────────────────────────────────────────
  //
  // ONE string literal for the select. supabase-js infers the row type from it
  // at the type level, and a concatenation is just `string` to the compiler —
  // every column silently becomes an error type.
  const { data: recent } = await supabase
    .from("payments")
    .select(
      "id, created_at, grand_total, tip, method, card_brand, card_last4, entry_method, refund_of_payment_id, bookings ( ref, service, clients ( name ), booking_pets ( pets ( name ) ) )",
    )
    .eq("facility_id", facilityId)
    .eq("processor", "clover")
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  const activity = ((recent ?? []) as unknown as ActivityRow[]).map((row) => ({
    id: row.id,
    at: row.created_at,
    description: describe(row),
    // Cents, sign preserved. A refund stays negative so the screen can render
    // it as money returned rather than money taken.
    amountCents: Math.round(Number(row.grand_total) * 100),
    tipCents: Math.round(Number(row.tip ?? 0) * 100),
    status: statusOf(row),
    cardBrand: row.card_brand,
    cardLast4: row.card_last4,
    /** "terminal" is card-present; anything else came in over the web. */
    entry: row.method === "terminal" ? "card_present" : "card_not_present",
  }));

  return NextResponse.json({
    configured,
    facility: { name: active.facility.name, slug: active.facility.slug },
    connection,
    merchant,
    config,
    locations: (locationRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      isPrimary: row.is_primary,
    })),
    payouts,
    activity: activity.slice(0, 5),
    /**
     * Whether the ledger has anything at all, so the Overview tab can tell
     * "this facility has taken no card payments yet" from "the last five were
     * all more than ten days ago". An empty list means neither on its own.
     */
    hasActivity: activity.length > 0,
  });
}
