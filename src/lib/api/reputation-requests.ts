// ============================================================================
// The Requests tab's data.
//
// Separate from `reputation-analytics.ts` because they answer different
// questions — one is "how are we doing", the other is "what happened to this
// person" — and separate from the fixture factory `reputation.ts`, which the
// unconverted tabs still read.
// ============================================================================

export type RequestState =
  | "scheduled"
  | "sent"
  | "delivered"
  | "failed"
  | "rated"
  | "expired"
  | "suppressed"
  | "cancelled";

export interface RequestSend {
  id: string;
  channel: "email" | "sms";
  status: "queued" | "sending" | "sent" | "failed" | "skipped" | "cancelled";
  skip_reason: string | null;
  scheduled_for: string;
  sent_at: string | null;
  /** 0 is the ask, 1 is the single nudge. */
  step_index: number;
  subject_rendered: string | null;
  body_rendered: string;
  provider: string | null;
  last_error: string | null;
}

export interface RequestResponse {
  id: string;
  rating: number;
  comment: string | null;
  source: string;
  submitted_at: string;
  moderation_state: string;
  display_consent: boolean;
  public_clicked_at: string | null;
  staff: { id: string; first_name: string; last_name: string } | null;
}

export interface ReviewRequestRow {
  id: string;
  business_day: string;
  state: RequestState;
  state_changed_at: string;
  service_types: string[];
  booking_ids: string[];
  channel: "email" | "sms" | null;
  source: string;
  suppress_reason: string | null;
  suppress_stage: string | null;
  next_eligible_at: string | null;
  first_send_at: string;
  expires_at: string;
  nudge_outcome: "backup" | "share" | "none" | "expired" | null;
  nudge_due_at: string | null;
  created_at: string;
  escalation_threshold: number;
  showcase_min: number;
  client: {
    id: string;
    ref: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  staff: { id: string; first_name: string; last_name: string } | null;
  response: RequestResponse | null;
  sends: RequestSend[];
}

export interface RequestPage {
  requests: ReviewRequestRow[];
  nextBefore: string | null;
}

export interface RequestFilters {
  state?: RequestState;
  from?: string;
  to?: string;
  locationIds?: string[];
}

async function fetchRequests(filters: RequestFilters): Promise<RequestPage> {
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  for (const id of filters.locationIds ?? []) params.append("location", id);

  const response = await fetch(`/api/reputation/requests?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? "Could not read the review requests.");
  }
  return (await response.json()) as RequestPage;
}

export const reviewRequestQueries = {
  list: (filters: RequestFilters) => ({
    queryKey: [
      "reputation",
      "requests",
      filters.state ?? "all",
      filters.from ?? "",
      filters.to ?? "",
      (filters.locationIds ?? []).join(","),
    ] as const,
    queryFn: () => fetchRequests(filters),
  }),
};

/**
 * Why somebody was not asked, in words a person at a desk can act on.
 *
 * The database stores a machine reason so it can be counted; this is the one
 * place it becomes a sentence. A screen that showed `negative_pause` would be
 * showing its own schema.
 */
export const SUPPRESS_REASONS: Record<string, string> = {
  opted_out: "They have unsubscribed",
  no_consent: "No marketing consent on file",
  campaign_unregistered: "This facility's SMS campaign is not registered",
  no_channel: "No email or mobile number on file",
  invalid_address: "The address on file is not usable",
  hard_bounced: "Their address bounced",
  cancelled: "The visit was cancelled or a no-show",
  refund_open: "This visit was refunded",
  dispute: "There is an open dispute",
  cooldown: "Asked too recently",
  negative_pause: "They rated us poorly recently",
  manual_hold: "On hold by a member of staff",
  daily_cap: "Today's send limit was reached",
  velocity_cap: "Paced to avoid a review spike",
};

/** What the single nudge did, or why it did nothing. */
export const NUDGE_OUTCOMES: Record<string, string> = {
  backup: "Followed up on the other channel",
  share: "Asked to share it publicly",
  none: "Nothing needed",
  expired: "Too late to follow up",
};
