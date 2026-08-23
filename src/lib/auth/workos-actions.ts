"use server";

import { getWorkOS, saveSession, withAuth } from "@workos-inc/authkit-nextjs";
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

// ── Password change, and the sessions it should end ─────────────────────────

/**
 * Change the signed-in user's password.
 *
 * REPLACES A LIE. Both screens that offered this were mocks: the staff card
 * called `toast.success("Password changed")` and nothing else, and the customer
 * card awaited an 800 ms `setTimeout` first so it would feel real. A user who
 * believed either one might discard a password that still works — and
 * `check:success-claims` does not catch this shape, because a simulated action
 * looks exactly like a real one to a static check.
 *
 * WHY THE CURRENT PASSWORD IS RE-AUTHENTICATED RATHER THAN TRUSTED. WorkOS has
 * no "verify this password" endpoint, and `updateUser` will happily set a new
 * one without proving the caller knew the old one. A session alone is not
 * enough: a borrowed laptop, a stolen cookie or an unlocked screen would be a
 * password takeover. So the old password is checked the only way available —
 * by authenticating with it.
 *
 * That check has a SIDE EFFECT worth knowing about: it mints a session, which
 * appears in the list below. It is discarded rather than saved, and the
 * alternative is not checking at all.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const { user } = await withAuth();
  if (!user) return { error: "You are not signed in." };

  try {
    await getWorkOS().userManagement.authenticateWithPassword({
      clientId,
      email: user.email,
      password: currentPassword,
    });
  } catch {
    // Deliberately not `readableError`. WorkOS's message here describes the
    // sign-in it thinks it refused, which reads oddly on a change-password
    // form, and the only thing the user needs to know is which field is wrong.
    return { error: "That is not your current password." };
  }

  try {
    await getWorkOS().userManagement.updateUser({
      userId: user.id,
      password: newPassword,
    });
  } catch (error) {
    // This one IS surfaced verbatim: WorkOS enforces the password policy here
    // (minimum length, and `isPasswordPwnedRequired` is on), so "this password
    // appeared in a data breach" is the vendor's wording and far more useful
    // than anything generic we could substitute.
    return { error: readableError(error, "Could not change that password.") };
  }

  return {};
}

// ── Sessions ────────────────────────────────────────────────────────────────

export type ActiveSession = {
  id: string;
  /** True for the session making this request — it must not offer to end itself. */
  current: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  authMethod: string | null;
  expiresAt: string;
};

/**
 * The caller's own sessions. Never anybody else's — the user id comes from the
 * session, not from an argument, so there is no id to tamper with.
 */
export async function listMySessions(): Promise<ActiveSession[]> {
  const { user, sessionId } = await withAuth();
  if (!user) return [];

  try {
    const page = await getWorkOS().userManagement.listSessions(user.id);
    return page.data
      .filter((session) => session.status === "active")
      .map((session) => ({
        id: session.id,
        current: session.id === sessionId,
        ipAddress: session.ipAddress ?? null,
        userAgent: session.userAgent ?? null,
        authMethod: session.authMethod ?? null,
        expiresAt: session.expiresAt,
      }));
  } catch {
    // An empty list is honest here: the screen renders "no other devices"
    // rather than inventing rows, and revocation below re-checks ownership
    // anyway, so a stale list cannot be used to reach somebody else's session.
    return [];
  }
}

/**
 * End one session.
 *
 * OWNERSHIP IS CHECKED AGAINST WORKOS, NOT ASSUMED FROM THE ARGUMENT. A session
 * id is the only input, and `revokeSession` does not care whose it is — so
 * without this lookup any signed-in user could sign out any other user by
 * guessing or replaying an id. The list above is not the guard; this is.
 */
export async function revokeMySession(
  sessionId: string,
): Promise<{ error?: string }> {
  const { user, sessionId: current } = await withAuth();
  if (!user) return { error: "You are not signed in." };

  // Ending your own session from a list of "other devices" would sign you out
  // mid-click and look like a crash. Sign out is the button for that.
  if (sessionId === current) {
    return { error: "That is this device. Use sign out instead." };
  }

  const mine = await getWorkOS()
    .userManagement.listSessions(user.id)
    .then((page) => page.data.some((s) => s.id === sessionId))
    .catch(() => false);

  if (!mine) return { error: "That session could not be found." };

  try {
    await getWorkOS().userManagement.revokeSession({ sessionId });
  } catch (error) {
    return { error: readableError(error, "Could not end that session.") };
  }
  return {};
}

/**
 * End every session except this one — the "lost my phone" button.
 *
 * Failures are counted rather than swallowed. Reporting success while three of
 * five devices are still signed in is the exact failure this whole change
 * exists to remove.
 */
export async function revokeMyOtherSessions(): Promise<{
  error?: string;
  ended?: number;
}> {
  const { user, sessionId: current } = await withAuth();
  if (!user) return { error: "You are not signed in." };

  let others;
  try {
    const page = await getWorkOS().userManagement.listSessions(user.id);
    others = page.data.filter((s) => s.id !== current && s.status === "active");
  } catch (error) {
    return { error: readableError(error, "Could not read your sessions.") };
  }

  const results = await Promise.allSettled(
    others.map((s) =>
      getWorkOS().userManagement.revokeSession({ sessionId: s.id }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    return {
      error: `${others.length - failed} of ${others.length} devices were signed out. Try again.`,
    };
  }
  return { ended: others.length };
}

// ── Email verification ──────────────────────────────────────────────────────

/**
 * Whether the signed-in user's address is actually verified.
 *
 * The customer security card took `emailVerified` as a PROP and nothing ever
 * passed it, so it was permanently undefined and every user — verified or not —
 * was shown "Unverified" beside a button offering to fix it. Both environments
 * set `isEmailVerificationRequired: true`, so in practice everyone who can sign
 * in at all is already verified, and the screen was telling all of them
 * otherwise.
 *
 * Asked of WorkOS rather than threaded through props, so there is one answer and
 * no caller can forget to supply it.
 */
export async function myEmailStatus(): Promise<{
  email: string | null;
  emailVerified: boolean;
}> {
  const { user } = await withAuth();
  if (!user) return { email: null, emailVerified: false };
  return { email: user.email, emailVerified: user.emailVerified };
}

/**
 * Send the verification email again.
 *
 * REPLACES A TOAST. The button called a handler that only rendered
 * `Verification link sent to …` — no call to anything. WorkOS has always been
 * able to do this (`sendVerificationEmail`), and the environment's email is
 * live: `isEmailVerificationEmailEnabled` is true and delivery runs through
 * Resend, which is why sign-up verification has always genuinely arrived. Only
 * this button was inert.
 *
 * The user id comes from the session, never an argument — otherwise this would
 * be an open relay for sending mail to any account by id.
 */
export async function sendMyVerificationEmail(): Promise<{ error?: string }> {
  const { user } = await withAuth();
  if (!user) return { error: "You are not signed in." };

  if (user.emailVerified) {
    return { error: "That address is already verified." };
  }

  try {
    await getWorkOS().userManagement.sendVerificationEmail({ userId: user.id });
  } catch (error) {
    // Rate limiting is the expected failure — WorkOS answers 429 for repeated
    // sends, and its own wording says how long to wait, which is more useful
    // than a generic retry message.
    return { error: readableError(error, "Could not send that email.") };
  }
  return {};
}
