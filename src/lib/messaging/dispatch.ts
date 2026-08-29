import "server-only";

import { facilityCustomerOrigin } from "@/lib/app-host";
import { renderEmail } from "@/lib/email/shell";
import {
  UNRESOLVED_TAG,
  resolveTemplate,
  type VariableDataContext,
} from "@/lib/messaging/render";
import { channelConfigured, sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import {
  isTooLate,
  jitterMinutes,
  nextSendableInstant,
  sendingZone,
} from "@/lib/messaging/quiet-hours";
import {
  messagingPolicySchema,
  NO_MESSAGING_POLICY,
  type MessagingPolicy,
} from "@/lib/settings/messaging-policy";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { enrolFromEvent } from "@/lib/workflows/engine";
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
  /**
   * Signed minutes from the triggering moment: -1440 is a day before, +180 is
   * three hours after. Stored since the table was created and read by nothing
   * until now, so every rule sent immediately whatever it said.
   *
   * NEGATIVE offsets are not honoured here and cannot be. "24 hours before the
   * booking" is not a delay on an event that has already happened — there is no
   * event at that moment to delay. Those are the time-driven triggers, and they
   * need a scan that looks forward at bookings rather than back at events.
   */
  offset_minutes: number | null;
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
      "id, name, trigger, email_template_id, sms_template_id, service_types, location_ids, min_amount, cooldown_days, is_transactional, offset_minutes",
    )
    .eq("facility_id", event.facility_id)
    .eq("trigger", event.kind)
    .eq("enabled", true);

  const candidates = (rules ?? []) as RuleRow[];

  // WORKFLOWS FIRST, and before the early return below.
  //
  // A facility can perfectly well have a workflow on this trigger and no rule
  // on it — "welcome sequence, no single confirmation" is an ordinary setup.
  // Enrolling after `candidates.length === 0` returned would have meant those
  // facilities silently never enrolling anybody, with nothing to see and
  // nothing logged.
  //
  // Inside the same claim as the rules, so one event is considered exactly once
  // for both kinds of thing.
  const enrolment = await enrolFromEvent(db, event);
  result.problems.push(...enrolment.problems);

  // REVIEW REQUESTS, for the same reason and in the same claim.
  //
  // A check-out can perfectly well produce a review request and no automation
  // rule — the review rule IS a rule, but it is dispatched here rather than by
  // `deliver()` below because it needs a request row, a link token and a nudge
  // budget, none of which `deliver()` knows about. Placed before the early
  // return so a facility that has only turned on the review request still gets
  // one; that ordering is the same bug `enrolFromEvent` was moved up to fix.
  //
  // Imported lazily so the reputation module is not pulled into every path
  // that dispatches a message, and so a fault there cannot stop a booking
  // confirmation from going out.
  if (event.kind === "check_out") {
    try {
      const { scheduleReviewRequest } =
        await import("@/lib/reputation/schedule");
      const review = await scheduleReviewRequest(db, event);
      result.problems.push(...review.problems);
      result.queued += review.requested;
      result.skipped += review.suppressed;
    } catch (failure) {
      result.problems.push(
        `event ${event.id}: review scheduling failed: ${String(failure)}`,
      );
    }
  }

  if (candidates.length === 0) return result;

  const context = await loadMessageContext(db, event);
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
  /** The public reference — what `/pay/{ref}` takes, not the uuid. */
  ref: number | null;
  service: string | null;
  service_type: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string | null;
}

export interface MessageContext {
  clientId: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  serviceType: string | null;
  facilityName: string;
  data: VariableDataContext;
}

/**
 * Everything a message needs to know about who it is going to.
 *
 * Structurally typed rather than taking an `EventRow`, because workflows need
 * the identical context and do not always have an event behind them — an
 * audience workflow is started by a filter matching, not by anything
 * happening. Exported so `@/lib/workflows/engine` renders through exactly this
 * path: two context loaders would eventually disagree about what
 * `{{pet_name}}` means, and the disagreement would be visible to a customer.
 */
export interface ContextSubject {
  facility_id: string;
  client_id: string | null;
  booking_id: string | null;
  location_id: string | null;
}

