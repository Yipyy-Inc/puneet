import "server-only";

import { facilityCustomerOrigin } from "@/lib/app-host";
import { renderEmail } from "@/lib/email/shell";
import {
  resolveTemplate,
  type VariableDataContext,
} from "@/lib/messaging/render";
import { channelConfigured, sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Turning an event into messages.
//
// ── THE ORDER OF THE CHECKS IS THE DESIGN ─────────────────────────────────
//
// For each rule that matches an event, per channel:
//
//   1. suppression   — has this person told us to stop?
//   2. cooldown      — has this rule already written to them recently?
//   3. INSERT queued — claim the send with a unique idempotency key
//   4. render + send
//   5. mark sent / failed
//
// Step 3 is the authority and steps 1-2 are optimisations. Two dispatchers can
// both pass a cooldown READ — it is a select, and nothing serialises it — and
// only one can win the insert, because `message_sends.idempotency_key` is
// unique. Any design that sends first and records afterwards has a window where
// a crash loses the record of a message the customer definitely received.
//
// ── IT RUNS AS service_role, AND HAS TO ───────────────────────────────────
//
// `message_sends` grants `authenticated` SELECT only: a session that could
// write the outbox could forge the record of what a facility told its
// customers. So the dispatcher uses the admin client. Where there is no
// service-role key it does nothing and says so, rather than half-working.
//
// ── NOTHING HERE THROWS ───────────────────────────────────────────────────
//
// It is called from `after()`, behind a response that has already gone. A throw
// would be an unhandled rejection in a background task, which is both invisible
// and, in some runtimes, fatal to the process. Every failure is caught, recorded
// on the row, and reported in the return value.
// ============================================================================

export interface DispatchResult {
  queued: number;
  sent: number;
  skipped: number;
  failed: number;
  problems: string[];
}

/**
 * A merge tag still sitting in a rendered body — `{{service_name}}`.
 *
 * Not the shared VARIABLE_PATTERN from render.ts: that one carries /g, and a
 * shared global regex leaks `lastIndex` between calls, so alternating tests
 * against it silently return null every second time. This one is deliberately
 * its own, non-global, single-purpose object.
 */
const UNRESOLVED_TAG = /\{\{[a-z_]+(\|[^}]*)?\}\}/;

const EMPTY: DispatchResult = {
  queued: 0,
  sent: 0,
  skipped: 0,
  failed: 0,
  problems: [],
};

interface EventRow {
  id: number;
  facility_id: string;
  kind: string;
  client_id: string | null;
  pet_id: string | null;
  booking_id: string | null;
  location_id: string | null;
}

interface RuleRow {
  id: string;
  name: string;
  trigger: string;
  email_template_id: string | null;
  sms_template_id: string | null;
  service_types: string[];
  location_ids: string[];
  min_amount: string | number | null;
  cooldown_days: number;
  is_transactional: boolean;
}

/**
 * Dispatch one event.
 *
 * Claims it first — `processed_at is null` in the WHERE — so a second caller
 * arriving at the same moment gets zero rows and does nothing. That is what
 * makes it safe to call this from `after()` AND from the tick.
 */
