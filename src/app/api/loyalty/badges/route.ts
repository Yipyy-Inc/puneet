import { NextResponse } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Who earned which badge here, and what they spent around it.
//
// ── WHY THE SPEND COMES BACK TOO ──────────────────────────────────────────
//
// The Badge Achievement report asks one question — "are our badge conditions
// set right?" — and answers it with two numbers a badge alone cannot give: how
// long a member took to earn it, and whether they spent more afterwards. Both
// need the member's payment history around the earn date.
//
// It read `src/data/loyalty-spend-events.ts` for that: a GENERATED monthly
// series with a deliberate uplift built into it, so the report always showed a
// revenue bump after every badge because the fixture was written to. A
// facility reading it was being told their badges worked by a file.
//
// ── ONLY THE EARNERS' SPEND ───────────────────────────────────────────────
//
// The metric compares each EARNER's before and after; a member who has earned
// nothing contributes to neither. Fetching the whole facility's payment history
// to then ignore most of it would be a large read for no answer.
//
// ── AND THE MEMBER KEY IS THE ACCOUNT ─────────────────────────────────────
//
// `loyalty_account_id`, not a client ref or a name. It is the key both halves
// already carry, it is stable, and it is the one thing that cannot be two
// different members by accident.
// ============================================================================

export const dynamic = "force-dynamic";

export interface BadgeAwardsPayload {
  awards: { memberId: string; badgeId: string; earnedAt: string }[];
  /** Every payment made by a member who has earned at least one badge. */
  spend: { memberId: string; date: string; amount: number }[];
}

const EMPTY: BadgeAwardsPayload = { awards: [], spend: [] };

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();

  // RLS decides this, not the route: `loyalty_badge_awards_read` wants
  // `marketing_view`. Somebody without it reads nothing and the report is
  // empty rather than refused, which is the same shape every other loyalty
  // read here takes.
  const { data: awardRows, error } = await supabase
    .from("loyalty_badge_awards")
    .select("account_id, badge_id, earned_at")
    .eq("facility_id", context.facilityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const awards = (
    (awardRows ?? []) as {
      account_id: string;
      badge_id: string;
      earned_at: string;
    }[]
  ).map((a) => ({
    memberId: a.account_id,
    badgeId: a.badge_id,
    earnedAt: a.earned_at,
  }));

  if (awards.length === 0) {
    return NextResponse.json(EMPTY satisfies BadgeAwardsPayload);
  }

  const accountIds = [...new Set(awards.map((a) => a.memberId))];

  const { data: accountRows } = await supabase
    .from("loyalty_accounts")
    .select("id, client_id")
    .in("id", accountIds);

  const accountByClient = new Map(
    ((accountRows ?? []) as { id: string; client_id: string }[]).map((a) => [
      a.client_id,
      a.id,
    ]),
  );

  // What they actually PAID, dated by when the service was, not by when the
  // row was last touched. `updated_at` moves whenever anybody edits a booking,
  // which would scatter a member's history across the wrong months.
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("client_id, amount_paid, start_at")
    .eq("facility_id", context.facilityId)
    .in("client_id", [...accountByClient.keys()])
    .gt("amount_paid", 0);

  const spend = (
    (bookingRows ?? []) as {
      client_id: string;
      amount_paid: string | number;
      start_at: string;
    }[]
  ).flatMap((b) => {
    const memberId = accountByClient.get(b.client_id);
    return memberId
      ? [{ memberId, date: b.start_at, amount: Number(b.amount_paid) }]
      : [];
  });

  return NextResponse.json({ awards, spend } satisfies BadgeAwardsPayload);
}
