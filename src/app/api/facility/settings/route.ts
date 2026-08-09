import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  SETTING_DOMAINS,
  defaultSettings,
  isSettingDomain,
} from "@/lib/settings/domains";

// ============================================================================
// A facility's configuration, per domain.
//
// What `useSettings` has been serving out of `src/data/settings.ts` — one set
// of values for every facility on the platform, held in useState, persisting
// nowhere. `hours` and `rules` are not cosmetic: they feed the booking modals,
// so a facility open until 21:00 was being told by its own software that it
// closes at 19:00.
//
// ── AN ABSENT ROW IS AN ANSWER ────────────────────────────────────────────
//
// Nothing is seeded, so most facilities have no row for most domains. That is
// reported as `configured: false` beside the default rather than being smoothed
// over, because "we assume 07:00" and "this business opens at 07:00" are
// different claims and the screen needs to be able to tell them apart.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// Never from the request. A body field naming a facility would let a caller
// aim the permission check at one they hold `settings_general` for and write
// the row of one they do not.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_settings")
    .select("domain, value, updated_at")
    .eq("facility_id", context.facilityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = defaultSettings();

  for (const row of data ?? []) {
    if (!isSettingDomain(row.domain)) continue;

    // A stored value that no longer matches its schema is IGNORED in favour of
    // the default, not merged and not thrown. Merging would hand a screen a
    // half-shaped object it has no way to detect; throwing would take the whole
    // settings page down because one domain drifted after a schema change.
    const parsed = SETTING_DOMAINS[row.domain].schema.safeParse(row.value);
    if (!parsed.success) continue;

    settings[row.domain] = { value: parsed.data, configured: true };
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    domain?: string;
    value?: unknown;
  } | null;

  if (!body?.domain || !isSettingDomain(body.domain)) {
    return NextResponse.json(
      { error: `Unknown settings domain: ${body?.domain ?? "(none)"}.` },
      { status: 422 },
    );
  }

  // The WHOLE domain, not a patch of it. These objects are small, always edited
  // as a unit, and a partial write would need merge semantics that "what did I
  // just save" cannot then answer.
  const parsed = SETTING_DOMAINS[body.domain].schema.safeParse(body.value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error:
          `Invalid ${body.domain}: ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`.trim(),
      },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_settings")
    .upsert(
      {
        facility_id: context.facilityId,
        domain: body.domain,
        value: parsed.data,
      } as never,
      { onConflict: "facility_id,domain" },
    )
    .select("domain, value");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this facility's settings.",
      duplicate: "That setting is already being saved.",
    });
  }

  // An upsert refused by the INSERT policy raises 42501 and is caught above; an
  // UPDATE refused by its `using` clause affects zero rows and returns success.
  // Silence here would report a save that did not happen.
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Not allowed to change this facility's settings." },
      { status: 403 },
    );
  }

  // The STORED value, so a caller sees what was kept rather than what was sent.
  return NextResponse.json({
    domain: data[0].domain,
    value: data[0].value,
    configured: true,
  });
}
