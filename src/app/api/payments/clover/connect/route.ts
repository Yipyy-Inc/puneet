import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
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

  // `accessLevel`, not the job title. A hardcoded owner/admin role set was
  // retired everywhere else in this codebase (see `viewer.ts`): a facility can
  // promote its receptionist to admin ACCESS without handing them an owner's
  // 168 permissions, and such a person reaches this screen — the /facility
  // portal gate is `accessLevel === "admin"` — so they must not meet a 403
  // from the button that screen shows them.
  const active = await activeAdminFacility();

  if (active.kind === "none") {
    return NextResponse.json(
      {
        error:
          "Only an owner or administrator of a facility may connect a payment account.",
      },
      { status: 403 },
    );
  }

  // Someone who administers two facilities, on a hostname that names neither.
  // There is no defensible answer here — sealing a guess into the state is how
  // a merchant account ends up attached to the wrong business — so this refuses
  // and names the addresses that would be unambiguous. The card does not
  // normally let a caller reach this: it renders the same choice as links.
  if (active.kind === "ambiguous") {
    return NextResponse.json(
      {
        error:
          "You administer more than one facility. Open the one you want to " +
          "connect at its own address first: " +
          active.choices.map((f) => f.name).join(", ") +
          ".",
        choices: active.choices,
      },
      { status: 409 },
    );
  }

  const state = createOAuthState(active.facility.id);
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
