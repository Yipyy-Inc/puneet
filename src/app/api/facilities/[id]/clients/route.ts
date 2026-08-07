import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { listFacilityClientsForAdmin } from "@/lib/api/admin-facilities";

// ============================================================================
// A facility's clients, for the superadmin detail page.
//
// The tab it feeds matched mock clients by facility NAME — a string compare
// against fictional businesses — so a real facility showed an empty list no
// matter how many clients it had.
//
// Platform-admin only, and `clients_read` agrees independently.
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
      { error: "Only a platform administrator may view a facility's clients." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    return NextResponse.json(await listFacilityClientsForAdmin(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed." },
      { status: 500 },
    );
  }
}