export async function loadMessageContext(
  db: SupabaseClient,
  event: ContextSubject,
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
      .select("ref, service, service_type, start_at, end_at, status")
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
          // `/pay/{ref}` — the REF, not the uuid. It is the page that shows
          // the balance and the tip options, so it is what a tip reminder or a
          // payment chase has to point at. Absent when the booking has no ref,
          // which leaves `{{invoice_link}}` unresolved and the message skipped
          // rather than sent with a dead link in it.
          invoice: booking?.ref ? `${origin}/pay/${booking.ref}` : undefined,
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

  // ── LATER, IF THE RULE SAYS LATER ───────────────────────────────────────
  //
  // A positive offset means "send this a while after the thing happened" — a
  // tip reminder three hours after check-out, a review request the next day.
  // The row is written NOW, fully rendered, with `scheduled_for` in the future
  // and `status = 'queued'`; the tick sends it when it comes due.
  //
  // Rendering at queue time rather than at send time is deliberate. The message
  // says what was true when the thing happened — the pet's name, the service,
  // the balance — and a booking edited in the intervening hours must not
  // silently change what the customer is told they were sent. `body_rendered`
  // is the record CASL requires, and it should be the record of one decision.
  //
  // The suppression check still runs again in the tick: somebody who
  // unsubscribes in those three hours must not receive it.
  const delayMinutes = Math.max(0, rule.offset_minutes ?? 0);
  const scheduledFor = new Date(Date.now() + delayMinutes * 60_000);
  const deferred = !skipReason && delayMinutes > 0;

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
      status: skipReason ? "skipped" : deferred ? "queued" : "sending",
      scheduled_for: scheduledFor.toISOString(),
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

  // Left for the tick. Counted as queued and NOT as sent, because it has not
  // been — a dispatcher reporting a deferred message as delivered is the same
  // defect as a screen claiming an action it did not perform.
  if (deferred) return result;

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

// ============================================================================
// The tick: sending what was queued for later.
//
// ── WHY A SEPARATE PASS AND NOT A setTimeout ──────────────────────────────
//
// A tip reminder due in three hours outlives the request that queued it, the
// process that served it, and quite possibly the container. The durable part is
// the row; this is the thing that comes back for it.
//
// ── THE CLAIM IS AN UPDATE, NOT A SELECT ──────────────────────────────────
//
// Two ticks overlapping — a slow run and the next cron firing — would otherwise
// both read the same queued row and both send it. `queued -> sending` is done
// with a conditional UPDATE that returns the rows it actually changed, so only
// one caller can win each row. Same argument as `dispatchEvent` claiming its
// event, and the same reason: the alternative sends a customer two of the same
// message and there is no way to un-send one.
//
// ── SUPPRESSION IS ASKED AGAIN, DELIBERATELY ──────────────────────────────
//
// It was asked when the message was queued, hours ago. Somebody who
// unsubscribed in between must not receive this. Everything else — the copy,
// the subject, the address — is deliberately NOT recomputed: it was decided at
// queue time and `body_rendered` is the record of that decision.
// ============================================================================

/** A blank line separates paragraphs, the same as the immediate path uses. */
const BLANK_LINE = "\n\n";
const PARAGRAPHS = (body: string) => body.split(BLANK_LINE).filter(Boolean);

/** How many due messages one tick will take. Keeps a run bounded. */
const TICK_BATCH = 50;

interface QueuedRow {
  id: string;
  facility_id: string;
  location_id: string | null;
  client_id: string | null;
  channel: "email" | "sms";
  to_address: string;
  subject_rendered: string | null;
  body_rendered: string;
  source_id: string | null;
  source_kind: string;
  scheduled_for: string;
}

export async function sendDueMessages(): Promise<DispatchResult> {
  if (!hasServiceRoleKey()) {
    return { ...EMPTY, problems: ["no service-role key; nothing sent"] };
  }
  const db = createAdminClient();
  const result: DispatchResult = { ...EMPTY, problems: [] };

  const { data: due, error: dueError } = await db
    .from("message_sends")
    .select("id")
    .eq("status", "queued")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(TICK_BATCH);

  if (dueError) {
    return {
      ...EMPTY,
      problems: [`could not read the queue: ${dueError.message}`],
    };
  }

  for (const row of (due ?? []) as { id: string }[]) {
    // The claim. `.eq("status", "queued")` is the whole race protection: a
    // second tick that read the same row updates nothing and moves on.
    const { data: claimed } = await db
      .from("message_sends")
      .update({ status: "sending" })
      .eq("id", row.id)
      .eq("status", "queued")
      .select(
        "id, facility_id, location_id, client_id, channel, to_address, subject_rendered, body_rendered, source_id, source_kind, scheduled_for",
      );

    const message = (claimed ?? [])[0] as QueuedRow | undefined;
    if (!message) continue;

    try {
      await sendOneQueued(db, message, result);
    } catch (error) {
      // Never throw out of the tick: one bad row must not strand the other
      // forty-nine in 'sending', where only the reaper can free them.
      const detail = error instanceof Error ? error.message : "unknown";
      result.failed += 1;
      result.problems.push(`message ${message.id}: ${detail}`);
      await db
        .from("message_sends")
        .update({ status: "failed", last_error: detail, attempts: 1 })
        .eq("id", message.id);
    }
  }

  return result;
}

/**
 * When this facility may send, how many, and how late is too late.
 *
 * Read per message rather than cached: the tick is fifty rows and a settings
 * read is one indexed lookup, whereas a cache would let a facility turn quiet
 * hours on and watch the next batch ignore it.
 */
async function loadMessagingPolicy(
  db: SupabaseClient,
  facilityId: string,
): Promise<MessagingPolicy> {
  const { data } = await db
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "messaging_policy")
    .maybeSingle();

  const row = data as { value: unknown } | null;
  if (!row) return NO_MESSAGING_POLICY;

  // A value that no longer parses is ignored in favour of the default, never
  // merged - the same rule /api/facility/settings follows. A half-written
  // policy must not decide who gets messaged at 4 a.m.
  const parsed = messagingPolicySchema.safeParse(row.value);
  return parsed.success ? parsed.data : NO_MESSAGING_POLICY;
}

