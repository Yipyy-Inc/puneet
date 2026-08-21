import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { computeEarnings } from "@/lib/loyalty/engine-earn";
import { getActiveEarnRules } from "@/lib/loyalty/earn-rule-versioning";
import { NO_LOYALTY_PROGRAM } from "@/lib/settings/loyalty";
import { createServerClient } from "@/lib/supabase/server";
import type { LoyaltyEvent } from "@/lib/loyalty/engine";
import type { FacilityLoyaltyConfig } from "@/types/loyalty";

// ============================================================================
// A booking earns its points.
//
// ── THE THING THAT WAS MISSING ────────────────────────────────────────────
//
// The earn RULES became real on 2026-08-21 (`facility_settings.loyalty_config`)
// and the LEDGER became real the same day. Nothing read one and wrote the
// other, so a facility could configure "1 point per dollar", a customer could
// spend £200, and their balance stayed where it was. Points arrived only when a
// member of staff typed them in.
//
// ── WHY A ROUTE AND NOT A DATABASE TRIGGER ────────────────────────────────
//
// The rules are a jsonb document interpreted by `computeEarnings` — schedule
// windows, per-service scope, tier multipliers, visit-count milestones, several
// hundred lines of TypeScript. Restating that in plpgsql would be a second
// implementation of the same rules, and the failure mode of a second
// implementation is that it disagrees with the first about what a customer is
// owed.
//
// So the engine stays in one language and runs HERE, on the server, where the
// booking and the rules are read under the caller's own RLS. What a browser
// sends is a booking reference; everything the award is computed from comes
// from the database.
//
// ── AND WHY IT CANNOT AWARD TWICE ─────────────────────────────────────────
//
// A checkout is retried — a missed toast, a refresh, a blip between the charge
// and the award. This route does NOT read "has this earned yet?" and then
// write, because between those two lines is exactly where the second caller
// arrives. It writes, and `loyalty_transactions_one_earn_per_booking` refuses
// the duplicate. A refusal is reported as "already earned" rather than as an
// error, because from the caller's point of view the desired state holds.
// ============================================================================

export const dynamic = "force-dynamic";

export interface EarnResult {
  /** False when the programme is off, or no rule matched. */
  awarded: boolean;
  /** True when this booking had already earned — not a failure. */
  alreadyEarned: boolean;
  points: number;
  /** One line per rule that fired, for the staff toast. */
  reasons: string[];
}

