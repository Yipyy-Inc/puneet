"use server";

import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

// ============================================================================
// Every credential operation this app performs, in one server module.
//
// WHY SERVER ACTIONS RATHER THAN CLIENT HOOKS. Clerk shipped browser hooks
// (`useSignIn`, `useSignUp`) that talked to its Frontend API directly. WorkOS
// has no equivalent for a custom UI: `authenticateWithPassword` needs the API
// key, which must never reach a browser. So the forms stay exactly as they are —
// our markup, our card, the facility's branding — and only the call underneath
// moves to the server.
//
// WHY NOT AuthKit's HOSTED UI, which would make most of this file unnecessary:
// the hosted page cannot render the per-facility branding that
// pawradise.yipyy.com shows today (spec 002 phase 3). ADR 0004 §4 chose the
// branding. This file is the cost of that choice.
//
// ERRORS ARE RETURNED, NEVER THROWN. Every action answers `{ error }` so the
// existing forms can render it in the red box they already have. A thrown error
// in a server action reaches the user as an opaque "an error occurred", which is
// what the Clerk forms were rewritten twice to avoid.
// ============================================================================

const clientId = process.env.WORKOS_CLIENT_ID!;

/** Ten minutes: long enough for a slow provider round trip, short enough to expire. */
const OAUTH_STATE_MAX_AGE = 600;
const OAUTH_STATE_COOKIE = "workos-oauth-state";

/**
 * The origin this request arrived on — NOT a configured constant.
 *
 * It has to be derived per request because every facility gets its own host
 * (pawradise.yipyy.com, spec 002 D2). Hard-coding the apex would send a customer
 * who signed in on their groomer's domain back to a Yipyy-branded page, and
 * would set the OAuth redirect_uri to a host they did not start on.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  // x-forwarded-proto is set by Vercel; local dev has neither and is plain http.
  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ||
    host.endsWith(".test") ||
    host.includes(".test:")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

/**
 * WorkOS errors carry the user-facing text in different places depending on the
 * failure. This picks the most specific one available and never leaks a stack.
 */
function readableError(error: unknown, fallback: string): string {
  const e = error as {
    errors?: { message?: string }[];
    rawData?: { message?: string };
    message?: string;
    code?: string;
  };
  return e.errors?.[0]?.message ?? e.rawData?.message ?? e.message ?? fallback;
}

// ── Password ────────────────────────────────────────────────────────────────

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error?: string; needsVerification?: boolean }> {
  try {
    const auth = await getWorkOS().userManagement.authenticateWithPassword({
      clientId,
      email: email.trim(),
      password,
    });
    await saveSession(auth, await requestOrigin());
  } catch (error) {
    // An unverified address is not a failure — it is the next step. WorkOS sends
    // the code itself and hands back a token that identifies the attempt.
    const e = error as {
      code?: string;
      rawData?: { pending_authentication_token?: string };
    };
    if (e.code === "email_verification_required") {
      const token = e.rawData?.pending_authentication_token;
      if (token) await stashPendingToken(token);
      return { needsVerification: true };
    }
    return {
      error: readableError(error, "That email and password did not match."),
    };
  }
  // Outside the try: redirect() signals by throwing, and catching it here would
  // turn a successful sign-in into an error message.
  redirect("/");
}

