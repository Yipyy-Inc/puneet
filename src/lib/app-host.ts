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

import { facilitySlugFromHost } from "@/lib/facility-host";

/**
 * The apex, normalised — lowercased, with a leading or trailing dot removed.
 *
 * Written out once because every function here needs it, and three copies of
 * the same normalisation are three chances to normalise differently.
 */
function apexOf(appDomain: string | null | undefined): string | null {
  const value = appDomain
    ?.trim()
    .toLowerCase()
    .replace(/^\.|\.$/g, "");
  return value || null;
}

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
  const apex = apexOf(appDomain);
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
  const apex = apexOf(appDomain);
  return apex ? `app.${apex}` : null;
}

// `appOrigin()` lived here until 2026-08-26 — `https://app.<apex>`, the bare
// software host with no facility named. Its only caller was the sign-in link on
// the coming-soon page, which was removed, so it went with it rather than being
// left as an accessor nobody calls. `facilityStaffOrigin` and
// `facilityCustomerOrigin` below are what a link to a real facility needs; if
// you ever want the bare host again, `facilityParentHost()` already returns it.

/**
 * The host Yipyy's own staff run the platform from — `hq.<apex>`.
 *
 * Reserved in `facility-host.ts` AND in Postgres (20260826140000), so no
 * facility can ever hold the slug and shadow it.
 */
export function platformHost(
  appDomain: string | null | undefined,
): string | null {
  const apex = apexOf(appDomain);
  return apex ? `hq.${apex}` : null;
}

/** Absolute origin of the super-admin portal, or null when unconfigured. */
export function platformOriginFor(
  appDomain: string | null | undefined,
): string | null {
  const host = platformHost(appDomain);
  return host ? `https://${host}` : null;
}

/** Absolute origin of a facility's STAFF address — `<slug>.app.<apex>`. */
export function facilityStaffOrigin(
  slug: string,
  appDomain: string | null | undefined,
): string | null {
  const parent = facilityParentHost(appDomain);
  return parent ? `https://${slug.trim().toLowerCase()}.${parent}` : null;
}

/** Absolute origin of a facility's CUSTOMER address — `<slug>.<apex>`. */
export function facilityCustomerOrigin(
  slug: string,
  appDomain: string | null | undefined,
): string | null {
  const apex = apexOf(appDomain);
  return apex ? `https://${slug.trim().toLowerCase()}.${apex}` : null;
}

// ============================================================================
// WHO A HOSTNAME IS FOR.
//
// A host answers two questions and only the first has ever been modelled here:
// WHICH FACILITY it is about (`facilitySlugFromHost`), and WHICH AUDIENCE it is
// for. From 2026-08-26 the second one decides real routing, because the same
// facility now has two addresses that mean different things:
//
//   yipyy.com, www.yipyy.com      marketing        nobody signed in
//   hq.yipyy.com                  platform         Yipyy's own staff
//   app.yipyy.com                 staff            no facility named yet
//   <slug>.app.yipyy.com          staff            that facility's people
//   <slug>.yipyy.com              customer         that facility's customers
//
// ── IT IS ROUTING, NOT AUTHORISATION ──────────────────────────────────────
//
// Exactly like `facilitySlugFromHost`, and for exactly the same reason: RLS
// scopes every row from the JWT, and `getFacilityContext()` resolves the
// facility from the caller's membership. A forged Host buys a wrong-looking
// page and no data. Nothing below may ever become the reason somebody is
// allowed to read something.
// ============================================================================

export type HostAudience = "marketing" | "platform" | "staff" | "customer";

export interface ResolvedHost {
  audience: HostAudience;
  /** The facility this host names, or null when it names none. */
  slug: string | null;
}

/**
 * Which audience a hostname serves, and which facility it names.
 *
 * ── LOCALHOST IS `staff`, DELIBERATELY ────────────────────────────────────
 *
 * A developer on `localhost:3000` or `*.test` gets the staff answer and no
 * slug, so `/` still opens the portal and nothing redirects them across hosts
 * that do not exist locally. Host-based behaviour is exercised in development
 * by sending a `Host:` header, not by changing this.
 */
export function resolveHost(
  host: string | null | undefined,
  appDomain: string | null | undefined,
): ResolvedHost {
  const name = bare(host);
  const apex = apexOf(appDomain);

  if (!name || !apex) return { audience: "staff", slug: null };

  // ── ONLY A HOST THAT IS NOT OURS SHORT-CIRCUITS ─────────────────────────
  //
  // `localhost` and a bare IP name no facility and belong to no audience, so
  // they get the staff answer and `/` opens the portal.
  //
  // `*.test` deliberately does NOT bail out here. Development sets
  // NEXT_PUBLIC_APP_DOMAIN to `yipyy.test`, which makes `yipyy.test` the real
  // apex, `hq.yipyy.test` the real platform host and `pawradise.yipyy.test` a
  // real customer host. The first version excluded it and silently disabled
  // every host rule locally — the marketing page stopped rendering and
  // `/dashboard` stopped moving, which is exactly the behaviour the local
  // `Host:` probes exist to catch.
  if (
    name === "localhost" ||
    name.startsWith("127.0.0.1") ||
    name.endsWith(".localhost")
  ) {
    return { audience: "staff", slug: null };
  }

  if (name === apex || name === `www.${apex}`) {
    return { audience: "marketing", slug: null };
  }

  if (name === `hq.${apex}`) return { audience: "platform", slug: null };

  const parent = facilityParentHost(appDomain);
  if (name === parent) return { audience: "staff", slug: null };

  // `<slug>.app.<apex>` before `<slug>.<apex>`: the staff shape is strictly
  // longer, so testing the apex first would match `pawradise.app` as a slug
  // and then reject it for containing a dot — losing the facility entirely.
  const staffSlug = parent ? facilitySlugFromHost(name, parent) : null;
  if (staffSlug) return { audience: "staff", slug: staffSlug };

  const customerSlug = facilitySlugFromHost(name, apex);
  if (customerSlug) return { audience: "customer", slug: customerSlug };

  // A name under our apex that resolves to no facility — a reserved label, or
  // something too deep. Treated as the platform's own, which is what every
  // caller here already does with an unrecognised host.
  return { audience: "staff", slug: null };
}
