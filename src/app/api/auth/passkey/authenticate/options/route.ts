import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { relyingParty, stashChallenge } from "@/lib/auth/passkeys";

// ============================================================================
// Step 1 of sign-in: hand the browser a challenge.
//
// NO EMAIL, NO SESSION, NO LOOKUP. `allowCredentials` is deliberately omitted,
// which makes this a discoverable-credential request: the browser offers
// whichever passkeys it holds for this domain and the user picks one. That is
// what lets the sign-in page do this with nothing typed at all — and it is also
// what stops this endpoint being an account-enumeration oracle, because it
// answers identically whether or not anybody has a passkey.
//
// It is safe to call unauthenticated, and it must be: the caller is by
// definition signed out. All it emits is a random challenge, which is worthless
// without a private key that never leaves the user's device.
// ============================================================================

export async function POST() {
  const { rpID } = await relyingParty();

  const options = await generateAuthenticationOptions({
    rpID,
    // A fingerprint, face or PIN — the same bar enrolment set. Anything less
    // would let a stolen unlocked laptop sign in silently.
    userVerification: "required",
  });

  await stashChallenge("authenticate", options.challenge);

  return Response.json(options);
}
