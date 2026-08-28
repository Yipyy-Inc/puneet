import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Following the public review link.
//
// ── WHY A REDIRECT AND NOT A FETCH ────────────────────────────────────────
//
// The client taps "Review us on Google" and must land on Google. If the page
// fetched the destination and then navigated, the click would be recorded even
// when the navigation never happened — a pop-up blocker, a back button, a
// closed tab — and "public click rate" would count intentions rather than
// clicks. A 302 records exactly the ones the browser actually followed.
//
// ── THE DESTINATION IS NOT A PARAMETER ────────────────────────────────────
//
// The caller names a CHANNEL ID, and the function resolves the URL from the
// row. An open redirect that took a URL would be a phishing endpoint on the
// facility's own domain, sent by SMS, in their name — and the whole point of
// this link is that customers trust it.
//
// The function also refuses a channel that is not enabled, not this facility's,
// or not solicitable, so Yelp cannot be reached even by naming its id.
//
// ── A FAILURE IS A DEAD END, NOT AN ERROR PAGE ────────────────────────────
//
// Anything unresolvable sends them back to the survey rather than to a stack
// trace. They have already given their rating by this point; the click is the
// bonus, and a broken one must not read as "your review was not saved".
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const channelId = request.nextUrl.searchParams.get("channel");

  const back = new URL(`/review/${encodeURIComponent(token)}`, request.url);
  if (!channelId) return NextResponse.redirect(back, 302);

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("record_review_click", {
    p_token: token,
    p_channel_id: channelId,
  });

  const destination = typeof data === "string" ? data : null;
  if (error || !destination) return NextResponse.redirect(back, 302);

  // The RPC only ever returns a URL it built from a row it owns, so there is
  // nothing here a caller could have influenced. Parsed anyway: a malformed
  // `profile_url` typed into the channel manager would otherwise become a
  // redirect to a relative path on this origin.
  let target: URL;
  try {
    target = new URL(destination);
  } catch {
    return NextResponse.redirect(back, 302);
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.redirect(back, 302);
  }

  return NextResponse.redirect(target, 302);
}
