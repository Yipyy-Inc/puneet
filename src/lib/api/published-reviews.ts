import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

// ============================================================================
// The reviews a facility put on its own public page, read by somebody who has
// not signed in and is not going to.
//
// ── WHY THIS IS A LIB AND NOT JUST THE ROUTE ──────────────────────────────
//
// There are two readers — /api/public/reviews/[slug] and the page itself — and
// "which reviews are published" is a rule with four conditions behind it. Two
// implementations of that rule is how a header average comes to disagree with
// the list underneath it, which is one of the audit's own findings appearing in
// a new place. So the rule lives in the database, and this is the only thing
// that calls it.
//
// ── WHY AN ANON CLIENT, NAMED AS SUCH ─────────────────────────────────────
//
// The same argument facility-branding.ts makes: `createServerClient()` carries
// the caller's session and there is no caller. It would resolve to anonymous
// anyway, so this says it honestly — nobody can later "fix" this by adding a
// session it cannot have.
//
// The two RPCs are SECURITY DEFINER projections (20260829200000). The tables
// stay unreachable by anon on purpose: a policy filters rows, not columns, and
// the row carries the client's identity, the attributed staff member and the
// moderation history.
// ============================================================================

export interface PublishedReview {
  id: string;
  rating: number;
  comment: string;
  /** A first name and an initial — "Sarah M.", never "Sarah Mitchell". */
  author: string;
  serviceType: string;
  submittedAt: string;
}

export interface PublishedReviewSummary {
  count: number;
  average: number | null;
}

export interface PublishedReviews {
  reviews: PublishedReview[];
  summary: PublishedReviewSummary;
}

/** What a facility with nothing published looks like — and an unknown slug. */
const NOTHING: PublishedReviews = {
  reviews: [],
  summary: { count: 0, average: null },
};

/**
 * The published reviews for a facility slug.
 *
 * An unknown slug and a facility that has published nothing are the SAME
 * answer, deliberately: an empty wall. A 404 here would turn this into a way to
 * ask which businesses are on Yipyy.
 */
export async function getPublishedReviews(
  slug: string,
  limit = 20,
): Promise<PublishedReviews> {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return NOTHING;

  let config: ReturnType<typeof supabaseConfig>;
  try {
    config = supabaseConfig();
  } catch {
    // Supabase not configured here. A public page that cannot reach the
    // database still renders — without a review wall, never with a broken one.
    return NOTHING;
  }

  const supabase = createClient<Database>(config.url, config.publishableKey);

  const [list, summary] = await Promise.all([
    supabase.rpc("published_reviews_for", {
      p_slug: trimmed,
      p_limit: Number.isFinite(limit) ? limit : 20,
    }),
    supabase.rpc("published_review_summary", { p_slug: trimmed }),
  ]);

  if (list.error) return NOTHING;

  const reviews: PublishedReview[] = (list.data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    author: row.author,
    serviceType: row.service_type,
    submittedAt: row.submitted_at,
  }));

  // The summary is computed by the database over exactly the rows the list
  // returns, so it cannot disagree with them. Falling back to counting the
  // list here would reintroduce the second implementation this file exists to
  // avoid — so an errored summary is reported as the empty one.
  const raw = summary.error
    ? null
    : (summary.data as PublishedReviewSummary | null);

  return {
    reviews,
    summary: {
      count: Number(raw?.count ?? 0),
      average: raw?.average == null ? null : Number(raw.average),
    },
  };
}
