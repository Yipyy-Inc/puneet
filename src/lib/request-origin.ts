import "server-only";

// ============================================================================
// Where the visitor actually is — for redirecting them back to it.
//
// Deliberately NOT in `public-origin.ts`. That file answers "where should a
// link we put in an EMAIL point", and its whole thesis is that the answer must
// not come from the request. This is the opposite question and the opposite
// answer: a redirect must land the visitor on the host they were already on, or
// it moves them between origins and their session cookie does not follow.
//
// ── THE BUG THIS EXISTS TO END ────────────────────────────────────────────
//
// `src/app/route.ts` built its redirect from `request.nextUrl.clone()`, with a
// comment explaining that this "carries the origin Next itself resolved, which
// is what keeps this pointing at www.yipyy.com behind Vercel's proxy". True on
// Vercel, and only there. Self-hosted behind Caddy, Next resolves that origin
// from the address the server is LISTENING on — so signing in redirected the
// browser to `https://0.0.0.0:3000/sign-in`, which is not an address at all.
//
// Found on 2026-08-25 by a human signing in on the staging host, after the
// automated checks had passed. Every one of those checks asked the server a
// question and read the body; none of them followed a redirect.
//
// `src/app/auth/callback/route.ts` had the same fault via
// `new URL("/", request.url)`, which would have broken Google and Apple
// sign-in for exactly the same reason.
//
// ── HOST, NEVER X-FORWARDED-HOST ──────────────────────────────────────────
//
// `src/proxy.ts` reads the raw `host` header and never `x-forwarded-host`,
// because a client can send the latter freely and the slug it resolves decides
// which facility a request is about. This follows that rule, so a redirect
// cannot be pointed somewhere else by a header the visitor controls. Caddy
// preserves Host by default, which is why the Caddyfile deliberately carries no
// `header_up Host` line.
// ============================================================================

/** localhost and *.test are the only origins that are legitimately not https. */
function isLocal(host: string): boolean {
  return (
    host.includes("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".test") ||
    host.includes(".test:")
  );
}

/**
 * The scheme-and-host the visitor's browser is actually talking to.
 *
 * `x-forwarded-proto` is set by the terminating proxy — Vercel's edge before,
 * Caddy now, where it is pinned to `https` rather than forwarded so a browser
 * cannot downgrade it. Missing entirely means either local development or a
 * misconfigured proxy; https is the safer of the two guesses everywhere except
 * localhost, and guessing http in production would produce redirects that a
 * browser upgrades or refuses.
 */
export function requestOrigin(request: Request): string {
  const host = request.headers.get("host")?.trim();
  if (!host) {
    // No Host header at all is HTTP/1.0 or a broken proxy. There is nothing
    // truthful to build a URL from, so say so rather than invent one.
    return "";
  }
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (isLocal(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * An absolute URL for `pathname` on the host the visitor is already on.
 *
 * Always absolute: `NextResponse.redirect` rejects a relative URL outright, so
 * returning one would trade a wrong redirect for a thrown one.
 *
 * The fallback to `request.url` is the OLD behaviour, kept only for the case
 * HTTP/1.1 forbids — a request with no Host header at all. It is wrong in the
 * same way this file exists to fix, and it is reached by nothing that speaks
 * HTTP correctly.
 */
export function redirectUrl(request: Request, pathname: string): URL {
  return new URL(pathname, requestOrigin(request) || request.url);
}
