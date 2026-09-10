import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/supabase/server";
import {
  FACILITY_CHOICE_COOKIE,
  getFacilityContext,
  myFacilities,
} from "@/lib/api/facility-context";

// ============================================================================
// The facility switcher.
//
// GET lists the caller's own facilities and which one this request resolved
// to; POST chooses one. The choice is a cookie holding the facility's SLUG,
// read by `getFacilityContext()` when the hostname names no facility — which
// is every request on staging.yipyy.com.
//
// Choosing grants nothing. POST refuses a facility the caller is not a member
// of, and even a hand-written cookie can only pick among the caller's own
// memberships, because that is all `getFacilityContext()` ever chooses from.
// ============================================================================

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [facilities, context] = await Promise.all([
    myFacilities(),
    getFacilityContext(),
  ]);

  return NextResponse.json({
    activeId: context?.facilityId ?? null,
    facilities,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    facilityId?: string;
  } | null;
  const facilities = await myFacilities();
  const chosen = facilities.find((f) => f.id === body?.facilityId);

  if (!chosen) {
    return NextResponse.json(
      { error: "You are not a member of that facility." },
      { status: 403 },
    );
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(FACILITY_CHOICE_COOKIE, chosen.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
