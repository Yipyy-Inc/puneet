import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The client's side of a review request. Unauthenticated, token-bearing, and
// RPC-only.
//
// ── EVERY CALL IS AN RPC, AND THAT IS NOT A STYLE CHOICE ──────────────────
//
// There is no `.from("review_requests")` in this file and there cannot be one
// that works: `anon` has no policy on those tables and the grants were revoked
// explicitly (20260829090000). The only anon surface is three SECURITY DEFINER
// functions that take the token as an ARGUMENT, hash it, and hit a unique
// index. A policy shaped "anon may read where token = ?" would be a table-scan
// oracle — the argument 20260803180000 makes at length, and the reason this
// route is a copy of `/api/onboard/[token]` rather than something new.
//
// The client is the ordinary cookie-bound one, NOT a second anon factory: a
// customer opening this from an SMS has no session, so that client already IS
// anon.
//
// ── EVERY FAILURE IS THE SAME 404 ─────────────────────────────────────────
//
// Expired, already answered, suppressed, cancelled, never existed. The RPC does
// not tell this route which case it hit, and this route would not say if it
// knew. A caller working through tokens learns exactly one bit, about the one
// token they hold.
//
// ── WHAT REPLACED WHAT ────────────────────────────────────────────────────
//
// The previous survey resolved its "token" — which was the request id, and the
// ids were sequential — out of `localStorage`. Measured 2026-08-28: opening the
// link in any browser that had not created the request showed a spinner for
// ever. So this route is not an improvement on that mechanism; it is the first
// version of it that can work at all.
// ============================================================================

export const dynamic = "force-dynamic";

const NOT_FOUND = { error: "This review link is not valid." };

/**
 * What the survey page may send.
 *
 * Note what is NOT here: the facility, the client, the staff member's identity
 * as a name, the escalation threshold. Every one of those is read from the
 * request row inside the function. A caller supplies a rating and their own
 * words; everything about WHO this concerns comes from the token.
 */
const answerSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).optional(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
  /** "Who looked after Nala?", when the visit had more than one person. */
  staffId: z.string().uuid().optional(),
  displayConsent: z.boolean().optional(),
  locale: z.string().max(12).optional(),
  source: z
    .enum(["sms_link", "email_link", "report_card", "portal", "kiosk", "staff"])
    .optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("review_request_by_token", {
    p_token: token,
  });

  if (error || !data) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const parsed = answerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not an answer.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const answer = parsed.data;

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("submit_review_response", {
    p_token: token,
    p_rating: answer.rating,
    // `undefined` rather than `null` for the optional arguments: the generated
    // RPC types model a Postgres DEFAULT as an absent key, and PostgREST omits
    // an undefined one so the function's own default applies. Sending null
    // would OVERRIDE the default with null, which for `p_source` would fail the
    // CHECK rather than fall back to 'sms_link'.
    p_comment: answer.comment,
    p_tag_ids: answer.tagIds ?? [],
    p_staff_id: answer.staffId,
    p_display_consent: answer.displayConsent ?? false,
    p_locale: answer.locale,
    p_source: answer.source ?? "sms_link",
  });

  if (error) {
    // 42501 is both "no such live token" and "already answered", deliberately.
    // The page shows its read-only state either way, and re-fetching with GET
    // tells it which — through the same token it already holds.
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
  return NextResponse.json(data);
}
