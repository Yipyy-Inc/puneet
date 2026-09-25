import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import type { CheckoutCutOffReport } from "@/lib/settings/lodging";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// PUT /api/lodging/checkout-cut-off — save the cut-off, and apply it to the
// stays already booked.
//
// Not the generic PATCH /api/facility/settings. That route would save the row
// and stop, and the cut-off is applied by a trigger when a stay is WRITTEN — so
// every stay already in the book would carry on as if nothing had changed.
// `save_checkout_cut_off` saves and re-derives in one transaction, and answers
// with what moved (see 20260925120000).
//
// The facility comes from the session, never the body — the same rule, and
// for the same reason, as the settings route.
// ============================================================================

export const dynamic = "force-dynamic";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const bodySchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(HH_MM).nullable().optional(),
});

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "The cut-off time must be HH:MM on a 24-hour clock." },
      { status: 422 },
    );
  }
  const { enabled, time } = parsed.data;
  if (enabled && !time) {
    return NextResponse.json(
      { error: "A cut-off that is on needs a time." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("save_checkout_cut_off", {
    p_facility_id: context.facilityId,
    p_enabled: enabled,
    p_time: time ?? null,
  });

  if (error) {
    const denied = error.code === "42501";
    const invalid = error.code === "22023";
    return NextResponse.json(
      {
        error: denied
          ? "You do not have permission to change lodging settings."
          : error.message,
      },
      { status: denied ? 403 : invalid ? 422 : 500 },
    );
  }

  return NextResponse.json(data as unknown as CheckoutCutOffReport);
}
