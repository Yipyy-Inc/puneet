import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";

import {
  fromBase64Url,
  refuse,
  relyingParty,
  takeChallenge,
} from "@/lib/auth/passkeys";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Step 2 of sign-in: verify the passkey, then mint a real WorkOS session.
//
// THIS FILE IS THE ONLY PLACE THAT MAY CALL `createMagicAuth`, and
// `bun run check:passkey-email-verified` enforces that. Everything below
// explains why that confinement matters.
//
// ── THE BRIDGE, AND WHY IT EXISTS ─────────────────────────────────────────
//
// WorkOS will not verify a passkey for us outside its hosted UI, and the hosted
// UI cannot carry the facility's branding (ADR 0004 §4). So we verify WebAuthn
// ourselves — and then have to produce a WorkOS session, because Supabase RLS
// reads the WorkOS token and nothing else. WorkOS has no "mint a session for
// this user" call. It has this:
//
//     createMagicAuth({ email })  ->  { code }     // RETURNED, not emailed
//     authenticateWithMagicAuth({ code, email })   // a genuine session
//
// Proven on staging 2026-08-22: the resulting token carries
// `"role": "authenticated"` from the registered issuer, so nothing downstream
// can tell this apart from a password sign-in. That is the point.
//
// ── WHY THIS IS NOT A PRIVILEGE ESCALATION, AND WHAT IT IS ────────────────
//
// The server already holds `WORKOS_API_KEY`. That key can create users and
// reset passwords; anything holding it can already become anybody. The bridge
// adds no capability that was not already there.
//
// What it DOES do is concentrate the risk. Before this, a session required a
// password, an OAuth code, or a code the user read out of their inbox. Now a
// bug in the verification above mints one directly. Hence: the signature check
// is @simplewebauthn's and not hand-rolled, the challenge is server-issued and
// single-use, and the clone counter is honoured.
//
// ── AND WHY emailVerified IS CHECKED HERE, AFTER A VALID PASSKEY ──────────
//
// Because `authenticateWithMagicAuth` marks the address VERIFIED as a side
// effect. For real Magic Auth that is sound — the code arrived by email, so
// holding it proves control of the mailbox. We never send the mail, so holding
// it proves nothing, and both environments require verified addresses. A
// credential enrolled before that rule existed must not become the way round
// it, so the check is repeated here and not trusted to enrolment.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    console.error(
      "[passkey] SUPABASE_SERVICE_ROLE_KEY is not configured; a passkey " +
        "cannot be looked up because the caller has no session yet.",
    );
    return refuse(500, "Passkeys are not available right now.");
  }

  const expectedChallenge = await takeChallenge("authenticate");
  if (!expectedChallenge) {
    return refuse(400, "That took too long. Try signing in again.");
  }

  let response: AuthenticationResponseJSON;
  try {
    response = (await request.json()) as AuthenticationResponseJSON;
  } catch {
    return refuse(400, "That passkey could not be read.");
  }

  // THE SERVICE ROLE, because there is no session — that is the thing being
  // established. An RLS-bound client here would be `anon` and read nothing.
  const admin = createAdminClient();

  const { data: stored } = await admin
    .from("user_passkeys")
    .select("credential_id, profile_id, public_key, counter, transports")
    .eq("credential_id", response.id)
    .maybeSingle();

  // One message for "no such credential" and for every later failure. A
  // distinct "unknown passkey" would tell an anonymous caller which credential
  // IDs are real.
  const rejected = () => refuse(400, "That passkey was not accepted.");

  if (!stored) return rejected();

  const { rpID, origin } = await relyingParty();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: fromBase64Url(stored.public_key),
        counter: Number(stored.counter),
        transports: stored.transports as AuthenticatorTransport[] | undefined,
      },
      // Throws when the authenticator reports a counter at or below the stored
      // one, which means the credential has been cloned.
      requireUserVerification: true,
    });
  } catch {
    return rejected();
  }

  if (!verification.verified) return rejected();

  // ── The passkey is genuine. Now: may this person have a session at all? ──

  const user = await getWorkOS()
    .userManagement.getUser(stored.profile_id)
    .catch(() => null);

  if (!user) return rejected();

  if (!user.emailVerified) {
    return refuse(
      403,
      "Confirm your email address before signing in with a passkey.",
    );
  }

  // ── The bridge. See the header before changing anything here. ────────────

  let auth;
  try {
    const magic = await getWorkOS().userManagement.createMagicAuth({
      email: user.email,
    });
    auth = await getWorkOS().userManagement.authenticateWithMagicAuth({
      clientId: process.env.WORKOS_CLIENT_ID!,
      code: magic.code,
      email: user.email,
    });
  } catch (error) {
    console.error("[passkey] could not mint a session:", error);
    return refuse(500, "Could not complete that sign-in. Try again.");
  }

  // `request` rather than a string, so the cookie inherits this host — which
  // matters on facility subdomains, where WORKOS_COOKIE_DOMAIN widens it.
  await saveSession(auth, request);

  // After the session, never before: a failure to record the counter must not
  // cost the user their sign-in. The clone check is a tripwire, and a tripwire
  // that locks people out on a database hiccup is worse than the risk it
  // covers.
  // rls-write-ok: the service-role client bypasses RLS, so there is no policy
  // here to refuse silently — and a zero-row result would not change the
  // answer anyway, since the session is already saved and this is bookkeeping.
  const { error: bumpError } = await admin
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", stored.credential_id);

  if (bumpError) {
    console.error("[passkey] could not record use of credential:", bumpError);
  }

  return Response.json({ ok: true });
}
