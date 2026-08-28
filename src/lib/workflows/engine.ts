import "server-only";

import {
  loadMessageContext,
  type ContextSubject,
  type MessageContext,
} from "@/lib/messaging/dispatch";
import { resolveTemplate } from "@/lib/messaging/render";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Running a workflow: enrol somebody, then walk them through it.
//
// ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────
//
// Send anything. A step coming due writes a row into `message_sends` with a
// `scheduled_for` and stops. `sendDueMessages()` — the same function the
// automation rules use — picks it up on the next tick and delivers it.
//
// That is the whole reason workflows were built after rules rather than beside
// them. Suppression, quiet hours, the unresolved-variable refusal, the
// idempotency key, the frozen sent row: a workflow gets all of it by using the
// same outbox, and CANNOT drift away from what the rules do, because there is
// no second copy to drift.
//
// ── THREE ENTRY POINTS ────────────────────────────────────────────────────
//
//   enrolFromEvent()          an event happened -> who starts a sequence
//   advanceDueEnrollments()   a step is due     -> render it, queue it, move on
//   runDueAudienceWorkflows() the clock says so -> who matches the filter now
//
// ── STOP CONDITIONS ARE CHECKED AT THE BOUNDARY, NOT SUBSCRIBED TO ────────
//
// Immediately before rendering each step, against live data. The only message
// that matters is the one about to go out, so a check there is sufficient and
// avoids a second event matcher that could disagree with the first.
// ============================================================================

export interface EngineResult {
  enrolled: number;
  advanced: number;
  completed: number;
  stopped: number;
  queued: number;
  problems: string[];
}

const EMPTY: EngineResult = {
  enrolled: 0,
  advanced: 0,
  completed: 0,
  stopped: 0,
  queued: 0,
  problems: [],
};

/** One tick should not try to walk an unbounded number of people at once. */
const BATCH = 200;

export interface StepSnapshot {
  step_index: number;
  delay_minutes: number;
  email_template_id: string | null;
  sms_template_id: string | null;
}

interface WorkflowRow {
  id: string;
  facility_id: string;
  name: string;
  kind: "event" | "audience";
  trigger: string | null;
  audience: unknown;
  location_ids: string[];
  min_days_between_sends: number;
  stop_on: string[];
  frequency: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  send_at_local: string | null;
  last_run_at: string | null;
  trigger_filters: unknown;
  service_types: string[];
}

const WORKFLOW_SELECT =
  "id, facility_id, name, kind, trigger, audience, location_ids, min_days_between_sends, stop_on, frequency, day_of_week, day_of_month, send_at_local, last_run_at, trigger_filters, service_types";

// ── Enrolment from an event ────────────────────────────────────────────────

/**
 * Enrol clients into every active event-workflow matching this event.
 *
 * Called from the dispatcher, inside the same claim that handles the rules, so
 * an event is considered exactly once for both.
 */
