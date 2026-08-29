import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { facilityCustomerOrigin } from "@/lib/app-host";
import {
  loadMessageContext,
  type ContextSubject,
} from "@/lib/messaging/dispatch";
import { businessDay, sendingZone } from "@/lib/messaging/quiet-hours";
import { instantFromWallClock } from "@/lib/time/facility-time";
import { resolveTemplate, UNRESOLVED_TAG } from "@/lib/messaging/render";
import {
  NO_REPUTATION_CONFIG,
  reputationConfigSchema,
  type ReputationConfig,
} from "@/lib/settings/reputation";
import { reviewRequestEligibility } from "@/lib/reputation/eligibility";
import {
  mintReviewToken,
  reviewLinkFor,
  toByteaLiteral,
} from "@/lib/reputation/token";

// ============================================================================
// A check-out becomes one review request, and one queued message.
//
// ── IT REUSES THE OUTBOX. IT DOES NOT SEND ────────────────────────────────
//
// Everything here ends at a `message_sends` row with `status = 'queued'`. The
// tick sends it, through the one module allowed to put anything on the wire.
// A second sender would be a second place to forget that somebody has
// unsubscribed, and under CASL that is not a bug you get to have twice — the
// argument `src/app/api/rebook/lapsed/remind/route.ts` makes at length, and
// this is the same shape.
//
// ── WHY IT IS NOT JUST ANOTHER RULE IN `deliver()` ────────────────────────
//
// `deliver()` is per (rule, channel) and knows nothing about a request entity,
// a visit key, a link token or a nudge budget. A review request needs all four:
// a row that survives to be answered, a token that exists only in the message,
// and a single nudge whose branch is chosen later. So the rule supplies the
// CONFIG — the delay, the cooldown, the templates, and whether it is on at all
// — and this supplies the mechanics.
//
// ── ONE REQUEST PER VISIT, ENFORCED BY AN INDEX ───────────────────────────
//
// A boarding stay with a groom inside it closes twice on one day and produces
// two `check_out` events. The second insert hits
// `review_requests_visit_unique` and raises 23505, which is treated as success
// — exactly as `emit_automation_event` treats a duplicate dedupe key. No
// check-then-insert, because two events arriving together would both pass it.
// ============================================================================

interface ReviewRuleRow {
  id: string;
  email_template_id: string | null;
  sms_template_id: string | null;
  offset_minutes: number | null;
  location_ids: string[];
  service_types: string[];
}

export interface ScheduleResult {
  requested: number;
  suppressed: number;
  duplicate: number;
  problems: string[];
}

const EMPTY: ScheduleResult = {
  requested: 0,
  suppressed: 0,
  duplicate: 0,
  problems: [],
};

/**
 * Consider one `check_out` event for a review request.
 *
 * Called from `dispatchClaimed`, inside the same claim as the rules loop, so an
 * event is considered exactly once. Every failure is a problem string rather
 * than a throw: a dog that has gone home has gone home, and nothing here is
 * worth failing the check-out that a person is standing at a counter doing.
 */
