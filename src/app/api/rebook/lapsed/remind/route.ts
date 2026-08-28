import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { getViewer } from "@/lib/auth/viewer";
import { loadMessageContext } from "@/lib/messaging/dispatch";
import { UNRESOLVED_TAG, resolveTemplate } from "@/lib/messaging/render";
import { channelConfigured } from "@/lib/messaging/send";
import { facilityToday, readRebookConfig } from "@/lib/rebook/config";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { LapsedTarget, RemindResult } from "@/types/rebook";

// ============================================================================
// Actually send the rebook reminder.
//
// Until this existed the button raised `toast.success("Composer opened for
// …")` and did nothing. Six of them did, on the same card.
//
// ── IT REUSES THE OUTBOX, IT DOES NOT SEND ────────────────────────────────
//
// Nothing here talks to Resend or Twilio. It renders a template and writes a
// `queued` row, and the messaging tick sends it — which means suppression,
// the channel check, the retry and the delivery record are the SAME code as
// every automation rule and every workflow step. A second sender would be a
// second place to forget that somebody has unsubscribed, and under CASL that
// is not a bug you get to have twice.
//
// The one check that must happen HERE is the unresolved variable: the tick
// re-checks suppression but not rendering, so a template reaching for
// {{check_in_date}} would otherwise go out with the literal tag in it.
//
// ── WHO YOU MAY MESSAGE IS RE-DERIVED, NOT TAKEN FROM THE REQUEST ─────────
//
// The body names client+service pairings, and every one is looked up against a
// fresh `lapsed_clients()` read through the RLS client. So the request cannot
// name somebody who is not lapsed, is not at this facility, has a booking
// coming up, or was dismissed — and the same exclusions the screen showed are
// the ones enforced. Trusting the ids would turn "send a reminder" into "send
// anything to anyone".
//
// ── WHY service_role WRITES THE ROW ───────────────────────────────────────
//
// `message_sends` grants a session SELECT and nothing else, deliberately: the
// outbox is the record of what was attempted. So the insert goes through the
// admin client, and the permission RLS would have applied is applied here,
// explicitly, from `my_permissions()` — the sanctioned pattern for a write RLS
// cannot express.
// ============================================================================

export const dynamic = "force-dynamic";

/** Matches the shape `lapsed_clients` returns. */
interface LapsedRow {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service: string;
  last_booking_id: string | null;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  if (!holds(await myPermissions(), "marketing_manage_automations")) {
    return NextResponse.json(
      { error: "Sending reminders needs permission to manage automations." },
      { status: 403 },
    );
  }

  if (!hasServiceRoleKey()) {
    // Say so rather than reporting a success on a queue that was never written.
    return NextResponse.json(
      { error: "Messaging is not configured on this deployment." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    targets?: LapsedTarget[];
  } | null;

  const targets = Array.isArray(body?.targets) ? body.targets : [];
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "Nobody was named to remind." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const [{ config }, today] = await Promise.all([
    readRebookConfig(supabase, context.facilityId),
    facilityToday(supabase, context.facilityId),
  ]);

  const { data: lapsed, error: lapsedError } = await supabase.rpc(
    "lapsed_clients",
    {
      p_facility_id: context.facilityId,
      p_rules: config.services as never,
      p_today: today,
      p_limit: 500,
    },
  );
  if (lapsedError) {
    return NextResponse.json({ error: lapsedError.message }, { status: 400 });
  }

  const byKey = new Map<string, LapsedRow>();
  for (const row of (lapsed ?? []) as LapsedRow[]) {
    byKey.set(`${row.client_id}:${row.service}`, row);
  }

  const admin = createAdminClient();
  const result: RemindResult = { queued: 0, duplicates: 0, skipped: [] };

  const skip = (t: LapsedTarget, reason: string) =>
    result.skipped.push({ ...t, reason });

  for (const target of targets) {
    const row = byKey.get(`${target.clientId}:${target.service}`);
    if (!row) {
      skip(target, "no longer lapsed");
      continue;
    }

    const rule = config.services[target.service];
    if (!rule?.remindersEnabled) {
      skip(target, "reminders are switched off for this service");
      continue;
    }

    const channels: ("email" | "sms")[] =
      rule.channel === "both" ? ["email", "sms"] : [rule.channel];

    const messageContext = await loadMessageContext(admin, {
      facility_id: context.facilityId,
      client_id: row.client_id,
      booking_id: row.last_booking_id,
      location_id: null,
    });
    if (!messageContext) {
      skip(target, "no client record to message");
      continue;
    }

    let anyChannelWorked = false;
    for (const channel of channels) {
      const to =
        channel === "email" ? messageContext.email : messageContext.phone;
      if (!to) {
        skip(
          target,
          `no ${channel === "email" ? "email address" : "mobile number"} on file`,
        );
        continue;
      }
      if (!channelConfigured(channel)) {
        skip(target, `${channel} is not configured on this deployment`);
        continue;
      }

      const key =
        channel === "email" ? "rebook_reminder" : "rebook_reminder_sms";
      const { data: template } = await admin
        .from("message_templates")
        .select("id, subject, body, is_active")
        .eq("facility_id", context.facilityId)
        .eq("key", key)
        .maybeSingle();

      const t = template as {
        id: string;
        subject: string | null;
        body: string;
        is_active: boolean;
      } | null;
      if (!t || !t.is_active) {
        skip(target, "the rebook template is missing or retired");
        continue;
      }

      const subject = t.subject
        ? resolveTemplate(t.subject, messageContext.data)
        : null;
      const rendered = resolveTemplate(t.body, messageContext.data);

      // A HALF-RENDERED MESSAGE MUST NOT GO OUT. `resolveTemplate` leaves a tag
      // it cannot resolve exactly as written — right for the editor's preview,
      // very wrong for a customer. `{{tag|}}` still resolves, so an author who
      // wants a blank has a way to say so.
      const unresolved =
        rendered.match(UNRESOLVED_TAG)?.[0] ??
        subject?.match(UNRESOLVED_TAG)?.[0];
      if (unresolved) {
        skip(
          target,
          `the template uses ${unresolved}, which this reminder has no value for`,
        );
        continue;
      }

      // '<source_kind>:<service>:-:<client>:<channel>:<occasion>'. The occasion
      // is the FACILITY-LOCAL date: a second click today is refused by the
      // unique index, and the same client may be reminded again tomorrow.
      const idempotencyKey = `rebook:${row.service}:-:${row.client_id}:${channel}:${today}`;

      const { error: insertError } = await admin.from("message_sends").insert({
        facility_id: context.facilityId,
        client_id: row.client_id,
        channel,
        to_address: to,
        source_kind: "rebook",
        template_id: t.id,
        subject_rendered: subject,
        body_rendered: rendered,
        status: "queued",
        scheduled_for: new Date().toISOString(),
        provider: channel === "email" ? "resend" : "twilio",
        idempotency_key: idempotencyKey,
      });

      if (insertError) {
        // 23505 is the unique key: this exact reminder already went out today.
        // The mechanism working, not a failure — and counted separately so a
        // second click reads as "nothing more to do".
        if (insertError.code === "23505") {
          result.duplicates += 1;
          anyChannelWorked = true;
          continue;
        }
        skip(target, insertError.message);
        continue;
      }

      result.queued += 1;
      anyChannelWorked = true;
    }

    if (!anyChannelWorked && result.skipped.length === 0) {
      skip(target, "no channel could be used");
    }
  }

  return NextResponse.json(result);
}
