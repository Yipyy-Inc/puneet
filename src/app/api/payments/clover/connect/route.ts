import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { cloverConfig } from "@/lib/clover/config";
import { authorizeUrl, createOAuthState } from "@/lib/clover/oauth";

// ============================================================================
// Sending a facility owner to Clover to approve the connection.
//
// ── NO FACILITY IN THE REQUEST ────────────────────────────────────────────
//
// The facility comes from the caller's membership, exactly as check:facility-
// from-session requires, and is then sealed into the signed state so the return
// leg cannot be told a different one. Between those two, there is no point in
// the flow where a caller names the facility being connected.
//
// That is the whole security property of this route. Without it, an attacker
// completes OAuth against their own Clover merchant and hands back somebody
// else's facility id — after which that business's card payments settle into
// the attacker's bank account and every screen still looks right.
//
// ── OWNERS AND ADMINS ONLY ────────────────────────────────────────────────
//
// Connecting a merchant account decides where a business's money lands. That is
// not a permission a receptionist should hold, and the role comes from
// facility_memberships rather than the `facility_role` cookie, which is
// client-writable.
// ============================================================================

export const dynamic = "force-dynamic";

const OWNER_ROLES = new Set(["owner", "admin"]);

// No `request` parameter, and that is the documentation: nothing about where
// this connection points may depend on what the caller sent.
export async function GET() {
  const config = cloverConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Clover is not configured on this deployment. CLOVER_APP_ID and " +
          "CLOVER_APP_SECRET are unset — see .env.example.",
      },
      { status: 503 },
    );
  }

  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const membership = viewer.memberships.find((m) => OWNER_ROLES.has(m.role));
  if (!membership) {
    return NextResponse.json(
      {
        error:
          "Only an owner or administrator of a facility may connect a payment account.",
      },
      { status: 403 },
    );
  }

  const state = createOAuthState(membership.facilityId);
  const destination = state ? authorizeUrl(state) : null;
  if (!destination) {
    return NextResponse.json(
      { error: "Could not start the Clover connection." },
      { status: 500 },
    );
  }

  // 303 rather than 302: this is a GET that hands off to another site, and a
  // browser must not attempt to repeat anything.
  return NextResponse.redirect(destination, {
    status: 303,
    // The consent screen is a decision point; a cached redirect would send a
    // second facility to a state minted for the first.
    headers: { "Cache-Control": "no-store, private" },
  });
}

/** Unused verbs answer plainly rather than 405-ing from the framework. */
export async function POST() {
  return NextResponse.json(
    { error: "Start the connection with GET." },
    { status: 405 },
  );
}
