import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { clampMonths, readFacilityReport } from "@/lib/api/facility-report";

// ============================================================================
// One facility's bookings and takings, for the superadmin's Reports tab.
//
// Read-only: there is nothing to write. `?months=` accepts 3, 6 or 12 and
// clamps anything else to 6 rather than refusing — a hand-edited query string
// is not an attack, and a 400 on a report is a worse answer than the default
// range.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may read a facility's report." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const months = clampMonths(request.nextUrl.searchParams.get("months"));

  try {
    return NextResponse.json(await readFacilityReport(id, months));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build this facility's report.",
      },
      { status: 500 },
    );
  }
}
