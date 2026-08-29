import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The reviews a facility has put on its own booking page.
//
// ── PUBLIC ON PURPOSE, AND NARROW BECAUSE OF IT ───────────────────────────
//
// Anybody deciding whether to book can read this without an account, which is
// the whole point of a testimonial. So it is RPC-only: `anon` has no policy on
// `review_responses` and cannot be given one that filters COLUMNS, and the row
// carries the client's identity through the request, the attributed staff
// member and the moderation history. The function returns a rating, some words,
// a first name and a date. Nothing else exists to leak.
//
// ── WHAT MAKES A REVIEW APPEAR HERE ───────────────────────────────────────
//
// Somebody at the facility pressed "Show on booking page" — `moderation_state`
// = 'live', not 'approved'. Approved means a person said yes; live means they
// put it up, and publishing on the former would take the decision away from
// them. The function restates the eligibility rule as well, so a row that
// reached `live` by some other route still cannot be published without a
// comment, without consent, or below the facility's own minimum.
//
// ── AND WHAT DOES NOT HAPPEN HERE ─────────────────────────────────────────
//
// This is not Google. It never was and this route does not pretend otherwise —
// these are the facility's own words on the facility's own page, and the
// screen that publishes them says so.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const supabase = await createServerClient();

  const [reviews, summary] = await Promise.all([
    supabase.rpc("published_reviews_for", {
      p_slug: slug,
      p_limit: Number.isFinite(limit) ? limit : 20,
    }),
    supabase.rpc("published_review_summary", { p_slug: slug }),
  ]);

  // A facility with no published reviews and a slug that does not exist are the
  // same answer on purpose: an empty list. A 404 here would turn this into a
  // way to ask which businesses are on Yipyy.
  if (reviews.error) {
    return NextResponse.json({
      reviews: [],
      summary: { count: 0, average: null },
    });
  }

  return NextResponse.json({
    reviews: reviews.data ?? [],
    summary: summary.data ?? { count: 0, average: null },
  });
}
