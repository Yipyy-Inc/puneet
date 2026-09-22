import "server-only";

import { facilityCustomerOrigin } from "@/lib/app-host";
import { loadMessageContext } from "@/lib/messaging/dispatch";
import { UNRESOLVED_TAG, resolveTemplate } from "@/lib/messaging/render";
import {
  SHIPPED_ABANDONMENT_RECOVERY,
  abandonmentRecoverySchema,
} from "@/lib/settings/abandonment-recovery";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { databaseNow } from "@/lib/supabase/db-clock";
import {
  fillRecoveryTags,
  recoveryDueAt,
  recoveryPlan,
  recoveryResumeLink,
} from "@/lib/unfinished-bookings/recovery";
import type {
  AbandonmentRecoverySettings,
  AbandonmentStep,
} from "@/types/unfinished-booking";

// ============================================================================
// The one recovery message an unfinished booking is owed.
//
// Called from the messaging tick BEFORE `sendDueMessages()`, so what it queues
// goes out on the same tick. It never sends: it writes `message_sends` rows,
// and the send pass applies suppression, quiet hours, the daily cap, lateness
// and the channel check exactly as it does for every other marketing message.
//
// ── WHEN ──────────────────────────────────────────────────────────────────
//
// A row is looked at once `recovery_not_before` has passed (the trigger sets it
// to the moment the customer last left the form). If the facility's delay for
// that step has not run out, the tick pushes `recovery_not_before` to the due
// moment and leaves it; otherwise it claims the row.
//
// ── ONCE ──────────────────────────────────────────────────────────────────
//
// The claim is `recovery_resolved_at is null -> now()` with outcome 'none',
// conditional and returning what it changed — the review nudge's shape. Two
// overlapping ticks cannot both queue, and the idempotency key on
// message_sends (per unfinished booking and channel) says the same again. A
// resolved row is never reopened, so a customer who leaves the form four times
// hears from the facility once.
// ============================================================================

const TICK_BATCH = 100;

export interface RecoveryTickResult {
  queued: number;
  deferred: number;
  none: number;
  problems: string[];
}

interface DueRow {
  id: string;
  facility_id: string;
  client_id: string;
  service: string | null;
  step: AbandonmentStep;
  abandoned_at: string;
  draft: { petName?: unknown } | null;
}

type Db = ReturnType<typeof createAdminClient>;

export async function queueDueRecoveryMessages(): Promise<RecoveryTickResult> {
  const result: RecoveryTickResult = {
    queued: 0,
    deferred: 0,
    none: 0,
    problems: [],
  };
  if (!hasServiceRoleKey()) {
    result.problems.push("no service-role key; no recovery messages evaluated");
    return result;
  }
  const db = createAdminClient();
  // The DATABASE's clock, not this process's. `recovery_not_before` is set by
  // a trigger to the database's `now()`, so judging it against `new Date()`
  // compares two clocks: on 2026-09-22 this machine ran 1.664s behind and a
  // draft created moments earlier was stamped in the tick's own future, so
  // the query below returned nothing and `recovery_outcome` stayed null.
  // Read once and threaded down, so every row in a batch is judged against
  // one instant.
  const now = await databaseNow(db);

  const { data: due, error } = await db
    .from("unfinished_bookings")
    .select("id, facility_id, client_id, service, step, abandoned_at, draft")
    .eq("status", "abandoned")
    .is("recovery_resolved_at", null)
    .lte("recovery_not_before", now.toISOString())
    .order("recovery_not_before", { ascending: true })
    .limit(TICK_BATCH);

  if (error) {
    result.problems.push(
      `could not read unfinished bookings: ${error.message}`,
    );
    return result;
  }

  const settingsByFacility = new Map<string, AbandonmentRecoverySettings>();
  for (const row of (due ?? []) as DueRow[]) {
    try {
      let settings = settingsByFacility.get(row.facility_id);
      if (!settings) {
        settings = await loadRecoverySettings(db, row.facility_id);
        settingsByFacility.set(row.facility_id, settings);
      }
      await evaluateOne(db, row, settings, now, result);
    } catch (failure) {
      // One bad row must not stop the rest of the batch.
      const detail = failure instanceof Error ? failure.message : "unknown";
      result.problems.push(`recovery ${row.id}: ${detail}`);
    }
  }
  return result;
}

async function loadRecoverySettings(
  db: Db,
  facilityId: string,
): Promise<AbandonmentRecoverySettings> {
  const { data } = await db
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "abandonment_recovery")
    .maybeSingle();
  const row = data as { value: unknown } | null;
  if (!row) return SHIPPED_ABANDONMENT_RECOVERY;
  // A stored value that no longer parses sends nothing rather than the shipped
  // templates: the facility wrote its own, and ours are not what it chose.
  const parsed = abandonmentRecoverySchema.safeParse(row.value);
  return parsed.success
    ? parsed.data
    : { ...SHIPPED_ABANDONMENT_RECOVERY, enabled: false };
}

