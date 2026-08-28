// ============================================================================
// The survey page's data layer.
//
// Deliberately NOT a `src/lib/api/reputation.ts` factory with a fixture
// fallback. This is the customer-facing half, it is token-authenticated, and
// there is no signed-in context to fall back from: if the token does not
// resolve, the honest answer is "this link is not valid", not a sample pet.
//
// The previous version read `localStorage`, which is why the link never worked
// on the phone it was sent to.
// ============================================================================

export interface SurveyChannel {
  id: string;
  platform: string;
  weight: number;
}

export interface SurveyTag {
  id: string;
  polarity: "positive" | "improvement";
  serviceType: string;
  /** Per-locale copy, e.g. { en: "Gentle handling", fr: "…" }. */
  labels: Record<string, string>;
}

export interface SurveyRequest {
  requestId: string;
  facilityName: string;
  facilitySlug: string;
  locale: string;
  clientFirstName: string;
  serviceTypes: string[];
  petNames: string[];
  answered: boolean;
  rating: number | null;
  channels: SurveyChannel[];
  tags: SurveyTag[];
}

export interface SurveyAnswer {
  rating: number;
  comment?: string;
  tagIds?: string[];
  staffId?: string;
  displayConsent?: boolean;
  locale?: string;
  source?: "sms_link" | "email_link" | "report_card" | "portal" | "kiosk";
}

export interface SurveyResult {
  responseId: string;
  rating: number;
  /**
   * Whether a recovery ticket was opened. It says what happened INTERNALLY and
   * changes nothing about what the client is shown: the public review options
   * are rendered at every rating, which is the property that keeps this the
   * right side of Google's review policies and 16 CFR Part 465.
   */
  escalated: boolean;
  showcaseEligible: boolean;
}

/** `null` for every kind of dead link — the route does not distinguish them. */
export async function fetchSurvey(
  token: string,
): Promise<SurveyRequest | null> {
  const response = await fetch(`/api/review/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as SurveyRequest;
}

export async function submitSurvey(
  token: string,
  answer: SurveyAnswer,
): Promise<SurveyResult> {
  const response = await fetch(`/api/review/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answer),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? "That review could not be saved.");
  }
  return (await response.json()) as SurveyResult;
}

/**
 * Where "Review us on Google" points.
 *
 * A full navigation rather than a fetch, so the click is recorded only when the
 * browser actually follows it — see the route's own note.
 */
export function reviewClickHref(token: string, channelId: string): string {
  return `/api/review/${encodeURIComponent(token)}/click?channel=${encodeURIComponent(channelId)}`;
}
