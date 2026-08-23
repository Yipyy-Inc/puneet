import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  FORM_SELECT,
  VERSION_SELECT,
  toFormRow,
  type FormRow,
} from "@/lib/api/mappers/form";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables, TablesUpdate } from "@/types/database";

// ============================================================================
// One form: reading it, editing it, and publishing its questions.
//
// ── EDITING QUESTIONS IS PUBLISHING A NEW VERSION ─────────────────────────
//
// `PATCH` with a `schema` does NOT rewrite the current version. It writes into
// the open draft, or opens a new one when the newest version is published — and
// `publish: true` freezes it.
//
// That is the entire correction this table shape exists to make. The fixture's
// `updateForm()` found the latest version and rewrote its sections, fields and
// logic in place, published or not, answered or not. So a facility tidying up
// the wording of a question changed what everybody who had already answered was
// recorded as having been asked.
//
// The trigger refuses that now, which means this route has to do the right
// thing rather than merely intend to: a PATCH against a published version would
// come back 42501.
// ============================================================================

export const dynamic = "force-dynamic";

async function versionsFor(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  formId: string,
): Promise<Tables<"form_versions">[]> {
  const { data } = await supabase
    .from("form_versions")
    .select(VERSION_SELECT)
    .eq("form_id", formId)
    .order("version_number", { ascending: false });
  return (data ?? []) as unknown as Tables<"form_versions">[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  // No facility filter: RLS narrows this already, and a CUSTOMER has no
  // facility context of their own while still needing to read the form.
  const { data, error } = await supabase
    .from("forms")
    .select(FORM_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  const form = data as unknown as Tables<"forms">;
  const result: FormRow = toFormRow(form, await versionsFor(supabase, form.id));
  return NextResponse.json({ form: result });
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
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    slug?: string;
    type?: string;
    status?: string;
    audience?: string;
    appliesTo?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    repeatPerPet?: boolean;
    requireAuth?: boolean;
    /** New questions. Goes to a DRAFT version — never over a published one. */
    schema?: Record<string, unknown>;
    /** Freeze the draft this request writes. One-way. */
    publish?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const supabase = await createServerClient();

  const patch: TablesUpdate<"forms"> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A form needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }
  if (body.slug !== undefined) patch.slug = body.slug.trim();
  if (body.type !== undefined) patch.type = body.type.trim() || "custom";
  if (body.status !== undefined) patch.status = body.status;
  if (body.audience !== undefined) patch.audience = body.audience;
  if (body.appliesTo !== undefined) patch.applies_to = body.appliesTo as never;
  if (body.settings !== undefined) patch.settings = body.settings as never;
  if (body.repeatPerPet !== undefined) patch.repeat_per_pet = body.repeatPerPet;
  if (body.requireAuth !== undefined) patch.require_auth = body.requireAuth;

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();

    // `.select()` so a refusal can be told from a no-op — an UPDATE that fails
    // a `using` policy touches zero rows and reports success.
    const { data, error } = await supabase
      .from("forms")
      .update(patch)
      .eq("facility_id", context.facilityId)
      .eq("id", id)
      .select("id");

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A form already uses that web address here." },
          { status: 409 },
        );
      }
      const denied = error.code === "42501";
      return NextResponse.json(
        { error: error.message },
        { status: denied ? 403 : 400 },
      );
    }

    const refused = deniedIfUntouched(
      data,
      "You are not allowed to change that form.",
    );
    if (refused) return refused;
  }

  // ── THE QUESTIONS ───────────────────────────────────────────────────────
  if (body.schema !== undefined || body.publish) {
    const versions = await versionsFor(supabase, id);
    const newest = versions[0];
    const openDraft = versions.find((v) => v.published_at === null);

    if (openDraft) {
      const { data, error } = await supabase
        .from("form_versions")
        .update({
          ...(body.schema !== undefined
            ? { schema: body.schema as never }
            : {}),
          ...(body.publish ? { published_at: new Date().toISOString() } : {}),
        })
        .eq("id", openDraft.id)
        .select("id");

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: error.code === "42501" ? 403 : 400 },
        );
      }
      const refused = deniedIfUntouched(
        data,
        "You are not allowed to change that form's questions.",
      );
      if (refused) return refused;
    } else {
      // Everything is published, so this becomes a NEW version rather than an
      // edit. This is the branch the fixture did not have.
      const { error } = await supabase.from("form_versions").insert({
        form_id: id,
        facility_id: context.facilityId,
        version_number: (newest?.version_number ?? 0) + 1,
        schema: (body.schema ?? newest?.schema ?? {}) as never,
        published_at: body.publish ? new Date().toISOString() : null,
        created_by: viewer.userId,
      });

      if (error) {
        const denied = error.code === "42501";
        return NextResponse.json(
          {
            error: denied
              ? "You are not allowed to change that form's questions."
              : error.message,
          },
          { status: denied ? 403 : 400 },
        );
      }
    }
  }

  const { data: form } = await supabase
    .from("forms")
    .select(FORM_SELECT)
    .eq("id", id)
    .single();

  const row = form as unknown as Tables<"forms">;
  return NextResponse.json({
    form: toFormRow(row, await versionsFor(supabase, id)),
  });
}