/** The location's clock, then the facility's, then the default. */
async function sendingZoneFor(
  db: SupabaseClient,
  message: QueuedRow,
): Promise<string> {
  const [{ data: location }, { data: facility }] = await Promise.all([
    message.location_id
      ? db
          .from("locations")
          .select("timezone")
          .eq("id", message.location_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("facilities")
      .select("timezone")
      .eq("id", message.facility_id)
      .maybeSingle(),
  ]);

  return sendingZone(
    (location as { timezone: string | null } | null)?.timezone,
    (facility as { timezone: string | null } | null)?.timezone,
  );
}

/**
 * Whether this location has already sent its allowance of marketing today.
 *
 * Counted from `message_sends` rather than a counter column, for the reason
 * 20260827111420 gives for having no `total_sent`: a stored copy is one more
 * thing that can disagree with the rows.
 */
async function isOverDailyCap(
  db: SupabaseClient,
  message: QueuedRow,
  cap: number,
): Promise<boolean> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  let query = db
    .from("message_sends")
    .select("id", { count: "exact", head: true })
    .eq("facility_id", message.facility_id)
    .eq("status", "sent")
    .gte("sent_at", since);

  // Per LOCATION, because a five-branch network sending its cap from each is
  // not the velocity spike a platform filter reacts to - one branch flooding
  // is.
  query = message.location_id
    ? query.eq("location_id", message.location_id)
    : query.is("location_id", null);

  const { count } = await query;
  return (count ?? 0) >= cap;
}