export async function signUpWithPassword(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
): Promise<{
  error?: string;
  needsVerification?: boolean;
  alreadyExists?: boolean;
}> {
  try {
    await getWorkOS().userManagement.createUser({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  } catch (error) {
    // ── ALREADY HAS AN ACCOUNT IS NOT A FAILURE ──────────────────────────
    //
    // One credential serves every facility (see the note on the sign-up
    // screen), so the SECOND facility a person deals with is a normal, expected
    // arrival at this form -- and the only signal they got was WorkOS's own
    // "user already exists", with nothing to explain that their existing
    // password already works here.
    //
    // That is the failure mode a facility-branded page creates: the page looks
    // like a business they have never used, so "email already in use" reads as
    // a mistake rather than as good news.
    //
    // Asked of WorkOS rather than pattern-matched on the message text, which is
    // the vendor's wording and can change without notice.
    //
    // ── ON ENUMERATION, SAID PLAINLY ─────────────────────────────────────
    //
    // This does tell an anonymous caller whether an address has an account. It
    // is NOT a new leak: createUser already refused a duplicate and its message
    // was shown verbatim on this screen, so the same fact was already
    // obtainable -- only uselessly, to the person it was actually about. Every
    // sign-up form has this property; you cannot both create an account and
    // hide whether one exists.
    //
    // sendPasswordReset is the one that must NOT do this and does not: it
    // answers identically either way, because there the caller supplies only an
    // address and gains nothing legitimate from the difference.
    const existing = await getWorkOS()
      .userManagement.listUsers({ email: email.trim() })
      .then((page) => page.data[0])
      .catch(() => undefined);

    if (existing) return { alreadyExists: true };

    return { error: readableError(error, "Could not create that account.") };
  }
  // Sign in immediately, which is what triggers the verification email and
  // returns the pending token. One code path for "new account" and "unverified
  // returning account" rather than two that can disagree.
  return signInWithPassword(email, password);
}

export async function verifyEmailCode(
  code: string,
): Promise<{ error?: string }> {
  const pendingAuthenticationToken = (await cookies()).get(
    PENDING_TOKEN_COOKIE,
  )?.value;

  if (!pendingAuthenticationToken) {
    return {
      error: "That verification attempt expired. Please sign in again.",
    };
  }

  try {
    const auth =
      await getWorkOS().userManagement.authenticateWithEmailVerification({
        clientId,
        code: code.trim(),
        pendingAuthenticationToken,
      });
    await saveSession(auth, await requestOrigin());
    (await cookies()).delete(PENDING_TOKEN_COOKIE);
  } catch (error) {
    return { error: readableError(error, "That code was not accepted.") };
  }
  // NOT "/" — every new account passes through here, because both environments
  // require a verified address, so this is the one moment a person has just
  // proved who they are and is holding the device. /passkey-setup makes the
  // offer and sends them on; it skips itself for anyone who already has a
  // passkey or whose browser cannot make one, so the returning-but-unverified
  // user does not meet it twice.
  redirect("/passkey-setup");
}

const PENDING_TOKEN_COOKIE = "workos-pending-auth";

async function stashPendingToken(token: string) {
  (await cookies()).set(PENDING_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_MAX_AGE,
    path: "/",
  });
}

// ── Password reset ──────────────────────────────────────────────────────────

export async function sendPasswordReset(
  email: string,
): Promise<{ error?: string }> {
  try {
    await getWorkOS().userManagement.createPasswordReset({
      email: email.trim(),
    });
  } catch {
    // Deliberately not surfaced. Telling an anonymous caller whether an address
    // exists turns this form into an account-enumeration oracle, and the user
    // sees the same "check your email" either way.
  }
  return {};
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ error?: string }> {
  try {
    await getWorkOS().userManagement.resetPassword({
      token,
      newPassword,
    });
  } catch (error) {
    return { error: readableError(error, "Could not set that password.") };
  }
  redirect("/sign-in?reset=1");
}

// ── Social ──────────────────────────────────────────────────────────────────

export type SupportedOAuthProvider = "GoogleOAuth" | "AppleOAuth";

/**
 * Hand off to Google or Apple directly, rather than to WorkOS's hosted page.
 *
 * `getSignInUrl()` from the AuthKit SDK cannot do this — its options carry no
 * `provider`, so it can only reach the hosted screen. Going straight to the
 * provider is what Clerk's buttons did and what keeps the facility's own login
 * page in front of the user until the moment they leave for Google.
 *
 * THE `state` COOKIE IS THE CSRF DEFENCE, and it is ours to get right because we
 * bypassed the SDK's sealed state. Without it, an attacker can feed a victim's
 * browser a callback carrying the attacker's `code` and log the victim into the
 * attacker's account. httpOnly so script cannot read it, sameSite=lax so it
 * survives the provider's top-level redirect back, and short-lived.
 */
export async function startOAuth(
  provider: SupportedOAuthProvider,
): Promise<{ error?: string }> {
  let url: string;
  try {
    const state = crypto.randomUUID();
    (await cookies()).set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: OAUTH_STATE_MAX_AGE,
      path: "/",
    });

    url = getWorkOS().userManagement.getAuthorizationUrl({
      clientId,
      provider,
      redirectUri: `${await requestOrigin()}/auth/callback`,
      state,
    });
  } catch (error) {
    return {
      error: readableError(error, "Could not start that sign-in. Try again."),
    };
  }
  redirect(url);
}

// ── Sign out ────────────────────────────────────────────────────────────────

/**
 * A POST server action, never a GET route.
 *
 * Sign-out mutates state, so a `GET /signout` is unsafe twice over: Next's
 * <Link> prefetch can fire it on hover, and `<img src="/signout">` makes it
 * CSRF-triggerable. WorkOS's own `workos doctor` flags that shape as
 * SIGNOUT_GET_HANDLER.
 *
 * `signOut()` ends the WorkOS session and redirects to the environment's Logout
 * URI. The legacy localStorage identity is cleared on the client before this is
 * called — the server cannot reach it. See use-sign-out.ts.
 */
export async function signOutAction(): Promise<void> {
  await signOutFromWorkos();
}

async function signOutFromWorkos() {
  const { signOut } = await import("@workos-inc/authkit-nextjs");
  await signOut({ returnTo: `${await requestOrigin()}/sign-in` });
}
