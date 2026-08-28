import { ReviewSurvey } from "./_components/review-survey";

// ============================================================================
// The survey link a client taps.
//
// A SERVER COMPONENT that reads the token out of `params` and hands it down.
// It was `"use client"` with `useParams()`, which is against the rule in
// CLAUDE.md — pages are Server Components by default, and only the interactive
// part below the page carries "use client".
//
// The token is a route PARAM rather than a query string so the link survives
// being pasted, forwarded and rendered by a phone's link detector, and so the
// path itself is what expiry and single-use apply to.
// ============================================================================

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ReviewSurvey token={token} />;
}
