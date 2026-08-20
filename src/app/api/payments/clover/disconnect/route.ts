import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Disconnecting a Clover merchant account.
//
// ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
//
// A self-service connect screen without one is a trap: a facility that
// authorises the wrong merchant — a personal account instead of the business
// one, sandbox instead of production — has no way back, and has to ask somebody
// with database access. That is the opposite of self-service.
//
// ── REVOKED, NOT DELETED ──────────────────────────────────────────────────
//
// `public.revoke_payment_connection` already existed and is what this calls.
// The row stays and its status becomes `revoked`; `chargeableConnection`
// refuses anything that is not `connected`, so card payments stop at once,
// while the record of WHICH merchant was connected — and when — survives for
// anyone reconciling old payments against it.
//
// ── THE AUTHORISATION IS HERE, BECAUSE IT CANNOT BE ANYWHERE ELSE ─────────
//
// `payment_connections` carries a SELECT policy and nothing else: every write
// goes through the service role. And the RPC is SECURITY DEFINER, granted only
// to `service_role`, and does NOT check its caller — it revokes whatever
// facility id it is handed.
//
// So this route is the boundary. The facility comes from the caller's own
// membership and is never read from the request, exactly as /connect does it;
// there is no id in the payload to get wrong.
// ============================================================================

export const dynamic = "force-dynamic";

/** Disconnecting stops a business taking card payments. Not a receptionist's. */
const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function POST() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const membership = viewer.memberships.find((m) => ADMIN_ROLES.has(m.role));
  if (!membership) {
    return NextResponse.json(
      {
        error:
          "Only an owner or administrator can disconnect a payment account.",
      },
      { status: 403 },
    );
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "This deployment cannot change payment connections." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("revoke_payment_connection", {
    p_facility_id: membership.facilityId,
    p_reason: `Disconnected from settings by ${viewer.email ?? "an administrator"}.`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The RPC returns false when it changed nothing — no connection, or one
  // already revoked. Reporting that as success would be a screen claiming an
  // action it did not perform.
  if (data !== true) {
    return NextResponse.json(
      { error: "There is no active Clover connection to disconnect." },
      { status: 409 },
    );
  }

  return NextResponse.json({ disconnected: true });
}
