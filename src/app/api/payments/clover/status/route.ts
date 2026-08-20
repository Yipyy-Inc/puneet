import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { cloverConfig } from "@/lib/clover/config";
import { connectionStatus } from "@/lib/clover/status";

// ============================================================================
// Where this facility's card processing stands.
//
// ── WHY A ROUTE AND NOT A SERVER COMPONENT ────────────────────────────────
//
// `connectionStatus()` already runs server-side on /clover, which is where a
// merchant lands after authorising. This exists because the settings screen is
// a client component that has to REFETCH — a facility connects in another tab
// and comes back, and the card should catch up without a reload.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// Never from the request. Same rule as /connect: a caller who could name the
// facility could read another business's merchant id and processing state.
// (`check:facility-from-session` fails the build on that shape.)
//
// ── AND IT NEVER RETURNS A TOKEN ──────────────────────────────────────────
//
// `connectionStatus` selects columns by name and the access token is not among
// them. Nothing here should ever be able to leak a credential to a browser,
// which is why this reads through that helper rather than the table.
// ============================================================================

export const dynamic = "force-dynamic";

/** Connecting a merchant decides where a business's money lands. */
const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const membership = viewer.memberships.find((m) => ADMIN_ROLES.has(m.role));
  if (!membership) {
    return NextResponse.json(
      {
        error: "Only an owner or administrator can see the payment connection.",
      },
      { status: 403 },
    );
  }

  const status = await connectionStatus(membership.facilityId);

  return NextResponse.json({
    ...status,
    // Whether the DEPLOYMENT can do this at all, which is a different question
    // from whether this facility has connected. Without it the card would offer
    // a Connect button that answers 503, and the facility would reasonably
    // conclude their account was at fault.
    configured: cloverConfig() !== null,
  });
}
