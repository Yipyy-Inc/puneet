import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { getFacilityContext } from "@/lib/api/facility-context";
import { cloverConfig } from "@/lib/clover/config";
import { chargeableConnection } from "@/lib/clover/connection";

// ============================================================================
// What a browser needs to mount Clover's card fields.
//
// ── WHY A ROUTE AND NOT A SERVER COMPONENT ────────────────────────────────
//
// `/pay/[ref]` is a server component: it reads the connection and hands
// `publicApiKey` and `sdkUrl` straight down as props. The retail checkout
// cannot do that — it is a 5,900-line client component, and converting it to
// fetch this server-side is a refactor of the till, not of card entry. So the
// same three values come over the wire instead.
//
// ── THE KEY IN HERE IS PUBLIC, AND THAT IS NOT AN EXCUSE ──────────────────
//
// `public_api_key` is Clover's browser-side access key. It is designed to be
// seen by the page — it tokenises a card, it cannot charge one, and the charge
// itself still needs the merchant's OAuth token which never leaves the server.
//
// It is still scoped to the session's facility and gated on
// `financial_take_payment`, for a reason that has nothing to do with the key's
// secrecy: an unauthenticated route here would tell anyone which businesses
// have a live merchant account and which do not. Whether a facility can take
// money is the facility's business.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // facility-from-request-ok: a GET with no body, scoped to the session.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  if (!holds(await myPermissions(), "financial_take_payment")) {
    return NextResponse.json(
      { error: "You are not allowed to take payments at this facility." },
      { status: 403 },
    );
  }

  const connection = await chargeableConnection(context.facilityId);
  if (!connection) {
    return NextResponse.json(
      { error: "This facility has no connected payment account." },
      { status: 503 },
    );
  }

  // The CONNECTION's estate, not the deployment's — a sandbox merchant handed a
  // production SDK URL tokenises against an account that does not exist there.
  const config = cloverConfig(connection.environment);
  if (!config) {
    return NextResponse.json(
      { error: `Clover is not configured for ${connection.environment}.` },
      { status: 503 },
    );
  }

  if (!connection.publicApiKey) {
    // A refusal rather than a default: without the key the fields cannot be
    // rendered at all, and a half-mounted form that silently never tokenises is
    // worse than a screen that says the account needs reconnecting.
    return NextResponse.json(
      {
        error:
          "This facility's payment account is not ready. Reconnect it to take typed cards.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    publicApiKey: connection.publicApiKey,
    merchantId: connection.merchantId,
    sdkUrl: config.checkoutSdkUrl,
    currency: connection.currency ?? "CAD",
  });
}
