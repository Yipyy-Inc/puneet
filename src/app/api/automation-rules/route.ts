import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { RULE_SELECT, foldUsage, toRule } from "@/lib/api/mappers/automation";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { RealAutomationRule } from "@/types/automations";
import { automationTriggerEnum } from "@/types/communications";
import type { Tables, TablesInsert } from "@/types/database";

// ============================================================================
// Automation rules.
//
// ── `totalSent` IS COUNTED, NOT STORED ────────────────────────────────────
//
// The screen this replaces displayed "Total Sent: 1,392" and "Last Triggered"
// dates for a system that had never sent anything — they were literals in a
// fixture. Both now come from `message_sends`, so a number that cannot be
// produced from evidence cannot be displayed.
//
// ── A RULE CANNOT BE BORN ENABLED ─────────────────────────────────────────
//
// POST refuses `enabled: true`. Turning a rule on means telling it to message
// real customers unattended, and that should be a deliberate second act by
// someone looking at what the rule says — not a field in a create payload that
// an import, a restore, or a "duplicate this rule" button could set by
// accident. The column defaults to false for the same reason.
// ============================================================================

export const dynamic = "force-dynamic";

export interface RulesPayload {
  rules: RealAutomationRule[];
}

export async function GET() {
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

  // The starter set, installed lazily and idempotently — the same shape as the
  // template seeding, and for the same reason: a default is not a stored value
  // until something needs it to be, and a facility created next month gets the
  // same set without anyone remembering to backfill.
  //
  // Every seeded rule is DISABLED. They are a menu of what this module can do,
  // which is what the spec asks for ("do not hide inactive rules — their
  // existence should be discoverable"), not a system that starts messaging
  // people because somebody opened a screen.
  //
  // Best effort: a failure here means the starter set is missing, not that the
  // facility's own rules cannot be listed.
  if (hasServiceRoleKey()) {
    const { error: seedError } = await createAdminClient().rpc(
      "ensure_automation_rules",
      { p_facility_id: context.facilityId },
    );
    if (seedError) {
      console.warn("[automations] rule seed skipped:", seedError.message);
    }
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("automation_rules")
    .select(RULE_SELECT)
    .eq("facility_id", context.facilityId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as Tables<"automation_rules">[];

  // One extra query rather than an embed: a rule that has sent nothing must
  // come back as 0 rather than be dropped, and an inner join loses exactly
  // those. Same reasoning as the chore list's group counts.
  const { data: sends } = await supabase
    .from("message_sends")
    .select("source_id, status, sent_at")
    .eq("facility_id", context.facilityId)
    .eq("source_kind", "automation_rule");

  const usage = foldUsage(
    (sends ?? []) as {
      source_id: string | null;
      status: string;
      sent_at: string | null;
    }[],
  );

  const payload: RulesPayload = {
    rules: rows.map((row) => toRule(row, usage.get(row.id))),
  };
  return NextResponse.json(payload);
}

export interface CreateRuleResult {
  rule: RealAutomationRule;
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

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    trigger?: string;
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

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A rule needs a name." },
      { status: 400 },
    );
  }

  const trigger = automationTriggerEnum.safeParse(body?.trigger);
  if (!trigger.success) {
    return NextResponse.json(
      { error: "That is not an event a rule can fire on." },
      { status: 400 },
    );
  }

  if (!body?.emailTemplateId && !body?.smsTemplateId) {
    return NextResponse.json(
      { error: "A rule needs at least one template to send." },
      { status: 400 },
    );
  }

  if (body?.enabled) {
    return NextResponse.json(
      {
        error:
          "A new rule starts switched off. Create it, read what it will send, then turn it on.",
      },
      { status: 400 },
    );
  }

  // The FACILITY comes from the session, never the request. The database
  // trigger additionally refuses a template belonging to a different one, so a
  // guessed id buys a 400 rather than another facility's wording.
  const insert: TablesInsert<"automation_rules"> = {
    facility_id: context.facilityId,
    name,
    trigger: trigger.data,
    enabled: false,
    email_template_id: body?.emailTemplateId ?? null,
    sms_template_id: body?.smsTemplateId ?? null,
    service_types: body?.serviceTypes ?? [],
    location_ids: body?.locationIds ?? [],
    min_amount: body?.minAmount ?? null,
    offset_minutes: body?.offsetMinutes ?? null,
    cooldown_days: body?.cooldownDays ?? 0,
    is_transactional: body?.isTransactional ?? false,
    created_by: viewer.userId,
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("automation_rules")
    .insert(insert)
    .select(RULE_SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      denied:
        "Writing automation rules needs permission to manage automations.",
      duplicate: "A rule with that name already exists.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to add automation rules." },
      { status: 403 },
    );
  }

  const result: CreateRuleResult = {
    rule: toRule(data as Tables<"automation_rules">),
  };
  return NextResponse.json(result, { status: 201 });
}
