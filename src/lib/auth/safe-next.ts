// ============================================================================
// Where a person was going before they had to sign in — if it is safe to send
// them there.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// Every portal gate bounces a signed-out visitor to `/sign-in?next=<path>`, and
// until 2026-09-15 nothing read `next`: password, code, passkey, Google and
// Apple sign-ins all landed on `/`, and `/join` on the dashboard. A customer who
// followed the link in their estimate email signed in and never saw the
// estimate.
//
// ── WHY IT IS STRICT ──────────────────────────────────────────────────────
//
// A `next` the browser supplies and the server redirects to is an OPEN
// REDIRECT unless it is pinned to this site: `?next=//evil.example` and
// `?next=https://evil.example` both look like paths to a naive check, and a
// branded sign-in page that forwards to a look-alike is a phishing kit. So only
// a same-origin absolute PATH passes — one leading slash, no second slash or
// backslash after it, no scheme, no control characters — and the auth screens
// themselves are refused, so a `next` cannot loop a person back to sign in.
//
// Checked on the SERVER in every action and route that redirects. The client
// reads it only to pass it along.
// ============================================================================

const AUTH_PATHS = ["/sign-in", "/sign-up", "/auth/", "/passkey-setup"];

/** A tab, a newline or any other control character a browser would strip. */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 512) return null;
  if (!value.startsWith("/")) return null;
  // `//host` and `/\host` are protocol-relative to a browser.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (hasControlCharacter(value)) return null;
  if (value.includes("\\")) return null;
  const path = value.split(/[?#]/)[0];
  if (
    AUTH_PATHS.some((prefix) =>
      prefix.endsWith("/")
        ? path.startsWith(prefix)
        : path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }
  return value;
}

/** `?next=…` for a path that passes, or nothing. */
export function nextQuery(raw: string | null | undefined): string {
  const next = safeNextPath(raw);
  return next ? `?next=${encodeURIComponent(next)}` : "";
}