export async function scheduleReviewRequest(
  db: SupabaseClient,
  event: {
    id: number;
    facility_id: string;
    kind: string;
    client_id: string | null;
    booking_id: string | null;
    location_id: string | null;
  },
): Promise<ScheduleResult> {
  const result: ScheduleResult = { ...EMPTY, problems: [] };
  if (event.kind !== "check_out" || !event.client_id) return result;

  // ── The rule, which is also the on/off switch ───────────────────────────
  const { data: ruleRow } = await db
    .from("automation_rules")
    .select(
      "id, email_template_id, sms_template_id, offset_minutes, location_ids, service_types",
    )
    .eq("facility_id", event.facility_id)
    .eq("seed_key", "review_request")
    .eq("enabled", true)
    .maybeSingle();

  const rule = ruleRow as ReviewRuleRow | null;
  if (!rule) return result;

  if (
    rule.location_ids.length > 0 &&
    event.location_id &&
    !rule.location_ids.includes(event.location_id)
  ) {
    return result;
  }

  const context = await loadMessageContext(db, event as ContextSubject);
  if (!context) {
    result.problems.push(`event ${event.id}: no client to ask`);
    return result;
  }

  if (
    rule.service_types.length > 0 &&
    context.serviceType &&
    !rule.service_types.includes(context.serviceType)
  ) {
    return result;
  }

  // ── The facility's own clock and its own rules ──────────────────────────
  const { data: facility } = await db
    .from("facilities")
    .select("slug, timezone")
    .eq("id", event.facility_id)
    .maybeSingle();
  const f = facility as { slug: string | null; timezone: string | null } | null;

  let locationZone: string | null = null;
  if (event.location_id) {
    const { data: location } = await db
      .from("locations")
      .select("timezone")
      .eq("id", event.location_id)
      .maybeSingle();
    locationZone =
      (location as { timezone: string | null } | null)?.timezone ?? null;
  }

  const zone = sendingZone(locationZone, f?.timezone);
  const config = await loadReputationConfig(db, event.facility_id);

  // The VISIT. Facility-local, because `current_date` in Postgres is UTC and
  // would give a Vancouver facility two "todays" or none.
  const day = businessDay(new Date(), zone);

  // Every booking this client closed today. Snapshotted onto the request so the
  // trail can name the whole visit even after somebody edits one of them.
  //
  // THE DAY BOUNDARIES ARE THE FACILITY'S, CONVERTED. `${day}T00:00:00Z` is the
  // obvious way to write this and it is wrong for every facility not on UTC:
  // measured on the demo facility at 21:02 local, the local day was the 28th
  // while `end_at` was already `2026-08-29T01:02Z`, so the booking that had
  // just triggered the event fell outside its own window and the request was
  // written with no services and no staff on it. Silent, and it would have
  // emptied the whole Performance screen.
  const dayStart = instantFromWallClock(day, "00:00", zone);
  const dayEnd = instantFromWallClock(day, "23:59", zone);

  const { data: sameDay } = await db
    .from("bookings")
    .select("id, service_type, assigned_staff_id")
    .eq("facility_id", event.facility_id)
    .eq("client_id", event.client_id)
    .gte("end_at", dayStart)
    .lte("end_at", dayEnd);

  const visitBookings = (sameDay ?? []) as {
    id: string;
    service_type: string | null;
    assigned_staff_id: string | null;
  }[];

  const bookingIds = visitBookings.map((b) => b.id);
  if (event.booking_id && !bookingIds.includes(event.booking_id)) {
    bookingIds.push(event.booking_id);
  }

  // `assigned_staff_id` REFERENCES staff(id) — it is declared against
  // facility_memberships in 20260801120000 and repointed in 20260801150000.
  // Reading the declaration is how the tip trigger nearly shipped attributing
  // every tip to nobody.
  const staffOnVisit = Array.from(
    new Set(
      visitBookings
        .map((b) => b.assigned_staff_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const serviceTypes = Array.from(
    new Set(
      visitBookings
        .map((b) => b.service_type)
        .filter((s): s is string => Boolean(s)),
    ),
  );

  // ── The rungs nothing else asks about ──────────────────────────────────
  const verdict = await reviewRequestEligibility(db, {
    facilityId: event.facility_id,
    clientId: event.client_id,
    bookingIds,
    config,
  });

  const delayMinutes = Math.max(0, rule.offset_minutes ?? 60);
  const firstSendAt = new Date(Date.now() + delayMinutes * 60_000);
  const { token, hash } = mintReviewToken();

  // A REFUSAL IS STILL A ROW. See the eligibility module's header: "why did
  // only 312 of 480 check-outs get asked" is the question the previous build
  // could not answer, and returning early here would leave it that way.
  const insert = {
    facility_id: event.facility_id,
    location_id: event.location_id,
    client_id: event.client_id,
    business_day: day,
    primary_staff_id: staffOnVisit[0] ?? null,
    staff_on_visit: staffOnVisit,
    service_types: serviceTypes,
    booking_ids: bookingIds,
    escalation_threshold: config.escalationThreshold,
    showcase_min: config.showcaseMin,
    first_send_at: firstSendAt.toISOString(),
    expires_at: new Date(
      firstSendAt.getTime() + config.expiresAfterDays * 86_400_000,
    ).toISOString(),
    nudge_due_at: verdict.eligible
      ? new Date(
          firstSendAt.getTime() + config.nudgeAfterHours * 3_600_000,
        ).toISOString()
      : null,
    ...(verdict.eligible
      ? {
          state: "sent",
          token_hash: toByteaLiteral(hash),
          token_expires_at: new Date(
            Date.now() + config.linkTtlDays * 86_400_000,
          ).toISOString(),
        }
      : {
          state: "suppressed",
          suppress_reason: verdict.reason,
          suppress_stage: "trigger",
          suppressed_at: new Date().toISOString(),
          next_eligible_at: verdict.nextEligibleAt?.toISOString() ?? null,
        }),
  };

  const { data: created, error: insertError } = await db
    .from("review_requests")
    .insert(insert as never)
    .select("id")
    .maybeSingle();

  if (insertError) {
    // 23505 is the visit index: this client has already been considered for
    // today at this location. The mechanism working, not a failure.
    if (insertError.code === "23505") {
      result.duplicate += 1;
      return result;
    }
    result.problems.push(`review request: ${insertError.message}`);
    return result;
  }
  if (!created) return result;

  const requestId = (created as { id: string }).id;

  if (!verdict.eligible) {
    result.suppressed += 1;
    return result;
  }
  result.requested += 1;

  // ── The message ────────────────────────────────────────────────────────
  const origin = f?.slug
    ? facilityCustomerOrigin(f.slug, process.env.NEXT_PUBLIC_APP_DOMAIN)
    : null;

  if (!origin) {
    // No origin means no link, and a review request without one is a message
    // asking somebody to do something they cannot do. `{{survey_link}}` would
    // be left unresolved and refused below anyway; saying so here is clearer.
    result.problems.push(
      `review request ${requestId}: facility has no slug, so no survey link`,
    );
    return result;
  }

  const surveyLink = reviewLinkFor(origin, token);
  const channel = context.email ? "email" : context.phone ? "sms" : null;
  if (!channel) {
    await markSuppressed(db, requestId, "no_channel");
    result.requested -= 1;
    result.suppressed += 1;
    return result;
  }

  const templateId =
    channel === "email" ? rule.email_template_id : rule.sms_template_id;
  if (!templateId) {
    result.problems.push(`review request ${requestId}: no ${channel} template`);
    return result;
  }

  const { data: template } = await db
    .from("message_templates")
    .select("subject, body, is_active")
    .eq("id", templateId)
    .maybeSingle();
  const t = template as {
    subject: string | null;
    body: string;
    is_active: boolean;
  } | null;
  if (!t || !t.is_active) {
    result.problems.push(`review request ${requestId}: template retired`);
    return result;
  }

  const data = {
    ...context.data,
    timeZone: zone,
    links: { ...(context.data.links ?? {}), survey: surveyLink },
  };
  const subject = t.subject ? resolveTemplate(t.subject, data) : null;
  const body = resolveTemplate(t.body, data);

  // A HALF-RENDERED MESSAGE MUST NOT GO OUT — the same refusal `deliver()`
  // makes, for the same reason: a customer receiving the literal text
  // "{{pet_name}}" is worse than receiving nothing.
  if (UNRESOLVED_TAG.test(body) || (subject && UNRESOLVED_TAG.test(subject))) {
    result.problems.push(
      `review request ${requestId}: unresolved variable, not queued`,
    );
    return result;
  }

  const to = channel === "email" ? context.email : context.phone;
  const { error: sendError } = await db.from("message_sends").insert({
    facility_id: event.facility_id,
    location_id: event.location_id,
    client_id: event.client_id,
    channel,
    to_address: to,
    source_kind: "review_request",
    source_id: requestId,
    step_index: 0,
    template_id: templateId,
    subject_rendered: subject,
    body_rendered: body,
    // ALWAYS queued, never 'sending'. Quiet hours, the velocity cap and the
    // suppression re-check all happen in the tick, and a review request is
    // exactly the kind of message that must not skip them by going out inline.
    status: "queued",
    scheduled_for: firstSendAt.toISOString(),
    idempotency_key: `review_request:${requestId}:0:${event.client_id}:${channel}:${day}`,
    provider: channel === "email" ? "resend" : "twilio",
  } as never);

  if (sendError && sendError.code !== "23505") {
    result.problems.push(`review request ${requestId}: ${sendError.message}`);
  }

  return result;
}

/** The facility's thresholds and windows, or the documented defaults. */
export async function loadReputationConfig(
  db: SupabaseClient,
  facilityId: string,
): Promise<ReputationConfig> {
  const { data } = await db
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "reputation_config")
    .maybeSingle();

  const row = data as { value: unknown } | null;
  if (!row) return NO_REPUTATION_CONFIG;

  // A value that no longer parses is IGNORED in favour of the default rather
  // than merged or thrown — the rule `/api/facility/settings` already follows,
  // so a half-written config cannot change who gets messaged.
  const parsed = reputationConfigSchema.safeParse(row.value);
  return parsed.success ? parsed.data : NO_REPUTATION_CONFIG;
}

async function markSuppressed(
  db: SupabaseClient,
  requestId: string,
  reason: string,
): Promise<void> {
  await db
    .from("review_requests")
    .update({
      state: "suppressed",
      suppress_reason: reason,
      suppress_stage: "trigger",
      suppressed_at: new Date().toISOString(),
      token_hash: null,
      nudge_due_at: null,
    } as never)
    .eq("id", requestId);
}