async function sendOneQueued(
  db: SupabaseClient,
  message: QueuedRow,
  result: DispatchResult,
): Promise<void> {
  const policy = await loadMessagingPolicy(db, message.facility_id);
  const transactional = await ruleIsTransactional(db, message.source_id);
  const now = new Date();
  const scheduledFor = new Date(message.scheduled_for);

  // ── TOO LATE TO BE WORTH SENDING ────────────────────────────────────────
  //
  // A worker outage backs the queue up, and when it drains a message whose
  // moment has passed must be DROPPED and recorded rather than sent. "Your
  // appointment is tomorrow", three days late, is worse than silence. The
  // build this replaces once sent a "gentle nudge" 49 days after its request.
  //
  // Transactional messages are exempt: a receipt is still a receipt, and a
  // customer who paid is owed the record however late the worker was.
  if (!transactional && isTooLate(scheduledFor, now, policy.maxLatenessHours)) {
    result.skipped += 1;
    await db
      .from("message_sends")
      .update({ status: "skipped", skip_reason: "expired" })
      .eq("id", message.id);
    return;
  }

  // ── QUIET HOURS DEFER, THEY NEVER DROP ──────────────────────────────────
  //
  // The one rung of the ladder that reschedules. The row stays `queued` with a
  // later `scheduled_for`, so the next tick after the window opens picks it up.
  // Dropping it instead would be indistinguishable, from the facility's side,
  // from never having queued it.
  //
  // Checked again HERE and not only at queue time because `scheduled_for` can
  // be moved, and because a facility can turn quiet hours on after a message is
  // already waiting.
  if (!transactional && policy.quietHours.enabled) {
    const zone = await sendingZoneFor(db, message);
    const allowed = nextSendableInstant(now, zone, policy.quietHours);
    if (allowed.getTime() > now.getTime()) {
      await db
        .from("message_sends")
        .update({ status: "queued", scheduled_for: allowed.toISOString() })
        .eq("id", message.id);
      return;
    }
  }

  // ── PACING ──────────────────────────────────────────────────────────────
  //
  // A sudden spike in review velocity is what makes a platform's spam filter
  // discard a whole batch — the reviews are collected, and then they are not
  // there. Over the cap, the message moves to tomorrow's window plus a
  // deterministic jitter, so a retry of the same row lands in the same slot
  // rather than being deferred for ever.
  if (!transactional && policy.dailyCap > 0) {
    const over = await isOverDailyCap(db, message, policy.dailyCap);
    if (over) {
      const zone = await sendingZoneFor(db, message);
      const tomorrow = new Date(now.getTime() + 86_400_000);
      const opens = nextSendableInstant(tomorrow, zone, policy.quietHours);
      const slot = new Date(
        opens.getTime() + jitterMinutes(message.id, 120) * 60_000,
      );
      await db
        .from("message_sends")
        .update({ status: "queued", scheduled_for: slot.toISOString() })
        .eq("id", message.id);
      return;
    }
  }

  const suppression = await isSuppressed(db, {
    facilityId: message.facility_id,
    channel: message.channel,
    address: message.to_address,
    // A rule that was transactional when it queued may have been edited since.
    // Re-read it rather than assume — and treat a missing rule as marketing,
    // which is the answer that sends FEWER messages. Read once at the top of
    // this function, because the three checks above need the same answer.
    isTransactional: transactional,
  });

  if (suppression.suppressed) {
    result.skipped += 1;
    await db
      .from("message_sends")
      .update({
        status: "skipped",
        skip_reason: suppression.reason ?? "suppressed",
      })
      .eq("id", message.id);
    return;
  }

  if (!channelConfigured(message.channel)) {
    result.skipped += 1;
    await db
      .from("message_sends")
      .update({ status: "skipped", skip_reason: "channel_not_configured" })
      .eq("id", message.id);
    return;
  }

  const { data: facility } = await db
    .from("facilities")
    .select("name")
    .eq("id", message.facility_id)
    .maybeSingle();
  const facilityName = (facility as { name?: string } | null)?.name ?? "Yipyy";

  const delivery =
    message.channel === "email"
      ? await sendEmail({
          to: message.to_address,
          subject: message.subject_rendered ?? `A message from ${facilityName}`,
          html: renderEmail({
            preheader: message.subject_rendered ?? facilityName,
            heading: message.subject_rendered ?? facilityName,
            paragraphs: PARAGRAPHS(message.body_rendered),
            footer: facilityName,
            origin: "",
          }),
          text: message.body_rendered,
        })
      : await sendSms({ to: message.to_address, body: message.body_rendered });

  await db
    .from("message_sends")
    .update(
      delivery.sent
        ? {
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_id: delivery.providerId ?? null,
            attempts: 1,
          }
        : {
            status: "failed",
            last_error: delivery.detail ?? "send failed",
            attempts: 1,
          },
    )
    .eq("id", message.id);

  if (delivery.sent) result.sent += 1;
  else {
    result.failed += 1;
    result.problems.push(
      `message ${message.id}: ${delivery.detail ?? "send failed"}`,
    );
  }
}

/** Whether the rule behind a queued message still counts as transactional. */
async function ruleIsTransactional(
  db: SupabaseClient,
  ruleId: string | null,
): Promise<boolean> {
  if (!ruleId) return false;
  const { data } = await db
    .from("automation_rules")
    .select("is_transactional")
    .eq("id", ruleId)
    .maybeSingle();
  return (
    (data as { is_transactional?: boolean } | null)?.is_transactional ?? false
  );
}