export async function dispatchEvent(eventId: number): Promise<DispatchResult> {
  if (!hasServiceRoleKey()) {
    return { ...EMPTY, problems: ["no service-role key; nothing dispatched"] };
  }
  const db = createAdminClient();

  const { data: claimed, error: claimError } = await db
    .from("automation_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId)
    .is("processed_at", null)
    .select(
      "id, facility_id, kind, client_id, pet_id, booking_id, location_id",
    );

  if (claimError) {
    return { ...EMPTY, problems: [`claim failed: ${claimError.message}`] };
  }
  if (!claimed || claimed.length === 0) {
    // Already handled by another caller. Not a problem — the whole point.
    return EMPTY;
  }

  try {
    return await dispatchClaimed(db, claimed[0] as EventRow);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.warn("[messaging] dispatch failed:", error);
    return { ...EMPTY, problems: [`dispatch threw: ${detail}`] };
  }
}

async function dispatchClaimed(
  db: SupabaseClient,
  event: EventRow,
): Promise<DispatchResult> {
  const result: DispatchResult = { ...EMPTY, problems: [] };

  const { data: rules } = await db
    .from("automation_rules")
    .select(
      "id, name, trigger, email_template_id, sms_template_id, service_types, location_ids, min_amount, cooldown_days, is_transactional",
    )
    .eq("facility_id", event.facility_id)
    .eq("trigger", event.kind)
    .eq("enabled", true);

  const candidates = (rules ?? []) as RuleRow[];
  if (candidates.length === 0) return result;

  const context = await loadContext(db, event);
  if (!context) {
    result.problems.push(`event ${event.id}: no client to message`);
    return result;
  }

  for (const rule of candidates) {
    // Location scope. Empty means every location, never "no locations" — an
    // empty array meaning none would silently stop every rule the day somebody
    // cleared the last chip.
    if (
      rule.location_ids.length > 0 &&
      event.location_id &&
      !rule.location_ids.includes(event.location_id)
    ) {
      continue;
    }
    if (
      rule.service_types.length > 0 &&
      context.serviceType &&
      !rule.service_types.includes(context.serviceType)
    ) {
      continue;
    }

    const channels: ("email" | "sms")[] = [];
    if (rule.email_template_id) channels.push("email");
    if (rule.sms_template_id) channels.push("sms");

    for (const channel of channels) {
      const outcome = await deliver(db, {
        event,
        rule,
        channel,
        context,
      });
      result.queued += outcome.queued;
      result.sent += outcome.sent;
      result.skipped += outcome.skipped;
      result.failed += outcome.failed;
      result.problems.push(...outcome.problems);
    }
  }

  return result;
}

type BookingStatusForDisplay = NonNullable<
  VariableDataContext["booking"]
>["status"];

interface BookingFacts {
  service: string | null;
  service_type: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string | null;
}

interface MessageContext {
  clientId: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  serviceType: string | null;
  facilityName: string;
  data: VariableDataContext;
}

async function loadContext(
  db: SupabaseClient,
  event: EventRow,
): Promise<MessageContext | null> {
  if (!event.client_id) return null;

  const [{ data: facility }, { data: client }] = await Promise.all([
    db
      .from("facilities")
      .select("id, name, slug, phone, email, address, website, timezone")
      .eq("id", event.facility_id)
      .maybeSingle(),
    db
      .from("clients")
      .select("id, name, email, phone")
      .eq("id", event.client_id)
      .maybeSingle(),
  ]);

  if (!facility || !client) return null;

  const f = facility as {
    name: string;
    slug: string | null;
    phone: string | null;
    email: string | null;
    address: Record<string, string> | null;
    website: string | null;
    timezone: string | null;
  };
  const c = client as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };

  let booking: BookingFacts | null = null;
  if (event.booking_id) {
    const { data } = await db
      .from("bookings")
      .select("service, service_type, start_at, end_at, status")
      .eq("id", event.booking_id)
      .maybeSingle();
    booking = (data as BookingFacts | null) ?? null;
  }

  const { data: pets } = await db
    .from("pets")
    .select("name, breed, weight")
    .eq("client_id", c.id)
    .limit(5);

  // Links come from the FACILITY ROW's slug, through the one module allowed to
  // decide a customer-facing origin. `facilityCustomerLinkOrigin` is the usual
  // entry point but it takes a Request to fall back on, and there is no request
  // here — this runs behind a response that has already gone, or from cron.
  //
  // So: the slug's own origin, or NOTHING. A null origin leaves every link
  // undefined, which leaves the raw `{{portal_link}}` tag in the body. That is
  // deliberate and it is the safe direction to fail: a visibly unrendered tag
  // gets reported and fixed, whereas a link to the wrong host works, looks
  // fine, and lands a pet owner somewhere they should not be. That exact defect
  // is why `check:link-origin` exists.
  const origin = f.slug
    ? facilityCustomerOrigin(f.slug, process.env.NEXT_PUBLIC_APP_DOMAIN)
    : null;

  const address = f.address
    ? [f.address.street, f.address.city, f.address.state, f.address.zip]
        .filter(Boolean)
        .join(", ")
    : "";

  const zone = f.timezone ?? DEFAULT_TIMEZONE;
  const start = booking?.start_at
    ? wallClockParts(booking.start_at, zone)
    : null;
  const end = booking?.end_at ? wallClockParts(booking.end_at, zone) : null;

  const data: VariableDataContext = {
    customer: { name: c.name, email: c.email ?? "", phone: c.phone ?? "" },
    pets: (pets ?? []).map((p) => p as { name: string; breed?: string }),
    booking: booking
      ? {
          service: booking.service ?? undefined,
          serviceType: booking.service_type ?? undefined,
          // `bookings` stores two instants; the Booking type — and every
          // template — wants four fields: a date and a time at each end. Split
          // them on the FACILITY's clock, not the server's.
          //
          // This is not cosmetic. The container runs UTC, so a 7pm Montreal
          // drop-off formatted in the server's zone reads as the following day
          // — the same class of bug as the UTC window that once dropped every
          // night shift out of its own day. `wallClockParts` is the fix that
          // came out of that; there must not be a second conversion.
          startDate: start?.date,
          checkInTime: start?.time,
          endDate: end?.date,
          checkOutTime: end?.time,
          // `bookings.status` is a CHECK constraint in Postgres and a narrow
          // union in TypeScript, and the two are maintained separately. The
          // renderer only ever capitalises this for display, so a value the
          // union has not caught up with renders as itself rather than
          // throwing — which is the right failure for a status appearing in an
          // email.
          status: (booking.status ?? undefined) as BookingStatusForDisplay,
        }
      : undefined,
    facility: {
      name: f.name,
      phone: f.phone ?? "",
      email: f.email ?? "",
      address,
      website: f.website ?? "",
    },
    links: origin
      ? {
          portal: origin,
          bookingDetails: event.booking_id
            ? `${origin}/bookings/${event.booking_id}`
            : undefined,
        }
      : undefined,
    timeZone: zone,
  };

  return {
    clientId: c.id,
    clientName: c.name,
    email: c.email,
    phone: c.phone,
    serviceType: booking?.service_type ?? null,
    facilityName: f.name,
    data,
  };
}

