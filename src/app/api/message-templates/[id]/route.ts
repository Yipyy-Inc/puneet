import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { TEMPLATE_SELECT, toTemplate } from "@/lib/api/mappers/automation";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import type { RealMessageTemplate } from "@/types/automations";
import type { Tables, TablesUpdate } from "@/types/database";

// ============================================================================
// Changing what a template SAYS.
//
// ── WHY THIS DID NOT EXIST UNTIL NOW ──────────────────────────────────────
//
// The templates route had GET and POST and nothing else, so the fourteen
// templates Yipyy ships could be read, picked and sent — and never reworded.
// A facility that wanted its booking confirmation in its own voice had no way
// to say so, and the only workaround was to create a second template and
// repoint every rule at it.
//
// That gap was also quietly load-bearing on a false claim: three comments in
// this codebase said the rebook wording was "editable on the Templates tab".
// There is no Templates tab, and until this route there was nothing behind it.
// Corrected in the same change.
//
// ── `key` IS STILL NOT SETTABLE ───────────────────────────────────────────
//
// Same reasoning as POST. `key` identifies the templates Yipyy ships and is
// what `ensure_message_templates` matches on; a facility able to claim or
// change one would have its own work restored out from under it by the next
// seed. The WORDING is theirs, the identity is not.
//
// ── EDITING A SHIPPED TEMPLATE IS ALLOWED, AND MUST BE ────────────────────
//
// `is_system` marks a template as one we installed, not one that is frozen.
// The seeder is `on conflict do nothing` precisely so an edited shipped
// template is left alone — that was the design from the first migration, and
// this route is the half of it that was missing.
// ============================================================================

export const dynamic = "force-dynamic";

export interface UpdateTemplateResult {
  template: RealMessageTemplate;
}

const CATEGORIES = ["reminder", "confirmation", "update", "general"];

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
    subject?: string | null;
    body?: string;
    category?: string;
    isActive?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Read it first, through the RLS client. The channel decides whether a
  // subject is required, and taking that from the request would let a caller
  // clear the subject of an email template by calling it a text.
  const { data: current } = await supabase
    .from("message_templates")
    .select("id, channel, subject")
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "No such template." }, { status: 404 });
  }
  const existing = current as {
    channel: string;
    subject: string | null;
  };

  const patch: TablesUpdate<"message_templates"> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A template needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }

  if (body.body !== undefined) {
    const text = body.body.trim();
    if (!text) {
      return NextResponse.json(
        { error: "A template needs something to say." },
        { status: 400 },
      );
    }
    patch.body = text;
  }

  if (body.subject !== undefined) {
    patch.subject = body.subject?.trim() || null;
  }

  // Checked against what the template WILL be, not what was sent: clearing the
  // subject of an email template queues a message that can never leave the
  // outbox, and it is cheaper to refuse it here than to explain it later.
  if (existing.channel === "email") {
    const subject =
      patch.subject !== undefined ? patch.subject : existing.subject;
    if (!subject) {
      return NextResponse.json(
        { error: "An email template needs a subject line." },
        { status: 400 },
      );
    }
  } else if (patch.subject) {
    // A text has no subject. Silently dropping it would leave the editor
    // showing a field the sender ignores.
    return NextResponse.json(
      { error: "A text template has no subject line." },
      { status: 400 },
    );
  }

  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `A category is one of ${CATEGORIES.join(", ")}.` },
        { status: 400 },
      );
    }
    patch.category = body.category;
  }

  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const { data, error } = await supabase
    .from("message_templates")
    .update(patch)
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .select(TEMPLATE_SELECT);

  if (error) {
    return writeFailure(error, {
      denied: "Editing templates needs permission to manage automations.",
      duplicate: "A template with that name already exists.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You are not allowed to edit this template.",
  );
  if (denied) return denied;

  const result: UpdateTemplateResult = {
    template: toTemplate(data![0] as Tables<"message_templates">),
  };
  return NextResponse.json(result);
}
