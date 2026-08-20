import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
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

export async function POST() {
  // Admin ACCESS, not an admin job title — see /connect. And the facility comes
  // from the hostname when the caller administers more than one, because
  // revoking the wrong business's connection stops it taking money.
  const active = await activeAdminFacility();

  if (active.kind === "none") {
    return NextResponse.json(
      {
        error:
          "Only an owner or administrator can disconnect a payment account.",
      },
      { status: 403 },
    );
  }

  if (active.kind === "ambiguous") {
    return NextResponse.json(
      {
        error:
          "You administer more than one facility. Open the one you want to " +
          "disconnect at its own address first.",
        choices: active.choices,
      },
      { status: 409 },
    );
  }

  const viewer = await getViewer().catch(() => null);

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "This deployment cannot change payment connections." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("revoke_payment_connection", {
    p_facility_id: active.facility.id,
    p_reason: `Disconnected from settings by ${viewer?.email ?? "an administrator"}.`,
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