async function deliver(
  db: SupabaseClient,
  input: {
    event: EventRow;
    rule: RuleRow;
    channel: "email" | "sms";
    context: MessageContext;
  },
): Promise<DispatchResult> {
  const { event, rule, channel, context } = input;
  const result: DispatchResult = { ...EMPTY, problems: [] };

  const to = channel === "email" ? context.email : context.phone;
  if (!to) {
    // Nothing to record: there is no address, so there is no message, and a
    // skipped row keyed on an empty address cannot be deduplicated.
    result.skipped += 1;
    return result;
  }

  // '<source_kind>:<source_id>:<step>:<client>:<channel>:<occasion>'. The
  // occasion is the booking for a booking event, so the same rule firing on a
  // DIFFERENT booking for the same client is a different message.
  const occasion = event.booking_id ?? `event:${event.id}`;
  const idempotencyKey = `automation_rule:${rule.id}:-:${context.clientId}:${channel}:${occasion}`;

  const templateId =
    channel === "email" ? rule.email_template_id : rule.sms_template_id;
  if (!templateId) return result;

  const { data: template } = await db
    .from("message_templates")
    .select("id, subject, body, is_active")
    .eq("id", templateId)
    .maybeSingle();

  const t = template as {
    subject: string | null;
    body: string;
    is_active: boolean;
  } | null;
  if (!t || !t.is_active) {
    result.problems.push(`rule ${rule.name}: template missing or retired`);
    return result;
  }

  const subject = t.subject ? resolveTemplate(t.subject, context.data) : null;
  const body = resolveTemplate(t.body, context.data);

  // ── The checks, before the claim ────────────────────────────────────────
  //
  // Suppression is asked FIRST, ahead of whether the channel even works. Both
  // can be true at once, and "they asked us to stop" is the more useful thing
  // to have recorded on the row than "this deployment has no API key".

  let skipReason: string | null = null;

  const suppression = await isSuppressed(db, {
    facilityId: event.facility_id,
    channel,
    address: to,
    isTransactional: rule.is_transactional,
  });
  if (suppression.suppressed) skipReason = suppression.reason ?? "suppressed";

  // A HALF-RENDERED MESSAGE MUST NOT GO OUT.
  //
  // `resolveTemplate` leaves a tag it cannot resolve exactly as written, which
  // is right for the editor's live preview — the author needs to see which
  // variable is unavailable. It is very wrong here: it means emailing a
  // customer a sentence containing the literal text "{{service_name}}".
  //
  // The usual cause is a template referencing something this trigger does not
  // carry — a booking variable on a rule that fires on client creation. That is
  // a configuration mistake, and it should surface as a message that did not
  // send, naming the tag, rather than as one that did.
  //
  // A template author who wants a blank instead can write `{{service_name|}}`;
  // the fallback syntax resolves and is not caught here.
  if (!skipReason) {
    const unresolved =
      body.match(UNRESOLVED_TAG)?.[0] ?? subject?.match(UNRESOLVED_TAG)?.[0];
    if (unresolved) skipReason = `unresolved_variable:${unresolved}`;
  }

  if (!skipReason && !channelConfigured(channel)) {
    skipReason = "channel_not_configured";
  }

  if (!skipReason && rule.cooldown_days > 0) {
    const since = new Date(
      Date.now() - rule.cooldown_days * 86_400_000,
    ).toISOString();
    const { count } = await db
      .from("message_sends")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", event.facility_id)
      .eq("source_kind", "automation_rule")
      .eq("source_id", rule.id)
      .eq("client_id", context.clientId)
      .in("status", ["queued", "sending", "sent"])
      .gte("created_at", since);
    if ((count ?? 0) > 0) skipReason = "cooldown";
  }

  // ── The claim ───────────────────────────────────────────────────────────

  const { data: inserted, error: insertError } = await db
    .from("message_sends")
    .insert({
      facility_id: event.facility_id,
      location_id: event.location_id,
      client_id: context.clientId,
      channel,
      to_address: to,
      source_kind: "automation_rule",
      source_id: rule.id,
      template_id: templateId,
      subject_rendered: subject,
      body_rendered: body,
      status: skipReason ? "skipped" : "sending",
      skip_reason: skipReason,
      idempotency_key: idempotencyKey,
      provider: channel === "email" ? "resend" : "twilio",
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    // 23505 is the unique idempotency key: somebody already claimed this exact
    // message. That is the mechanism working, not a failure.
    if (insertError.code === "23505") return result;
    result.problems.push(`rule ${rule.name}: ${insertError.message}`);
    result.failed += 1;
    return result;
  }
  if (!inserted) return result;

  if (skipReason) {
    result.skipped += 1;
    return result;
  }

  const sendId = (inserted as { id: string }).id;
  result.queued += 1;

  // ── The send ────────────────────────────────────────────────────────────

  const delivery =
    channel === "email"
      ? await sendEmail({
          to,
          subject: subject ?? `A message from ${context.facilityName}`,
          html: renderEmail({
            preheader: subject ?? context.facilityName,
            heading: subject ?? context.facilityName,
            paragraphs: body.split("\n\n").filter(Boolean),
            footer: context.facilityName,
            origin: context.data.links?.portal ?? "",
          }),
          text: body,
        })
      : await sendSms({ to, body });

  const patch = delivery.sent
    ? {
        status: "sent" as const,
        sent_at: new Date().toISOString(),
        provider_id: delivery.providerId ?? null,
        attempts: 1,
      }
    : {
        status: "failed" as const,
        last_error: delivery.detail ?? "send failed",
        attempts: 1,
      };

  const { error: updateError } = await db
    .from("message_sends")
    .update(patch)
    .eq("id", sendId);

  if (updateError) {
    // The message may well have gone. Say so loudly rather than reporting a
    // clean failure — an outbox row stuck in 'sending' is recoverable by the
    // reaper; a wrong status is not.
    result.problems.push(
      `rule ${rule.name}: sent=${delivery.sent} but the row could not be updated: ${updateError.message}`,
    );
  }

  if (delivery.sent) result.sent += 1;
  else {
    result.failed += 1;
    result.problems.push(
      `rule ${rule.name}: ${delivery.detail ?? "send failed"}`,
    );
  }
  return result;
}
