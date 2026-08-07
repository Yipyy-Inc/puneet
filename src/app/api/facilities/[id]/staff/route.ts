import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { listFacilityStaffForAdmin } from "@/lib/api/admin-facilities";

// ============================================================================
// A facility's staff, for the superadmin detail page.
//
// That tab read `users.filter(u => u.facilityId === Number(params.id))` out of
// src/data — so a real facility showed nobody, including the 23 staff records
// that are genuinely in Postgres.
//
// Platform-admin only here, and `staff_read` says the same independently: a
// facility owner who guesses another facility's uuid gets an empty array.
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
      { error: "Only a platform administrator may view a facility's staff." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    return NextResponse.json(await listFacilityStaffForAdmin(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed." },
      { status: 500 },
    );
  }
}