export async function enrolFromEvent(
  db: SupabaseClient,
  event: {
    id: number;
    facility_id: string;
    kind: string;
    client_id: string | null;
    booking_id: string | null;
    location_id: string | null;
  },
): Promise<EngineResult> {
  const result: EngineResult = { ...EMPTY, problems: [] };
  if (!event.client_id) return result;

  const { data: workflows } = await db
    .from("workflows")
    .select(WORKFLOW_SELECT)
    .eq("facility_id", event.facility_id)
    .eq("kind", "event")
    .eq("trigger", event.kind)
    .eq("status", "active");

  const candidates = (workflows ?? []) as WorkflowRow[];
  if (candidates.length === 0) return result;

  // Fetched once for the whole batch rather than per workflow: several
  // workflows commonly share a trigger, and this is the same booking for all
  // of them.
  let serviceType: string | null = null;
  if (event.booking_id) {
    const { data: booking } = await db
      .from("bookings")
      .select("service_type")
      .eq("id", event.booking_id)
      .maybeSingle();
    serviceType =
      (booking as { service_type: string | null } | null)?.service_type ?? null;
  }

  for (const workflow of candidates) {
    if (
      workflow.location_ids.length > 0 &&
      event.location_id &&
      !workflow.location_ids.includes(event.location_id)
    ) {
      continue;
    }

    // Care type. Empty means every service, never none — the same convention
    // as location scope, so clearing the last chip cannot silently stop the
    // workflow firing for anybody.
    if (
      workflow.service_types.length > 0 &&
      serviceType &&
      !workflow.service_types.includes(serviceType)
    ) {
      continue;
    }

    // "Only start for clients matching these criteria." Compiled by the SAME
    // function a scheduled workflow uses, so "lapsed clients who just booked"
    // needs no second query language and cannot disagree with what the wizard
    // previewed.
    //
    // Costs one compile per matching workflow per event. Fine at this volume;
    // if a facility ever has many event workflows sharing one trigger, this is
    // the line to memoise.
    if (workflow.trigger_filters) {
      const { data: matched, error: filterError } = await db.rpc(
        "compile_audience",
        {
          p_facility_id: workflow.facility_id,
          p_filters: workflow.trigger_filters,
        },
      );
      if (filterError) {
        // FAIL CLOSED. A filter that cannot be evaluated must not enrol
        // everybody — the whole point of it is to exclude people.
        result.problems.push(
          `workflow ${workflow.name}: trigger filter failed, nobody enrolled — ${filterError.message}`,
        );
        continue;
      }
      if (!((matched ?? []) as string[]).includes(event.client_id)) continue;
    }

    // The occasion is the booking where there is one, so the same workflow
    // firing on a DIFFERENT booking for the same client is a new enrolment
    // rather than a refused duplicate.
    const occasion = event.booking_id ?? `event:${event.id}`;
    const outcome = await enrol(db, workflow, {
      clientId: event.client_id,
      bookingId: event.booking_id,
      occasion,
    });
    result.enrolled += outcome.enrolled;
    result.problems.push(...outcome.problems);
  }

  return result;
}

async function enrol(
  db: SupabaseClient,
  workflow: WorkflowRow,
  input: { clientId: string; bookingId: string | null; occasion: string },
): Promise<EngineResult> {
  const result: EngineResult = { ...EMPTY, problems: [] };

  const { data: steps } = await db
    .from("workflow_steps")
    .select("step_index, delay_minutes, email_template_id, sms_template_id")
    .eq("workflow_id", workflow.id)
    .order("step_index");

  const snapshot = (steps ?? []) as StepSnapshot[];
  if (snapshot.length === 0) {
    result.problems.push(`workflow ${workflow.name}: active with no steps`);
    return result;
  }

  // The cooldown. Derived from the outbox rather than stored per client — the
  // same reasoning as the rules' cooldown, and the same caveat: this read can
  // be passed by two ticks at once, so the UNIQUE enrolment key below is the
  // authority and this is only an optimisation.
  if (workflow.min_days_between_sends > 0) {
    const since = new Date(
      Date.now() - workflow.min_days_between_sends * 86_400_000,
    ).toISOString();
    const { count } = await db
      .from("message_sends")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", workflow.facility_id)
      .eq("source_kind", "workflow")
      .eq("source_id", workflow.id)
      .eq("client_id", input.clientId)
      .gte("created_at", since);
    if ((count ?? 0) > 0) return result;
  }

  const firstDelay = snapshot[0].delay_minutes ?? 0;
  const { error } = await db.from("workflow_enrollments").insert({
    workflow_id: workflow.id,
    client_id: input.clientId,
    booking_id: input.bookingId,
    status: "active",
    current_step: 0,
    next_run_at: new Date(Date.now() + firstDelay * 60_000).toISOString(),
    steps_snapshot: snapshot,
    enrolment_key: `${workflow.id}:${input.clientId}:${input.occasion}`,
  });

  if (error) {
    // 23505 is the unique enrolment key: this person is already in this
    // sequence for this occasion. That is the mechanism working.
    if (error.code === "23505") return result;
    result.problems.push(`workflow ${workflow.name}: ${error.message}`);
    return result;
  }

  result.enrolled += 1;
  return result;
}

