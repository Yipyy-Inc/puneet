import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

// ============================================================================
// Where Google and Apple return a browser after a social sign-in.
//
// The path is NOT arbitrary: it must equal `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
// and be registered on the WorkOS environment, or the provider refuses the
// hand-off with `Invalid redirect_uri` before this file runs. Both environments
// are registered, wildcards included (`https://*.yipyy.com/auth/callback`), so a
// new facility needs no WorkOS change.
//
// ONLY SOCIAL SIGN-IN COMES THROUGH HERE. Email and password authenticate
// server-side and never leave the origin.
//
// WHY THIS IS HAND-WRITTEN RATHER THAN `handleAuth()`. The SDK's helper is built
// for its own hosted flow, which starts at `getSignInUrl()` and seals the state
// itself. We start at the provider instead (see startOAuth) so the facility's
// branded login page is the last thing a user sees before Google, and that means
// the state is ours to issue and ours to check.
//
// THE STATE CHECK IS THE WHOLE SECURITY OF THIS ROUTE. Without it, an attacker
// can hand a victim a link to this callback carrying the ATTACKER'S `code`; the
// victim's browser exchanges it and they are silently signed into the attacker's
// account, where anything they then type belongs to someone else. The cookie is
// httpOnly and single-use: compared, then deleted, on every path out of here.
// ============================================================================

const clientId = process.env.WORKOS_CLIENT_ID!;
const OAUTH_STATE_COOKIE = "workos-oauth-state";

/** Back to the branded sign-in page with something the form can explain. */
function refuse(request: NextRequest, reason: string) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // The provider reports its own refusals here — a cancelled consent screen
  // arrives as `error=access_denied` with no code.
  if (params.get("error")) return refuse(request, "provider");

  const code = params.get("code");
  const state = params.get("state");
  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code) return refuse(request, "missing_code");

  // Constant-ish comparison is unnecessary here (both values are ours and a
  // mismatch reveals nothing timing-wise), but the check itself is not optional.
  if (!state || !expected || state !== expected) {
    return refuse(request, "state");
  }

  let response: NextResponse;
  try {
    const auth = await getWorkOS().userManagement.authenticateWithCode({
      clientId,
      code,
    });

    // `saveSession` seals the session into the cookie the proxy reads. Passing
    // the request rather than a string so the cookie inherits this host — which
    // matters on facility subdomains, where WORKOS_COOKIE_DOMAIN widens it to
    // the parent domain.
    await saveSession(auth, request);

    // `/` routes on to the portal chosen by landingPathFor(viewer) from the
    // token, rather than being guessed here. One sign-in serves every account.
    response = NextResponse.redirect(new URL("/", request.url));
  } catch {
    return refuse(request, "exchange");
  }

  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
