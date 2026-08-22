import "server-only";

import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { cookies, headers } from "next/headers";

import { getViewer } from "@/lib/auth/viewer";

// ============================================================================
// The parts every passkey route needs, in one place.
//
// WorkOS has passkeys and we cannot use them — "Passkey authentication is
// currently only available with the hosted UI in AuthKit", and the hosted page
// cannot render the per-facility branding that pawradise.yipyy.com shows
// (ADR 0004 §4). So WebAuthn runs here, on our own domain, against credentials
// in `user_passkeys`.
//
// THREE THINGS LIVE HERE BECAUSE GETTING THEM WRONG IS SILENT.
//
//   1. The Relying Party ID decides which domains a credential works on, and it
//      is baked into the credential at enrolment. Change it later and every
//      passkey ever created stops existing.
//   2. The challenge must be issued by us, stored out of reach of script, and
//      usable once. A replayable challenge is a replayable sign-in.
//   3. `emailVerified`, which is not a nicety here but the thing standing
//      between a passkey and a bypass of the environment's verification policy.
//      See requireVerifiedUser below, and the debt map entry of 2026-08-22.
// ============================================================================

/**
 * The apex the RP ID collapses to.
 *
 * WebAuthn lets the RP ID be any registrable suffix of the page's origin, so a
 * credential created on `pawradise.yipyy.com` with `rpID = "yipyy.com"` also
 * works on `www.yipyy.com` and on every other facility subdomain. One passkey,
 * every facility — which is the whole point, because one login already serves
 * every facility (see the note on the sign-up screen).
 *
 * WHAT THIS DOES NOT COVER: a white-label domain. If a facility is ever given
 * `booking.pawradise.com`, passkeys created on yipyy.com will not work there
 * and cannot be made to — the credential is bound to the domain by design, and
 * that is the anti-phishing property, not a limitation to engineer around.
 */
const APEX = "yipyy.com";

export type RelyingParty = { rpID: string; origin: string };

function isLocal(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".test") ||
    host.includes(".test:")
  );
}

/**
 * The RP ID and origin for THIS request.
 *
 * Derived per request rather than configured, for the same reason
 * `requestOrigin()` in workos-actions.ts is: every facility gets its own host,
 * and a hard-coded apex would compute an origin the browser never saw. WebAuthn
 * compares the origin byte for byte and refuses on any mismatch.
 */
export async function relyingParty(): Promise<RelyingParty> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const local = isLocal(host);
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  const hostname = host.split(":")[0] ?? host;

  // On localhost the RP ID is the bare hostname — WebAuthn special-cases it as
  // the one insecure origin it will accept. Everywhere else, collapse to the
  // apex so the credential spans facility subdomains. A preview deployment on
  // some other domain gets its own hostname and its own credentials, which is
  // correct: a passkey enrolled on a preview should not work in production.
  const rpID = local
    ? hostname
    : hostname === APEX || hostname.endsWith(`.${APEX}`)
      ? APEX
      : hostname;

  return { rpID, origin: `${proto}://${host}` };
}

// ── The challenge ───────────────────────────────────────────────────────────

/**
 * Separate cookies for the two flows.
 *
 * Enrolment and sign-in can legitimately be in flight at once (a second tab),
 * and sharing one cookie would let the later flow consume the earlier one's
 * challenge — which fails confusingly rather than dangerously, but fails.
 */
const CHALLENGE_COOKIE = {
  register: "passkey-register-challenge",
  authenticate: "passkey-auth-challenge",
} as const;

export type PasskeyFlow = keyof typeof CHALLENGE_COOKIE;

/** Long enough for a slow biometric prompt, short enough to expire. */
const CHALLENGE_MAX_AGE = 300;

/**
 * Stash the challenge where script cannot read it.
 *
 * Same shape as the OAuth `state` cookie in workos-actions.ts, deliberately —
 * httpOnly so an XSS cannot lift it, sameSite=lax, short-lived, and read once.
 * There is no challenge table because there is no need for one: the value only
 * has to survive the round trip to the same browser.
 */
export async function stashChallenge(flow: PasskeyFlow, challenge: string) {
  (await cookies()).set(CHALLENGE_COOKIE[flow], challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CHALLENGE_MAX_AGE,
    path: "/",
  });
}

/**
 * Read the challenge and burn it.
 *
 * SINGLE USE IS NOT OPTIONAL. A challenge that survives its verification can be
 * replayed with a captured assertion. Deleted here, on the way out, so every
 * caller gets that behaviour without having to remember it.
 */
export async function takeChallenge(
  flow: PasskeyFlow,
): Promise<string | undefined> {
  const jar = await cookies();
  const value = jar.get(CHALLENGE_COOKIE[flow])?.value;
  jar.delete(CHALLENGE_COOKIE[flow]);
  return value;
}

// ── Who may hold a passkey ──────────────────────────────────────────────────

export type VerifiedUser = { id: string; email: string };

/**
 * The signed-in user, but only if WorkOS says their address is verified.
 *
 * ── WHY THIS EXISTS, AND WHY IT LOOKS REDUNDANT ───────────────────────────
 *
 * Sign-in mints its session through Magic Auth, and that path marks the address
 * verified as a side effect. For real Magic Auth that is right — holding a code
 * that arrived by email proves control of the mailbox. We read the code out of
 * the API response and never send the mail, so holding it proves nothing, and a
 * passkey on an unverified account would convert it to verified. Both
 * environments set `isEmailVerificationRequired: true`; this is what stops a
 * passkey walking through that.
 *
 * It reads as redundant from the enrolment route ("they already have a
 * session") and from the sign-in route ("they already presented a passkey").
 * Both readings are wrong. `bun run check:passkey-email-verified` fails the
 * build if either call site loses it.
 *
 * ── ASKED OF WORKOS, NOT OF THE SESSION ───────────────────────────────────
 *
 * `getViewer()` knows the subject and the address; it does not know whether the
 * address is verified, and a stale token would not know either. So the flag is
 * fetched live. One extra call on a path that already makes several.
 */
export async function requireVerifiedUser(): Promise<
  { user: VerifiedUser } | { refusal: Response }
> {
  const viewer = await getViewer();
  if (viewer.source !== "session" || !viewer.userId) {
    return { refusal: refuse(401, "Sign in first.") };
  }

  const user = await getWorkOS()
    .userManagement.getUser(viewer.userId)
    .catch(() => null);

  if (!user) {
    return { refusal: refuse(401, "That session is no longer valid.") };
  }

  if (!user.emailVerified) {
    return {
      refusal: refuse(
        403,
        "Confirm your email address before adding a passkey.",
      ),
    };
  }

  return { user: { id: user.id, email: user.email } };
}

/** A refusal the forms can render, in the shape they already handle. */
export function refuse(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

// ── Encoding ────────────────────────────────────────────────────────────────
//
// `credential_id` and `public_key` are base64url TEXT in Postgres, not `bytea`
// — see the migration for why. @simplewebauthn hands the key over as bytes, so
// the conversion happens here and nowhere else.

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Copied into a fresh array rather than wrapping the Buffer.
 *
 * `Buffer.from()` yields `Uint8Array<ArrayBufferLike>`, and ArrayBufferLike
 * admits SharedArrayBuffer, which @simplewebauthn's `Uint8Array<ArrayBuffer>`
 * does not. Wrapping it in `new Uint8Array(buffer)` keeps the same backing
 * store and therefore the same type; allocating and copying is what actually
 * produces an ArrayBuffer-backed view. The keys are a few dozen bytes.
 */
export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, "base64url");
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes;
}