async function evaluateOne(
  db: Db,
  row: DueRow,
  settings: AbandonmentRecoverySettings,
  now: Date,
  result: RecoveryTickResult,
) {
  const plan = recoveryPlan(settings, row.step);
  const dueAt = recoveryDueAt(row.abandoned_at, plan.delayHours);

  if (!plan.off && dueAt > now) {
    await db
      .from("unfinished_bookings")
      .update({ recovery_not_before: dueAt.toISOString() })
      .eq("id", row.id)
      .is("recovery_resolved_at", null);
    result.deferred += 1;
    return;
  }

  const { data: claimed, error: claimError } = await db
    .from("unfinished_bookings")
    .update({
      recovery_resolved_at: now.toISOString(),
      recovery_outcome: "none",
      recovery_detail: plan.off
        ? "recovery is switched off for this step"
        : null,
    })
    .eq("id", row.id)
    .is("recovery_resolved_at", null)
    .eq("status", "abandoned")
    .select("id");
  if (claimError) {
    result.problems.push(
      `recovery ${row.id}: claim failed: ${claimError.message}`,
    );
    return;
  }
  if (!claimed || claimed.length === 0) return;

  if (plan.off) {
    result.none += 1;
    return;
  }

  const outcome = await queueForRow(db, row, settings, plan.channels);
  await db
    .from("unfinished_bookings")
    .update({
      recovery_outcome: outcome.queued > 0 ? "queued" : "skipped",
      recovery_detail: outcome.reasons.join("; ").slice(0, 500) || null,
    })
    .eq("id", row.id);

  if (outcome.queued > 0) result.queued += outcome.queued;
  else result.none += 1;
  result.problems.push(...outcome.problems);
}

async function queueForRow(
  db: Db,
  row: DueRow,
  settings: AbandonmentRecoverySettings,
  channels: ("email" | "sms")[],
): Promise<{ queued: number; reasons: string[]; problems: string[] }> {
  const out = { queued: 0, reasons: [] as string[], problems: [] as string[] };

  const context = await loadMessageContext(db, {
    facility_id: row.facility_id,
    client_id: row.client_id,
    booking_id: null,
    location_id: null,
  });
  if (!context) {
    out.reasons.push("no client record to message");
    return out;
  }

  const { data: facility } = await db
    .from("facilities")
    .select("slug")
    .eq("id", row.facility_id)
    .maybeSingle();
  const slug = (facility as { slug: string | null } | null)?.slug;
  const origin = slug
    ? facilityCustomerOrigin(slug, process.env.NEXT_PUBLIC_APP_DOMAIN)
    : null;
  if (!origin) {
    out.reasons.push("the facility has no address to link to");
    return out;
  }

  const petName =
    typeof row.draft?.petName === "string" && row.draft.petName.trim()
      ? row.draft.petName
      : ((context.data.pets?.length === 1
          ? context.data.pets[0]?.name
          : null) ?? null);

  const facts = {
    clientName: context.clientName,
    petName,
    service: row.service,
    facilityName: context.facilityName,
    resumeLink: recoveryResumeLink(origin, row.id),
  };
  const rule = settings.stepRules[row.step];

  for (const channel of channels) {
    const to = channel === "email" ? context.email : context.phone;
    if (!to) {
      out.reasons.push(
        `no ${channel === "email" ? "email address" : "mobile number"} on file`,
      );
      continue;
    }

    const render = (template: string) =>
      resolveTemplate(fillRecoveryTags(template, facts), context.data);
    const subject = channel === "email" ? render(rule.emailSubject) : null;
    const body = render(channel === "email" ? rule.emailBody : rule.smsBody);

    const unresolved =
      body.match(UNRESOLVED_TAG)?.[0] ?? subject?.match(UNRESOLVED_TAG)?.[0];
    if (unresolved) {
      out.reasons.push(
        `${channel}: the template uses ${unresolved}, which this booking has no value for`,
      );
      continue;
    }
    if (!body.trim()) {
      out.reasons.push(`${channel}: the template is empty`);
      continue;
    }

    const { error } = await db.from("message_sends").insert({
      facility_id: row.facility_id,
      client_id: row.client_id,
      channel,
      to_address: to,
      source_kind: "booking_recovery",
      source_id: row.id,
      subject_rendered: subject,
      body_rendered: body,
      status: "queued",
      scheduled_for: new Date().toISOString(),
      provider: channel === "email" ? "resend" : "twilio",
      idempotency_key: `booking_recovery:${row.id}:-:${row.client_id}:${channel}:${row.step}`,
    });
    if (error && error.code !== "23505") {
      out.reasons.push(`${channel}: could not queue`);
      out.problems.push(`recovery ${row.id}: ${error.message}`);
      continue;
    }
    out.queued += 1;
  }
  return out;
}
