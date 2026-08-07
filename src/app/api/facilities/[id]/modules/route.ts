import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { readFacilityModules } from "@/lib/api/facility-modules";

// ============================================================================
// What a facility has been sold: reading it, changing one module, and putting
// it back to whatever the plan says.
//
// ── THREE VERBS, BECAUSE THERE ARE THREE ACTS ─────────────────────────────
//
//   GET     the effective list, plan plus this facility's exceptions
//   POST    enable/disable ONE module, optionally at an agreed price
//   DELETE  drop every exception — "reset to plan"
//
// DELETE is not "turn everything off". It removes the departures, and the plan
// decides again; a facility on Pack Leader ends up with the seven modules Pack
// Leader includes. The response says how many exceptions were dropped so the
// screen can tell "reset 6" from "there was nothing to reset" rather than
// claiming success either way.
//
// ── REFUSALS ARRIVE AS ERRORS, NOT AS SILENCE ─────────────────────────────
//
// Both writes go through SECURITY DEFINER functions that raise 42501 when the
// caller is not a platform admin, so an unauthorised change cannot look like a
// no-op. The RLS policy on facility_modules says the same thing independently.
// ============================================================================

export const dynamic = "force-dynamic";

const ModuleChange = z.object({
  moduleId: z.string().regex(/^module-[a-z0-9-]+$/, "Unknown module."),
  enabled: z.boolean(),
  /**
   * Cents. `null` means "use the catalogue price"; 0 is a real price meaning
   * free, and the two are not the same — hence nullable rather than optional.
   */
  priceOverrideCents: z.number().int().min(0).nullable().default(null),
  note: z.string().max(500).default(""),
  expiresAt: z.iso.datetime().nullable().default(null),
});

async function requirePlatformAdmin() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      {
        error: "Only a platform administrator may change a facility's modules.",
      },
      { status: 403 },
    );
  }
  return null;
}

/** 42501 is the database refusing, and it deserves a 403 rather than a 500. */
function statusFor(code: string | undefined): number {
  return code === "42501" ? 403 : 500;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    return NextResponse.json(await readFacilityModules(id));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read this facility's modules.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const parsed = ModuleChange.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { error } = await supabase.rpc("set_facility_module", {
    p_facility_id: id,
    p_module_id: parsed.data.moduleId,
    p_enabled: parsed.data.enabled,
    p_price_override_cents: parsed.data.priceOverrideCents,
    p_note: parsed.data.note,
    p_expires_at: parsed.data.expiresAt,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: statusFor(error.code) },
    );
  }

  // The changed list rather than an acknowledgement, so the screen renders what
  // the database now says instead of what it hoped it would say.
  return NextResponse.json(await readFacilityModules(id));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("reset_facility_modules", {
    p_facility_id: id,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: statusFor(error.code) },
    );
  }

  return NextResponse.json({
    cleared: data ?? 0,
    ...(await readFacilityModules(id)),
  });
}
