import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import type { NextRequest } from "next/server";

import {
  refuse,
  relyingParty,
  requireVerifiedUser,
  takeChallenge,
  toBase64Url,
} from "@/lib/auth/passkeys";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Step 2 of enrolment: check the signature, then store the public key.
//
// ── WHY THE SERVICE ROLE WRITES THIS ──────────────────────────────────────
//
// `user_passkeys` has NO insert policy, deliberately. A session that could
// insert its own row could register an authenticator it controls against
// somebody else's account, and no `with check` expression can tell a genuine
// attestation from a fabricated one — that judgement lives in
// `verifyRegistrationResponse`, above, and cannot be expressed in SQL. So the
// row is written with the key that bypasses RLS, and the verification directly
// above it is the entire authorisation.
//
// ── THE emailVerified GATE IS NOT REDUNDANT HERE ──────────────────────────
//
// It reads as redundant: the caller already has a session, so what is there to
// check? This — sign-in mints its session through Magic Auth, which marks the
// address verified as a side effect of a code we never emailed. A credential
// enrolled by an unverified account would become a machine for laundering that.
// `requireVerifiedUser()` carries the full account; `bun run
// check:passkey-email-verified` fails the build if this call disappears.
// ============================================================================

export async function POST(request: NextRequest) {
  const gate = await requireVerifiedUser();
  if ("refusal" in gate) return gate.refusal;
  const { user } = gate;

  if (!hasServiceRoleKey()) {
    // 500 and not a cheerful 200: the credential would be unusable and the user
    // would be told they had enrolled one.
    console.error(
      "[passkey] SUPABASE_SERVICE_ROLE_KEY is not configured; a passkey " +
        "cannot be stored because user_passkeys has no insert policy.",
    );
    return refuse(500, "Passkeys are not available right now.");
  }

  // Burned on read, so a captured response cannot be replayed against it.
  const expectedChallenge = await takeChallenge("register");
  if (!expectedChallenge) {
    return refuse(400, "That took too long. Try adding the passkey again.");
  }

  let response: RegistrationResponseJSON;
  try {
    response = (await request.json()) as RegistrationResponseJSON;
  } catch {
    return refuse(400, "That passkey could not be read.");
  }

  const { rpID, origin } = await relyingParty();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      // The authenticator must have checked a fingerprint, face or PIN. Asked
      // for in the options and enforced here, because options are a request and
      // this is the check.
      requireUserVerification: true,
    });
  } catch {
    return refuse(400, "That passkey could not be verified.");
  }

  if (!verification.verified || !verification.registrationInfo) {
    return refuse(400, "That passkey could not be verified.");
  }

  const { credential, credentialBackedUp } = verification.registrationInfo;

  const { error } = await createAdminClient()
    .from("user_passkeys")
    .insert({
      credential_id: credential.id,
      profile_id: user.id,
      public_key: toBase64Url(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      backed_up: credentialBackedUp,
    });

  if (error) {
    // 23505 — this credential is already enrolled. Not a failure worth alarming
    // anyone about: the end state they asked for is the end state they have.
    if (error.code === "23505") return Response.json({ ok: true });
    console.error("[passkey] could not store credential:", error);
    return refuse(500, "That passkey could not be saved.");
  }

  return Response.json({ ok: true });
}
