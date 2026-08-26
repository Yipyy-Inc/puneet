// ============================================================================
// Which hostname is the marketing site, and which is the application.
//
// From 2026-08-26 the two are different addresses:
//
//   yipyy.com, www.yipyy.com   the coming-soon page — no session, no portal
//   app.yipyy.com              the software
//   <slug>.yipyy.com           a facility's own front door, unchanged
//
// ── `app` WAS ALREADY RESERVED, AND THAT IS WHY THIS IS SAFE ──────────────
//
// `RESERVED` in `facility-host.ts` has listed `app` since spec 002, so
// `app.yipyy.com` has never been able to resolve to a facility slug and no
// facility can ever have taken the name. The split needed no migration and no
// change to `NEXT_PUBLIC_APP_DOMAIN`, which stays the APEX (`yipyy.com`) — it
// is what subdomains are measured against, not where the app lives. Do not
// "correct" it to app.yipyy.com; that would make every facility subdomain
// resolve as `<slug>.app.yipyy.com` and none of them exist.
//
// ── ONLY `/` MOVES ────────────────────────────────────────────────────────
//
// The apex keeps serving every other path. `yipyy.com/dashboard` and
// `yipyy.com/facility/...` still work, so no bookmark and no link anybody has
// ever sent breaks on the day of the split. What changes is the front door: a
// stranger who types yipyy.com now gets the marketing page instead of being
// bounced into a sign-in screen.
// ============================================================================

/** Strip the port and any trailing dot. `[::1]:3000` is not a hostname. */
function bare(host: string | null | undefined): string | null {
  const value = host?.trim().toLowerCase().split(":")[0]?.replace(/\.$/, "");
  return value || null;
}

/**
 * True when this hostname is the public marketing front door — the apex or
 * `www` — rather than the application or a facility.
 *
 * False for localhost and for `*.test`, so a developer running the app locally
 * still gets the portal at `/` and is not redirected into a marketing page they
 * did not ask for.
 */
export function isMarketingHost(
  host: string | null | undefined,
  appDomain: string | null | undefined,
): boolean {
  const name = bare(host);
  const apex = appDomain
    ?.trim()
    .toLowerCase()
    .replace(/^\.|\.$/g, "");
  if (!name || !apex) return false;
  return name === apex || name === `www.${apex}`;
}

/**
 * The host facilities live under — `app.<apex>`.
 *
 * ── THEY MOVED, AND `NEXT_PUBLIC_APP_DOMAIN` DID NOT ──────────────────────
 *
 * A facility was `pawradise.yipyy.com` until 2026-08-26 and is
 * `pawradise.app.yipyy.com` now: the software has its own address, and the
 * businesses running on it belong under that address rather than beside the
 * marketing site.
 *
 * The variable still holds the APEX. It is tempting to "fix" it to
 * `app.yipyy.com` and delete this function — do not. `isMarketingHost` above
 * measures the apex with it, `/api/internal/tls-ask` decides the apex's own
 * certificate with it, and setting it to the app host would make the marketing
 * domain foreign to its own deployment. One variable, two questions, and this
 * is the second one.
 *
 * `facilitySlugFromHost` still requires EXACTLY ONE label before whatever it is
 * given, so passing this rather than the apex is the whole change:
 * `pawradise.app.yipyy.com` has one label before `app.yipyy.com`, and
 * `a.b.app.yipyy.com` still resolves to nothing.
 */
export function facilityParentHost(
  appDomain: string | null | undefined,
): string | null {
  const apex = appDomain
    ?.trim()
    .toLowerCase()
    .replace(/^\.|\.$/g, "");
  return apex ? `app.${apex}` : null;
}

/**
 * Where the application lives, as an absolute origin.
 *
 * Returns `null` when the app domain is unset, and every caller must treat that
 * as "do not send anybody anywhere" rather than falling back to a guess — a
 * wrong origin here signs people out, because the session cookie is scoped to
 * `.yipyy.com` and would not follow them off it.
 */
export function appOrigin(appDomain: string | null | undefined): string | null {
  const apex = appDomain
    ?.trim()
    .toLowerCase()
    .replace(/^\.|\.$/g, "");
  return apex ? `https://app.${apex}` : null;
}
