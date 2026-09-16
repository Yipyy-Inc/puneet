import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";

// ============================================================================
// The facility's OWN subscription — what it is on, and what it costs.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// Settings → Subscription rendered `subscription` from `src/data/settings`: one
// invented plan at one invented price, with a renewal date in the fixture's
// calendar. Every facility read the same card, and none of them read their own.
//
// The row has been there the whole time (`facility_subscriptions`, one per
// facility). Its RLS policy already answers exactly the right question —
// `private.is_facility_admin(facility_id)` — so this route adds no boundary of
// its own beyond taking the facility from the SESSION rather than the request
// (check:facility-from-session).
//
// ── A FACILITY WITH NO ROW IS NOT AN ERROR ────────────────────────────────
//
// It is a facility nobody has put on a plan yet, which is the normal state the
// day it is provisioned. The answer is `subscription: null` and the screen says
// so, rather than a 404 the card would have to translate into a scary sentence.
//
// The account-side billing screens (/facility/account/subscription and its
// neighbours) still read the `facility-billing` fixtures; converting those is
// the platform-billing work, not this. Debt map.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_subscriptions")
    .select(
      "tier_id, tier_name, status, billing_cycle, amount_cents, currency, seats, trial_ends_at, period_start, period_end, cancelled_at",
    )
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ subscription: null });
  }

  return NextResponse.json({
    subscription: {
      tierId: data.tier_id,
      tierName: data.tier_name,
      status: data.status,
      billingCycle: data.billing_cycle,
      amountCents: data.amount_cents,
      currency: data.currency,
      seats: data.seats,
      trialEndsAt: data.trial_ends_at,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      cancelledAt: data.cancelled_at,
    },
  });
}
