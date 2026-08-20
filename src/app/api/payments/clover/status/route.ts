import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
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

export async function GET() {
  // Whether the DEPLOYMENT can do this at all, which is a different question
  // from whether this facility has connected. Without it the card would offer a
  // Connect button that answers 503, and the facility would reasonably conclude
  // their own account was at fault.
  const configured = cloverConfig() !== null;

  const active = await activeAdminFacility();

  if (active.kind === "none") {
    return NextResponse.json(
      {
        error: "Only an owner or administrator can see the payment connection.",
      },
      { status: 403 },
    );
  }

  // Two facilities and a hostname that names neither. Answered rather than
  // guessed: the card asks which one instead of showing a Connect button whose
  // target it cannot state.
  if (active.kind === "ambiguous") {
    return NextResponse.json({
      ambiguous: true,
      choices: active.choices,
      configured,
    });
  }

  const status = await connectionStatus(active.facility.id);

  return NextResponse.json({
    ...status,
    // So the card can NAME the business it is about. A screen that changes
    // where money lands must not leave that to be inferred from the address
    // bar.
    facility: { name: active.facility.name, slug: active.facility.slug },
    configured,
  });
}