interface BookingRow {
  id: string;
  ref: number;
  client_id: string;
  service: string | null;
  service_type: string | null;
  amount_paid: string | number;
  total_cost: string | number;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    bookingRef?: number | string;
  } | null;

  const ref = Number(body?.bookingRef);
  if (!Number.isFinite(ref)) {
    return NextResponse.json(
      { error: "`bookingRef` is required." },
      {
        status: 400,
      },
    );
  }

  const supabase = await createServerClient();

  const { data: bookingData } = await supabase
    .from("bookings")
    .select(
      "id, ref, client_id, service, service_type, amount_paid, total_cost, updated_at",
    )
    .eq("facility_id", context.facilityId)
    .eq("ref", ref)
    .maybeSingle();

  const booking = bookingData as BookingRow | null;
  if (!booking) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  // ── THE PROGRAMME ────────────────────────────────────────────────────────
  const { data: settingRow } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", context.facilityId)
    .eq("domain", "loyalty_config")
    .maybeSingle();

  const config = {
    ...NO_LOYALTY_PROGRAM,
    ...((settingRow as { value?: Record<string, unknown> } | null)?.value ??
      {}),
    facilityId: 0,
  } as unknown as FacilityLoyaltyConfig;

  // Off means off. A facility that has not switched the programme on does not
  // quietly accrue a liability every time somebody pays.
  if (!config.enabled) {
    return NextResponse.json({
      awarded: false,
      alreadyEarned: false,
      points: 0,
      reasons: [],
    } satisfies EarnResult);
  }

  // ── THE ACCOUNT ──────────────────────────────────────────────────────────
  //
  // Opened on first earn rather than requiring somebody to enrol the customer
  // first. A programme that is running should not silently skip a paying
  // customer because nobody pressed a button on their file.
  const existing = await supabase
    .from("loyalty_accounts")
    .select("id, points_balance")
    .eq("facility_id", context.facilityId)
    .eq("client_id", booking.client_id)
    .maybeSingle();

  let accountId = (existing.data as { id: string } | null)?.id;
  if (!accountId) {
    const { data: created, error: createError } = await supabase
      .from("loyalty_accounts")
      .insert({
        facility_id: context.facilityId,
        client_id: booking.client_id,
      })
      .select("id")
      .single();
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    accountId = (created as { id: string }).id;
  }

  // ── WHAT THE RULES SAY ───────────────────────────────────────────────────
  //
  // `amount_paid` rather than `total_cost`: points are earned on money that
  // arrived. A booking discounted to nothing, or unpaid, has not spent
  // anything, and awarding against a quote would pay a customer for a bill they
  // never settled.
  const amount = Number(booking.amount_paid) || 0;

  // How many paid visits this facility has seen from them, including this one —
  // what a visit-count milestone rule counts.
  const { count: paidVisits } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("facility_id", context.facilityId)
    .eq("client_id", booking.client_id)
    .gt("amount_paid", 0);

  const visitNumber = paidVisits ?? 1;

  const event: LoyaltyEvent = {
    type: "booking_completed",
    id: booking.id,
    facilityId: 0,
    customerId: booking.ref,
    occurredAt: booking.updated_at,
    amount,
    serviceType: booking.service_type ?? booking.service ?? undefined,
    isService: true,
    isFirstBooking: visitNumber <= 1,
  };

  const outcomes = computeEarnings(
    getActiveEarnRules(config.earnRules ?? []),
    event,
    config,
    {
      // ── NO TIER BOOST YET, AND SAYING SO ──────────────────────────────
      //
      // `computeEarnings` multiplies spend/booking/visit rules by the
      // customer's tier multiplier. Nothing resolves a customer INTO a tier
      // yet — `current_tier_id` is a column a person sets by hand, and the
      // engine that would move it against spend and visits is not built.
      //
      // So this is 1: every customer earns the base rate. A first draft looked
      // the tier up and passed `tier ? 1 : 1`, which is 1 either way and reads
      // as though a boost were being applied. Better to be plainly unbuilt than
      // to look finished. Recorded in the debt map.
      tierMultiplier: 1,
      visitNumber,
    },
  );

  const points = outcomes.reduce((sum, o) => sum + o.points, 0);
  if (points <= 0) {
    return NextResponse.json({
      awarded: false,
      alreadyEarned: false,
      points: 0,
      reasons: outcomes.map((o) => o.description),
    } satisfies EarnResult);
  }

  // ── POST IT, AND LET THE DATABASE REFUSE A SECOND ────────────────────────
  const { error } = await supabase.from("loyalty_transactions").insert({
    facility_id: context.facilityId,
    account_id: accountId,
    kind: "earned",
    points,
    description:
      outcomes.map((o) => o.description).join("; ") ||
      `Points for booking #${booking.ref}`,
    source: "booking",
    source_id: booking.id,
    booking_id: booking.id,
  });

  if (error) {
    // 23505 is the one-earn-per-booking index doing its job. The caller asked
    // for this booking to have earned; it has. That is not a failure.
    if (error.code === "23505") {
      return NextResponse.json({
        awarded: false,
        alreadyEarned: true,
        points: 0,
        reasons: [],
      } satisfies EarnResult);
    }
    const denied = error.message.includes("permission");
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 400 },
    );
  }

  return NextResponse.json({
    awarded: true,
    alreadyEarned: false,
    points,
    reasons: outcomes.map((o) => o.description),
  } satisfies EarnResult);
}
