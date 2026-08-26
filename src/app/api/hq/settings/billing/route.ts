import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import type { HqNetworkSubscription } from "@/types/hq-billing";

// ============================================================================
// The facility's own subscription, for HQ Settings' Network Billing card.
//
// `facility_subscriptions` + `subscription_tiers` are real (20260807540000 /
// 20260807560000). There is no "network bundle vs per-location" billing mode
// column and no per-extra-location surcharge rate anywhere in the schema —
// those were invented for the fixture. The card built on this route shows
// what the row actually holds: the plan, its price, its location cap.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const active = await activeAdminFacility();
  if (active.kind === "none") {
    return NextResponse.json(
      { error: "Only an owner or administrator can see this." },
      { status: 403 },
    );
  }
  if (active.kind === "ambiguous") {
    return NextResponse.json(
      { error: "Open the facility you mean at its own address." },
      { status: 409 },
    );
  }

  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's billing." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data: sub, error } = await supabase
    .from("facility_subscriptions")
    .select(
      "tier_id, tier_name, status, billing_cycle, amount_cents, currency, trial_ends_at, period_end",
    )
    .eq("facility_id", active.facility.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not read this facility's subscription." },
      { status: 502 },
    );
  }
  if (!sub) {
    return NextResponse.json({ subscription: null });
  }

  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("max_locations")
    .eq("id", sub.tier_id)
    .maybeSingle();

  const subscription: HqNetworkSubscription = {
    tierId: sub.tier_id,
    tierName: sub.tier_name,
    status: sub.status,
    billingCycle: sub.billing_cycle,
    amountCents: sub.amount_cents,
    currency: sub.currency,
    trialEndsAt: sub.trial_ends_at,
    periodEnd: sub.period_end,
    maxLocations: tier?.max_locations ?? null,
  };

  return NextResponse.json({ subscription });
}
