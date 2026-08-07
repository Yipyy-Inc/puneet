import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityForAdmin } from "@/lib/api/admin-facilities";

// ============================================================================
// One facility, for the superadmin detail page.
//
// That page resolved its facility with
//
//   facilities.find((f) => f.id === Number(params.id))
//
// against the mock array. `Number(uuid)` is NaN, so every real facility 404'd —
// which is what a superadmin got the moment they clicked a row in the list that
// had just started showing real facilities.
//
// Platform-admin only, and RLS agrees independently: a facility owner who finds
// this URL gets their own facility at most.
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
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may view a facility." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const facility = await getFacilityForAdmin(id);
    if (!facility) {
      return NextResponse.json(
        { error: "Facility not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(facility);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed." },
      { status: 500 },
    );
  }
}

const StatusInput = z.object({
  status: z.enum(["trialing", "active", "past_due", "suspended", "cancelled"]),
});

/**
 * Change a facility's subscription status — suspend it, or bring it back.
 *
 * The detail page's status menu used to call `setCurrentStatus(...)` and stop
 * there: the badge changed, nothing else did, and a refresh undid it. Same
 * shape as the Add Facility toast that claimed to have created a facility.
 *
 * `set_subscription_status` requires SUPERADMIN, not merely platform
 * membership — suspending a business is destructive in every way that matters
 * to the person it happens to. This route's own check is a clearer error, not
 * the boundary.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may change a subscription." },
      { status: 403 },
    );
  }

  const parsed = StatusInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Unknown subscription status." },
      { status: 422 },
    );
  }

  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("set_subscription_status", {
    p_facility_id: id,
    p_status: parsed.data.status,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }

  return NextResponse.json(data);
}
