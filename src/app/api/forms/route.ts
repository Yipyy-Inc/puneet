import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  FORM_SELECT,
  VERSION_SELECT,
  toFormRow,
  type FormRow,
} from "@/lib/api/mappers/form";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// ============================================================================
// The forms a facility has.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `src/data/forms.ts` + `src/data/form-submissions.ts`. `/forms/[slug]` is a
// page customers fill in and `/facility/dashboard/forms/submissions/[id]` is
// where staff read the answers; neither outlived a refresh.
//
// ── A FORM AND ITS QUESTIONS ARE DIFFERENT ROWS ───────────────────────────
//
// `forms` is identity — name, slug, status, who it is for. The QUESTIONS live
// on `form_versions`, and a published version is frozen by trigger, because a
// submission names the version it was filled against and those questions have
// to still be readable years later.
//
// The fixture had the same two tables and rewrote the published version in
// place, so editing a form silently changed what every past submission was
// recorded against. That is the whole reason this shape exists.
// ============================================================================

export const dynamic = "force-dynamic";

export type { FormRow };

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("forms")
    .select(FORM_SELECT)
    .eq("facility_id", context.facilityId)
    .order("name");

  const status = params.get("status");
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const forms = (data ?? []) as unknown as Tables<"forms">[];

  // The versions for every form in one round trip rather than one per row. RLS
  // narrows them the same way it narrows the forms, so a caller who cannot see
  // a draft simply gets no draft attached.
  const { data: versionRows } = await supabase
    .from("form_versions")
    .select(VERSION_SELECT)
    .in(
      "form_id",
      forms.map((f) => f.id),
    );

  const versions = (versionRows ?? []) as unknown as Tables<"form_versions">[];

  return NextResponse.json({
    forms: forms.map((form) => toFormRow(form, versions)),
  });
}

/**
 * Create a form, with its first version as a DRAFT.
 *
 * Both in one request because a form with no version is a form with no
 * questions — a row that looks like something a customer could fill in and is
 * not. The version starts unpublished, so it stays editable until somebody
 * decides it is ready.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    slug?: string;
    type?: string;
    audience?: string;
    schema?: Record<string, unknown>;
    appliesTo?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    repeatPerPet?: boolean;
    requireAuth?: boolean;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A form needs a name." },
      { status: 400 },
    );
  }

  const slug =
    body?.slug?.trim() ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  if (!slug) {
    return NextResponse.json(
      { error: "That name does not make a usable web address." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // The facility comes from the SESSION, never the body.
  const { data: form, error } = await supabase
    .from("forms")
    .insert({
      facility_id: context.facilityId,
      name,
      slug,
      type: body?.type?.trim() || "custom",
      audience: body?.audience ?? "customer",
      applies_to: (body?.appliesTo ?? {}) as never,
      settings: (body?.settings ?? {}) as never,
      repeat_per_pet: body?.repeatPerPet ?? false,
      require_auth: body?.requireAuth ?? true,
      created_by: viewer.userId,
    })
    .select(FORM_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A form already uses that web address here." },
        { status: 409 },
      );
    }
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You are not allowed to create a form at this facility."
          : error.message,
      },
      { status: denied ? 403 : 400 },
    );
  }

  const created = form as unknown as Tables<"forms">;

  const { data: version } = await supabase
    .from("form_versions")
    .insert({
      form_id: created.id,
      facility_id: context.facilityId,
      version_number: 1,
      schema: (body?.schema ?? {}) as never,
      created_by: viewer.userId,
    })
    .select(VERSION_SELECT)
    .single();

  return NextResponse.json(
    {
      form: toFormRow(created, [
        (version ?? {}) as unknown as Tables<"form_versions">,
      ]),
    },
    { status: 201 },
  );
}
