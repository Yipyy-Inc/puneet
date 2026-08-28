import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { RULE_SELECT, foldUsage, toRule } from "@/lib/api/mappers/automation";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { channelConfigured } from "@/lib/messaging/send";
import { createServerClient } from "@/lib/supabase/server";
import {
  DELIVERABLE_TRIGGERS,
  type RealAutomationRule,
} from "@/types/automations";
import type { Tables, TablesUpdate } from "@/types/database";

// ============================================================================
// Editing one rule — including the inline on/off toggle.
//
// ── TURNING A RULE ON IS THE ONLY DANGEROUS EDIT HERE ─────────────────────
//
// Every other field changes what a message SAYS. `enabled` changes whether
// real customers get messaged, unattended, from now on. So enabling is checked
// against two things the editor cannot see:
//
//   1. Does anything actually emit this trigger yet? Sixteen of the nineteen
//      have no emitter. A rule on one of them can be written and saved — hiding
//      them is what caused the eight-of-seventeen bug — but it must not be
//      switchable to a state it cannot honour.
//   2. Is the channel configured at all? A facility whose deployment has no
//      Twilio credentials can enable an SMS rule and watch every send fail with
//      "no SMS service configured" on a row nobody reads. Refuse it up front.
//
// Both are refusals with a reason, not silent no-ops.
// ============================================================================

export const dynamic = "force-dynamic";

export interface UpdateRuleResult {
  rule: RealAutomationRule;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    enabled?: boolean;
    emailTemplateId?: string | null;
    smsTemplateId?: string | null;
    serviceTypes?: string[];
    locationIds?: string[];
    minAmount?: number | null;
    offsetMinutes?: number | null;
    cooldownDays?: number;
    isTransactional?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Read it first: enabling needs to know the trigger and which channels the
  // rule sends on, and neither is necessarily in the patch.
  const { data: existing, error: readError } = await supabase
    .from("automation_rules")
    .select(RULE_SELECT)
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "No such rule." }, { status: 404 });
  }

  const current = existing as Tables<"automation_rules">;

  if (body.enabled === true) {
    if (!DELIVERABLE_TRIGGERS.has(current.trigger)) {
      return NextResponse.json(
        {
          error:
            "Nothing emits that event yet, so this rule would never fire. It can be written and kept, but not switched on.",
        },
        { status: 409 },
      );
    }

    const emailTemplate =
      body.emailTemplateId !== undefined
        ? body.emailTemplateId
        : current.email_template_id;
    const smsTemplate =
      body.smsTemplateId !== undefined
        ? body.smsTemplateId
        : current.sms_template_id;

    if (emailTemplate && !channelConfigured("email")) {
      return NextResponse.json(
        { error: "Email is not configured on this deployment." },
        { status: 409 },
      );
    }
    if (smsTemplate && !channelConfigured("sms")) {
      return NextResponse.json(
        { error: "Texting is not configured on this deployment." },
        { status: 409 },
      );
    }
  }

  const patch: TablesUpdate<"automation_rules"> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A rule needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.emailTemplateId !== undefined)
    patch.email_template_id = body.emailTemplateId;
  if (body.smsTemplateId !== undefined)
    patch.sms_template_id = body.smsTemplateId;
  if (body.serviceTypes !== undefined) patch.service_types = body.serviceTypes;
  if (body.locationIds !== undefined) patch.location_ids = body.locationIds;
  if (body.minAmount !== undefined) patch.min_amount = body.minAmount;
  if (body.offsetMinutes !== undefined)
    patch.offset_minutes = body.offsetMinutes;
  if (body.cooldownDays !== undefined) patch.cooldown_days = body.cooldownDays;
  if (body.isTransactional !== undefined)
    patch.is_transactional = body.isTransactional;

  // The trigger is deliberately NOT patchable. A rule's trigger is its
  // identity; changing it in place turns "Booking Confirmation" into something
  // that fires on check-out while keeping its name, its history and its send
  // count. That is exactly the silent rewrite the old dropdown performed.
  // Write a new rule instead.

  const { data, error } = await supabase
    .from("automation_rules")
    .update(patch)
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .select(RULE_SELECT);

  if (error) {
    return writeFailure(error, {
      denied:
        "Editing automation rules needs permission to manage automations.",
      duplicate: "A rule with that name already exists.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "You are not allowed to edit this rule.",
  );
  if (denied) return denied;

  const { data: sends } = await supabase
    .from("message_sends")
    .select("source_id, status, sent_at")
    .eq("facility_id", context.facilityId)
    .eq("source_kind", "automation_rule")
    .eq("source_id", id);

  const usage = foldUsage(
    (sends ?? []) as {
      source_id: string | null;
      status: string;
      sent_at: string | null;
    }[],
  );

  const row = data![0] as Tables<"automation_rules">;
  const result: UpdateRuleResult = { rule: toRule(row, usage.get(id)) };
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const supabase = await createServerClient();

  // `message_sends.source_id` holds no foreign key to this row on purpose, so
  // deleting a rule leaves its sent messages readable — the record of what a
  // customer was told outlives the thing that told them.
  const { data, error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied:
        "Deleting automation rules needs permission to manage automations.",
      duplicate: "That rule could not be removed.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "You are not allowed to delete this rule.",
  );
  if (denied) return denied;

  return NextResponse.json({ deleted: id });
}