// ── Walking the sequence ───────────────────────────────────────────────────

interface EnrollmentRow {
  id: string;
  workflow_id: string;
  client_id: string;
  booking_id: string | null;
  current_step: number;
  next_run_at: string;
  steps_snapshot: StepSnapshot[];
}

export async function advanceDueEnrollments(): Promise<EngineResult> {
  if (!hasServiceRoleKey()) {
    return { ...EMPTY, problems: ["no service-role key; nothing advanced"] };
  }
  const db = createAdminClient();
  const result: EngineResult = { ...EMPTY, problems: [] };

  const { data: due, error } = await db
    .from("workflow_enrollments")
    .select(
      "id, workflow_id, client_id, booking_id, current_step, next_run_at, steps_snapshot",
    )
    .eq("status", "active")
    .not("next_run_at", "is", null)
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    return {
      ...EMPTY,
      problems: [`could not read enrolments: ${error.message}`],
    };
  }

  for (const row of (due ?? []) as EnrollmentRow[]) {
    try {
      await advanceOne(db, row, result);
    } catch (failure) {
      // Never throw out of the tick: one stuck enrolment must not strand the
      // rest, which would look like the whole feature having quietly died.
      const detail = failure instanceof Error ? failure.message : "unknown";
      result.problems.push(`enrolment ${row.id}: ${detail}`);
      await db
        .from("workflow_enrollments")
        .update({ status: "failed", stopped_reason: detail })
        .eq("id", row.id);
    }
  }

  return result;
}

