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

export interface FormsPayload {
  forms: FormRow[];
  /** True when the page cap bit, so a screen can say the list is partial. */
  truncated: boolean;
}

// Matches the submissions route next door. Both queries below are bounded by
// it: neither may be the one that silently decides what a facility owns.
const PAGE = 500;

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

  // ── BOUNDED, AND IT SAYS SO ─────────────────────────────────────────────
  //
  // This had no limit, so PostgREST applied its own — 1,000 rows, silently.
  // A list cut at an arbitrary row invites somebody to conclude the missing
  // ones do not exist, which is the same defect the loyalty ledger had until
  // 2026-08-23 and the submissions route fixed the same way.
  let query = supabase
    .from("forms")
    .select(FORM_SELECT)
    .eq("facility_id", context.facilityId)
    .order("name")
    .limit(PAGE);

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
  //
  // ── TWO PER FORM, NOT EVERY VERSION EVER WRITTEN ───────────────────────
  //
  // This read `form_versions` whole. `toFormRow()` keeps exactly two — the
  // highest-numbered published version and the highest-numbered draft — and
  // discards the rest, but a version is frozen on publish and a new one is
  // written on every edit, so the discarded pile only grows. A form edited
  // fifty times shipped fifty schemas to render two.
  //
  // It was also unbounded, and that failed worse than the list above: past
  // PostgREST's 1,000-row cap a form comes back with NO version attached and
  // renders as "0 questions" — a form that looks EMPTY rather than one that
  // looks missing.
  //
  // `form_versions_current` is DISTINCT ON (form, published-ness), so it
  // yields at most two rows per form and the bound below can never bite
  // before the forms bound does. It is `security_invoker`, so
  // `form_versions_read` still decides what comes back — a view is a new way
  // to reach a table and therefore a new way to get RLS wrong; asserted in
  // supabase/tests/form-versions-current.sql, not assumed.
  //
  // Filtered on the view's own `facility_id` rather than an embed: the column
  // is NOT NULL on `form_versions` and agrees with the parent on every row, so
  // the condition needs no join and does not depend on PostgREST inferring a
  // relationship for a view. (The earlier `.in("form_id", [...])` is what both
  // of these replaced — a ~20KB key list that took the screen 17.5s to fill.)
  const { data: versionRows } = await supabase
    .from("form_versions_current")
    .select(VERSION_SELECT)
    .eq("facility_id", context.facilityId)
    .limit(PAGE * 2);

  const versions = (versionRows ?? []) as unknown as Tables<"form_versions">[];

  // Reported rather than left to be inferred, like the submissions route.
  const payload: FormsPayload = {
    forms: forms.map((form) => toFormRow(form, versions)),
    truncated: forms.length === PAGE,
  };

  return NextResponse.json(payload);
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
