import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  WAIVER_SELECT,
  toWaiverRow,
  type WaiverRow,
} from "@/lib/api/mappers/waiver";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables, TablesUpdate } from "@/types/database";

// ============================================================================
// One waiver: reading it, editing it, retiring it.
//
// ── EDITING IS ALLOWED, AND THAT IS WHY SIGNATURES COPY ───────────────────
//
// A facility can rewrite its own legal text — it has to be able to. Nothing
// here tries to freeze the document, because the record that has to stay
// truthful is the SIGNATURE, and each one already carries its own copy of the
// text and a hash of it. Editing this row changes what the NEXT person signs
// and nothing about what previous people did.
//
// ── RETIRING, NOT DELETING ────────────────────────────────────────────────
//
// There is no DELETE here and no delete policy behind it. Signatures name a
// waiver by an id with no foreign key, so removing the row would not orphan
// anything — but it would destroy the only readable statement of what the
// business used to ask people to agree to. `active = false` is the answer.
// ============================================================================

export const dynamic = "force-dynamic";

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

  // No facility filter: RLS already narrows this to waivers the caller may see,
  // and a CUSTOMER has no facility context of their own while still needing to
  // read what they are about to sign.
  const { data, error } = await supabase
    .from("waivers")
    .select(WAIVER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such waiver." }, { status: 404 });
  }

  return NextResponse.json({
    waiver: toWaiverRow(data as unknown as Tables<"waivers">),
  });
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
    body?: string;
    blocks?: unknown[];
    services?: string[];
    version?: string;
    category?: string | null;
    active?: boolean;
    requiresSignature?: boolean;
    requiresDigitalSignature?: boolean;
    requiresWitness?: boolean;
    expiryDays?: number | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  // Typed against the table, so a field that does not exist is a compile error
  // rather than a silently ignored key.
  const patch: TablesUpdate<"waivers"> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A waiver needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }

  if (body.body !== undefined) {
    const text = body.body.trim();
    if (!text) {
      return NextResponse.json(
        {
          error:
            "A waiver needs its text. A document with nothing in it is not something anybody can agree to.",
        },
        { status: 400 },
      );
    }
    patch.body = text;
  }

  if (body.blocks !== undefined) patch.blocks = body.blocks as never;
  if (body.services !== undefined) patch.services = body.services;
  if (body.version !== undefined) patch.version = body.version.trim() || "1.0";
  if (body.category !== undefined)
    patch.category = body.category?.trim() || null;
  if (body.active !== undefined) patch.active = body.active;
  if (body.requiresSignature !== undefined)
    patch.requires_signature = body.requiresSignature;
  if (body.requiresDigitalSignature !== undefined)
    patch.requires_digital_signature = body.requiresDigitalSignature;
  if (body.requiresWitness !== undefined)
    patch.requires_witness = body.requiresWitness;

  if (body.expiryDays !== undefined) {
    if (body.expiryDays === null) patch.expiry_days = null;
    else {
      const days = Number(body.expiryDays);
      if (!Number.isFinite(days) || days <= 0) {
        return NextResponse.json(
          { error: "`expiryDays` must be a positive number, or null." },
          { status: 400 },
        );
      }
      patch.expiry_days = days;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = await createServerClient();

  // `.select()` so a refusal can be told from a no-op — an UPDATE that fails a
  // `using` policy touches zero rows and reports success.
  const { data, error } = await supabase
    .from("waivers")
    .update(patch)
    .eq("facility_id", context.facilityId)
    .eq("id", id)
    .select(WAIVER_SELECT);

  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 400 },
    );
  }

  const refused = deniedIfUntouched(
    data,
    "You are not allowed to change that waiver.",
  );
  if (refused) return refused;

  const waiver: WaiverRow = toWaiverRow(
    (data as unknown as Tables<"waivers">[])[0],
  );
  return NextResponse.json({ waiver });
}
