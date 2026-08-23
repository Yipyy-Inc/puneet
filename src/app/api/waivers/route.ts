import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  WAIVER_SELECT,
  toWaiverRow,
  type WaiverRow,
} from "@/lib/api/mappers/waiver";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// ============================================================================
// The waivers a facility publishes.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `src/data/additional-features` and React state, behind 930 lines of
// `DigitalWaiversManager`. Every waiver it published and every signature it
// captured lived for as long as the tab stayed open — so a facility could take
// a customer through a liability waiver, watch it appear in a list, and hold
// nothing. That is the document a business produces AFTER a dog bites somebody.
//
// ── READING IS DELIBERATELY WIDER THAN MANAGING ───────────────────────────
//
// `waivers_read` admits anyone at the facility and any customer of it, for
// ACTIVE waivers; `view_waivers` is what additionally shows retired ones. That
// is not laxity. Measured: `view_waivers` is held by owner, admin and manager
// only — reception does not have it, and reception is who hands the tablet
// across the counter. A customer holds no permission at all and still has to
// read what they are about to sign.
//
// So this route does not branch on who is asking. RLS already knows.
// ============================================================================

export const dynamic = "force-dynamic";

export type { WaiverRow };

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
    .from("waivers")
    .select(WAIVER_SELECT)
    .eq("facility_id", context.facilityId)
    .order("name");

  // Retired waivers are asked for explicitly. A caller without `view_waivers`
  // gets the active ones either way — RLS decides, not this line.
  if (params.get("all") !== "1") query = query.eq("active", true);

  const service = params.get("service");
  if (service) query = query.contains("services", [service]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    waivers: ((data ?? []) as unknown as Tables<"waivers">[]).map(toWaiverRow),
  });
}

/**
 * Publish a waiver.
 *
 * A body is required and cannot be blank — the database refuses it too
 * (`waivers_body_not_empty`). A waiver with no text is a document that looks
 * like proof and is not one, and the staff-signature route already refuses to
 * sign such a thing; here it cannot be created in the first place.
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
    body?: string;
    blocks?: unknown[];
    services?: string[];
    version?: string;
    category?: string;
    requiresSignature?: boolean;
    requiresDigitalSignature?: boolean;
    requiresWitness?: boolean;
    expiryDays?: number | null;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A waiver needs a name." },
      { status: 400 },
    );
  }

  const text = body?.body?.trim();
  if (!text) {
    return NextResponse.json(
      {
        error:
          "A waiver needs its text. A document with nothing in it is not something anybody can agree to.",
      },
      { status: 400 },
    );
  }

  const expiryDays =
    body?.expiryDays === null || body?.expiryDays === undefined
      ? null
      : Number(body.expiryDays);
  if (
    expiryDays !== null &&
    (!Number.isFinite(expiryDays) || expiryDays <= 0)
  ) {
    return NextResponse.json(
      { error: "`expiryDays` must be a positive number, or left out." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // The facility comes from the SESSION, never the body.
  const { data, error } = await supabase
    .from("waivers")
    .insert({
      facility_id: context.facilityId,
      name,
      body: text,
      blocks: (body?.blocks ?? []) as never,
      services: body?.services ?? [],
      version: body?.version?.trim() || "1.0",
      category: body?.category?.trim() || null,
      requires_signature: body?.requiresSignature ?? true,
      requires_digital_signature: body?.requiresDigitalSignature ?? true,
      requires_witness: body?.requiresWitness ?? false,
      expiry_days: expiryDays,
      created_by: viewer.userId,
    })
    .select(WAIVER_SELECT)
    .single();

  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You are not allowed to publish a waiver at this facility."
          : error.message,
      },
      { status: denied ? 403 : 400 },
    );
  }

  return NextResponse.json(
    { waiver: toWaiverRow(data as unknown as Tables<"waivers">) },
    { status: 201 },
  );
}
