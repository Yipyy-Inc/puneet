import { generateRegistrationOptions } from "@simplewebauthn/server";

import {
  refuse,
  relyingParty,
  requireVerifiedUser,
  stashChallenge,
} from "@/lib/auth/passkeys";
import { createWorkosServerClient } from "@/lib/supabase/workos-server";

// ============================================================================
// Step 1 of enrolment: ask the browser to make a credential.
//
// Nothing is written here. This hands the browser a challenge and the rules the
// new credential must satisfy; `register/verify` is where a row appears, and
// only after the signature checks out.
//
// THE READ GOES THROUGH RLS ON PURPOSE. `user_passkeys` has a select policy
// scoped to `auth.jwt()->>'sub'`, so the session client can only ever see the
// caller's own credentials — which is exactly the list we want and means the
// exclusion below cannot be widened by a bug here.
// ============================================================================

export async function POST() {
  const gate = await requireVerifiedUser();
  if ("refusal" in gate) return gate.refusal;
  const { user } = gate;

  const { rpID } = await relyingParty();
  const supabase = createWorkosServerClient();

  const { data: existing, error } = await supabase
    .from("user_passkeys")
    .select("credential_id, transports");

  if (error) {
    return refuse(500, "Could not read your existing passkeys.");
  }

  const options = await generateRegistrationOptions({
    rpName: "Yipyy",
    rpID,
    userName: user.email,
    // The WorkOS subject, not an email. An address can change; the credential
    // must keep pointing at the same person when it does.
    userID: new TextEncoder().encode(user.id),
    // We store the public key and nothing else — an attestation statement would
    // tell us the authenticator's make and model, which we have no use for and
    // which users are entitled not to hand over.
    attestationType: "none",
    // Offering to enrol a device that is already enrolled produces a confusing
    // "you already have one of these" from the browser rather than a duplicate.
    excludeCredentials: (existing ?? []).map((row) => ({
      id: row.credential_id,
      transports: row.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: {
      // The credential must be discoverable, or sign-in would have to ask for
      // an email first — which is the password flow with extra steps, not the
      // "tap and you are in" the whole feature exists for.
      residentKey: "required",
      // A fingerprint, face or PIN. This is what makes a passkey count as two
      // factors rather than one, and what the user was promised.
      userVerification: "required",
    },
  });

  await stashChallenge("register", options.challenge);

  return Response.json(options);
}
