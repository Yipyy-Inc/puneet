import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { TEMPLATE_SELECT, toTemplate } from "@/lib/api/mappers/automation";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { RealMessageTemplate } from "@/types/automations";
import type { Tables, TablesInsert } from "@/types/database";

// ============================================================================
// A facility's message bodies.
//
// ── THE SHIPPED SET IS SEEDED HERE, NOT BY A DATA MIGRATION ───────────────
//
// `private.ensure_message_templates()` is idempotent on `(facility_id, key)`,
// so calling it on every GET costs one no-op insert and means a facility
// created next month gets the same twelve templates without anyone remembering
// to backfill. Same reasoning as facility_settings: a default is not a stored
// value until something needs it to be.
//
// It runs as service_role because the function is revoked from `authenticated`
// — seeding is not something a session should be able to trigger against an
// arbitrary facility, and the facility here comes from the session anyway.
// Where there is no service-role key (a local dev box without it), the seed is
// skipped and the list is simply whatever exists. It is a convenience, not a
// correctness requirement.
// ============================================================================

export const dynamic = "force-dynamic";

export interface TemplatesPayload {
  templates: RealMessageTemplate[];
}

export async function GET(request: NextRequest) {
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

  if (hasServiceRoleKey()) {
    const admin = createAdminClient();
    // Best effort. A failure here means the shipped templates are missing, not
    // that the facility's own templates cannot be listed, so it must not turn
    // a working screen into an error page.
    const { error: seedError } = await admin.rpc("ensure_message_templates", {
      p_facility_id: context.facilityId,
    });
    if (seedError) {
      console.warn("[templates] seed skipped:", seedError.message);
    }
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("message_templates")
    .select(TEMPLATE_SELECT)
    .eq("facility_id", context.facilityId)
    .order("name");

  // Retired templates are hidden by default and reachable on purpose: a rule
  // may still name one, and a message was sent from it.
  if (params.get("includeRetired") !== "1") query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload: TemplatesPayload = {
    templates: (data ?? []).map((row) =>
      toTemplate(row as Tables<"message_templates">),
    ),
  };
  return NextResponse.json(payload);
}

export interface CreateTemplateResult {
  template: RealMessageTemplate;
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
    channel?: string;
    category?: string;
    subject?: string | null;
    body?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A template needs a name." },
      { status: 400 },
    );
  }

  const channel = body?.channel;
  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json(
      { error: "A template is either an email or a text." },
      { status: 400 },
    );
  }

  const text = body?.body?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "A template needs something to say." },
      { status: 400 },
    );
  }

  const subject = body?.subject?.trim() || null;
  // Refused here rather than at send time: a rule pointing at an email template
  // with no subject would queue a message that can never leave the outbox.
  if (channel === "email" && !subject) {
    return NextResponse.json(
      { error: "An email template needs a subject line." },
      { status: 400 },
    );
  }

  const CATEGORIES = ["reminder", "confirmation", "update", "general"];
  if (body?.category && !CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: `A category is one of ${CATEGORIES.join(", ")}.` },
      { status: 400 },
    );
  }

  // The FACILITY comes from the session, never the request. `key` is
  // deliberately not settable: it identifies the templates Yipyy ships, and a
  // facility able to claim one would have its own work overwritten by the next
  // seed.
  const insert: TablesInsert<"message_templates"> = {
    facility_id: context.facilityId,
    name,
    channel,
    category: body?.category ?? "general",
    subject: channel === "email" ? subject : null,
    body: text,
    created_by: viewer.userId,
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert(insert)
    .select(TEMPLATE_SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      denied: "Writing templates needs permission to manage automations.",
      duplicate: "A template with that name already exists.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to add templates." },
      { status: 403 },
    );
  }

  const result: CreateTemplateResult = {
    template: toTemplate(data as Tables<"message_templates">),
  };
  return NextResponse.json(result, { status: 201 });
}
