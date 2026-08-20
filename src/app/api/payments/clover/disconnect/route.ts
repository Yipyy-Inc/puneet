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
// ── THE ROW IS REVOKED; THE CREDENTIALS ARE DESTROYED ─────────────────────
//
// This used to call `revoke_payment_connection`, which flips a status and stops
// there. That left Yipyy holding a WORKING access token — and a refresh token
// that mints more, indefinitely, because it rotates — for a merchant account
// whose owner had just asked us to let go of it. `validAccessToken()` does not
// look at the status, so the keys stayed usable.
//
// Clover cannot be told. Checked against their docs on 2026-08-20: there is no
// endpoint that revokes a token or uninstalls an app on a merchant's behalf —
// only the merchant can, from their own dashboard. So the half that is ours to
// give up is our copy, and `disconnect_payment_connection` destroys it: the
// credential row and both Vault secrets, in the same transaction as the revoke.
//
// The row itself stays and becomes `revoked`, because the record of WHICH
// merchant was connected and when is what anyone reconciling old payments needs.
//
// COST, stated because it is real: refunding a card payment through Yipyy stops
// working for that facility. No money is trapped — they still own the merchant
// account and can refund from Clover's own dashboard — and the alternative is a
// button that says disconnected while the keys are still in the vault.
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
  const { data, error } = await admin.rpc("disconnect_payment_connection", {
    p_facility_id: active.facility.id,
    p_reason: `Disconnected from settings by ${viewer?.email ?? "an administrator"}.`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // `returns table` arrives as an array of one row.
  const outcome = Array.isArray(data) ? data[0] : null;
  const revoked = outcome?.connection_revoked === true;
  const credentialsRemoved = outcome?.credentials_removed === true;

  // Neither half changed: no connection, or one already revoked whose keys were
  // already gone. Reporting that as success would be a screen claiming an
  // action it did not perform.
  //
  // Note the OR. An already-revoked connection that still had credentials in
  // the vault is exactly the state this change exists to clear, so destroying
  // them counts as having done something even though the status did not move.
  if (!revoked && !credentialsRemoved) {
    return NextResponse.json(
      { error: "There is no active Clover connection to disconnect." },
      { status: 409 },
    );
  }

  return NextResponse.json({ disconnected: true, credentialsRemoved });
}