async function advanceOne(
  db: SupabaseClient,
  enrollment: EnrollmentRow,
  result: EngineResult,
): Promise<void> {
  // The claim. `next_run_at` unchanged is the race protection: a second tick
  // that read the same row updates nothing and moves on, exactly like the
  // outbox's `status = 'queued'` claim.
  const { data: claimed } = await db
    .from("workflow_enrollments")
    .update({ next_run_at: null })
    .eq("id", enrollment.id)
    .eq("next_run_at", enrollment.next_run_at)
    .eq("status", "active")
    .select("id");
  if (!claimed || claimed.length === 0) return;

  const { data: workflow } = await db
    .from("workflows")
    .select(WORKFLOW_SELECT)
    .eq("id", enrollment.workflow_id)
    .maybeSingle();
  const w = workflow as WorkflowRow | null;
  if (!w) return;

  // ── Stop conditions, immediately before rendering ────────────────────────
  const stop = await stopReason(db, w, enrollment);
  if (stop) {
    await db
      .from("workflow_enrollments")
      .update({
        status: "stopped",
        stopped_reason: stop,
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);
    result.stopped += 1;
    return;
  }

  const step = enrollment.steps_snapshot.find(
    (s) => s.step_index === enrollment.current_step,
  );
  if (!step) {
    await db
      .from("workflow_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", enrollment.id);
    result.completed += 1;
    return;
  }

  const subject: ContextSubject = {
    facility_id: w.facility_id,
    client_id: enrollment.client_id,
    booking_id: enrollment.booking_id,
    location_id: null,
  };
  const context = await loadMessageContext(db, subject);
  if (!context) {
    result.problems.push(`enrolment ${enrollment.id}: no client to message`);
    return;
  }

  const channels: ("email" | "sms")[] = [];
  if (step.email_template_id) channels.push("email");
  if (step.sms_template_id) channels.push("sms");

  for (const channel of channels) {
    const queued = await queueStep(db, {
      workflow: w,
      enrollment,
      step,
      channel,
      context,
    });
    result.queued += queued.queued;
    result.problems.push(...queued.problems);
  }

  // Move on, or finish.
  const next = enrollment.steps_snapshot.find(
    (s) => s.step_index === enrollment.current_step + 1,
  );

  if (!next) {
    await db
      .from("workflow_enrollments")
      .update({
        status: "completed",
        current_step: enrollment.current_step + 1,
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);
    result.completed += 1;
    return;
  }

  await db
    .from("workflow_enrollments")
    .update({
      current_step: next.step_index,
      next_run_at: new Date(
        Date.now() + (next.delay_minutes ?? 0) * 60_000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollment.id);
  result.advanced += 1;
}

/**
 * Why this person should stop receiving the sequence, or null to carry on.
 *
 * `unsubscribed` is deliberately absent: suppression is enforced inside the
 * sender, against every message from every source, keyed by address. Checking
 * it here as well would be a second place to forget it — and the first place
 * would still be the one that mattered.
 */
async function stopReason(
  db: SupabaseClient,
  workflow: WorkflowRow,
  enrollment: EnrollmentRow,
): Promise<string | null> {
  const stops = Array.isArray(workflow.stop_on) ? workflow.stop_on : [];

  if (stops.includes("booked")) {
    // A booking made AFTER enrolment. The booking that started the sequence
    // must not immediately stop it — which it would, without the timestamp.
    const { data: enrolRow } = await db
      .from("workflow_enrollments")
      .select("enrolled_at")
      .eq("id", enrollment.id)
      .maybeSingle();
    const since = (enrolRow as { enrolled_at: string } | null)?.enrolled_at;
    if (since) {
      const { count } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", workflow.facility_id)
        .eq("client_id", enrollment.client_id)
        .gte("created_at", since)
        .not("status", "in", '("cancelled","declined")');
      if ((count ?? 0) > 0) return "booked";
    }
  }

  return null;
}

async function queueStep(
  db: SupabaseClient,
  input: {
    workflow: WorkflowRow;
    enrollment: EnrollmentRow;
    step: StepSnapshot;
    channel: "email" | "sms";
    context: MessageContext;
  },
): Promise<{ queued: number; problems: string[] }> {
  const { workflow, enrollment, step, channel, context } = input;
  const problems: string[] = [];

  const to = channel === "email" ? context.email : context.phone;
  if (!to) return { queued: 0, problems };

  const templateId =
    channel === "email" ? step.email_template_id : step.sms_template_id;
  if (!templateId) return { queued: 0, problems };

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
    problems.push(
      `workflow ${workflow.name}: step template missing or retired`,
    );
    return { queued: 0, problems };
  }

  const subject = t.subject ? resolveTemplate(t.subject, context.data) : null;
  const body = resolveTemplate(t.body, context.data);

  // Queued for NOW: the delay was already served by `next_run_at`. Doubling it
  // here would make every step arrive twice as late as configured.
  const { error } = await db.from("message_sends").insert({
    facility_id: workflow.facility_id,
    client_id: enrollment.client_id,
    channel,
    to_address: to,
    source_kind: "workflow",
    source_id: workflow.id,
    enrollment_id: enrollment.id,
    step_index: step.step_index,
    template_id: templateId,
    subject_rendered: subject,
    body_rendered: body,
    status: "queued",
    scheduled_for: new Date().toISOString(),
    provider: channel === "email" ? "resend" : "twilio",
    idempotency_key: `workflow:${workflow.id}:${step.step_index}:${enrollment.client_id}:${channel}:${enrollment.id}`,
  });

  if (error) {
    // Already queued by a racing tick. The mechanism working, not a failure.
    if (error.code === "23505") return { queued: 0, problems };
    problems.push(`workflow ${workflow.name}: ${error.message}`);
    return { queued: 0, problems };
  }

  return { queued: 1, problems };
}

// ── Audience workflows ─────────────────────────────────────────────────────

export async function runDueAudienceWorkflows(): Promise<EngineResult> {
  if (!hasServiceRoleKey()) {
    return { ...EMPTY, problems: ["no service-role key; nothing scanned"] };
  }
  const db = createAdminClient();
  const result: EngineResult = { ...EMPTY, problems: [] };

  const { data: workflows, error } = await db
    .from("workflows")
    .select(WORKFLOW_SELECT)
    .eq("kind", "audience")
    .eq("status", "active");

  if (error) {
    return {
      ...EMPTY,
      problems: [`could not read workflows: ${error.message}`],
    };
  }

  for (const workflow of (workflows ?? []) as WorkflowRow[]) {
    const { data: facility } = await db
      .from("facilities")
      .select("timezone")
      .eq("id", workflow.facility_id)
      .maybeSingle();
    const zone =
      (facility as { timezone: string | null } | null)?.timezone ??
      DEFAULT_TIMEZONE;

    if (!isDue(workflow, zone)) continue;

    const { data: matched, error: matchError } = await db.rpc(
      "compile_audience",
      { p_facility_id: workflow.facility_id, p_filters: workflow.audience },
    );
    if (matchError) {
      result.problems.push(`workflow ${workflow.name}: ${matchError.message}`);
      continue;
    }

    for (const clientId of (matched ?? []) as string[]) {
      // The occasion is the facility-LOCAL date, not UTC. A Vancouver facility
      // running at 21:00 local is on the next UTC day, so a UTC key would let
      // the same run enrol somebody twice, or skip a day entirely.
      const localDay = wallClockParts(new Date().toISOString(), zone).date;
      const outcome = await enrol(db, workflow, {
        clientId,
        bookingId: null,
        occasion: localDay,
      });
      result.enrolled += outcome.enrolled;
      result.problems.push(...outcome.problems);
    }

    await db
      .from("workflows")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", workflow.id);
  }

  return result;
}

/**
 * Is this workflow's schedule due, on the facility's own clock?
 *
 * Compared in LOCAL wall-clock terms throughout. "Every Monday at 9am" means
 * the facility's Monday and the facility's nine, which is a different instant
 * in January and in July — the reason `send_at_local` is a `time` and not a
 * stored timestamp.
 */
function isDue(workflow: WorkflowRow, zone: string): boolean {
  if (!workflow.frequency) return false;

  const now = new Date();
  const { date, time } = wallClockParts(now.toISOString(), zone);

  const sendAt = (workflow.send_at_local ?? "09:00").slice(0, 5);
  if (time < sendAt) return false;

  // Once per local day, whatever the tick interval. Without this the workflow
  // would re-enrol every five minutes for the rest of the day.
  if (workflow.last_run_at) {
    const lastLocal = wallClockParts(workflow.last_run_at, zone).date;
    if (lastLocal === date) return false;
  }

  if (workflow.frequency === "daily") return true;

  // `date` is YYYY-MM-DD in the facility's zone; parsing it as UTC noon avoids
  // the local-midnight-rolls-backwards trap when deriving the weekday.
  const asUtc = new Date(`${date}T12:00:00Z`);

  if (workflow.frequency === "weekly") {
    return asUtc.getUTCDay() === (workflow.day_of_week ?? 1);
  }

  if (workflow.frequency === "monthly") {
    const wanted = workflow.day_of_month ?? 1;
    const dayOfMonth = asUtc.getUTCDate();
    const lastOfMonth = new Date(
      Date.UTC(asUtc.getUTCFullYear(), asUtc.getUTCMonth() + 1, 0),
    ).getUTCDate();
    // "Monthly on the 31st" in a month that has no 31st runs on its last day,
    // rather than being skipped — the behaviour MoeGo documents, and the one
    // people expect when they pick the end of the month.
    return dayOfMonth === Math.min(wanted, lastOfMonth);
  }

  return false;
}
