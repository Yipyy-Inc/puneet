// ============================================================================
// Which facility a hostname names.
//
// Spec 002 D2: facilities live on subdomains — `pawradise.yipyy.com`. This is
// the one place that turns a Host header into a slug, and it is a pure function
// so it can be tested without a request.
//
// ── IT IS A ROUTING HINT, NOT AN AUTHORISATION INPUT ──────────────────────
//
// Everything this returns decides which facility a request is ABOUT — which
// login page to paint. It never decides what anyone may READ: RLS scopes every
// row from the token, and getFacilityContext() resolves the facility from the
// caller's membership. A forged host buys a wrong-looking login page and
// nothing else.
//
// ── RESERVED NAMES ARE DUPLICATED ON PURPOSE ──────────────────────────────
//
// `facilities_slug_not_reserved` (20260807200000) enforces the real rule in
// Postgres, where every writer passes. This copy exists because the proxy runs
// at the edge and cannot query. They must agree; the database is the authority,
// and this list only has to be a SUPERSET of it to stay safe — a name reserved
// here but not there is merely unreachable, while the reverse would let a
// facility shadow `www`.
// ============================================================================

const RESERVED = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "clerk",
  "accounts",
  "status",
  "sign-in",
  "sign-up",
  "sso-callback",
  "book",
  "review",
  "forms",
  "onboard",
  "setup",
  "profile",
  "customer",
  "facility",
  "employee",
  "groomer",
  "staff",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "support",
  "help",
  "billing",
  "docs",
  "blog",
  "test",
  "staging",
  "dev",
  "internal",
]);

/** Mirrors `facilities_slug_is_a_dns_label`. */
const SLUG = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;

/**
 * The facility slug a host names, or `null` when it names none.
 *
 * `null` covers every ordinary case — the apex, `www`, localhost, a Vercel
 * preview URL, an IP — and the caller must treat it as "this is Yipyy itself",
 * not as an error.
 *
 * @param host      the raw Host header, port included
 * @param appDomain the apex this deployment answers on, e.g. `yipyy.com`
 */
export function facilitySlugFromHost(
  host: string | null | undefined,
  appDomain: string | null | undefined,
): string | null {
  if (!host || !appDomain) return null;

  // Strip the port, and IPv6 brackets with it. `[::1]:3000` is not a facility.
  const bare = host.trim().toLowerCase().split(":")[0]?.replace(/\.$/, "");
  const apex = appDomain
    .trim()
    .toLowerCase()
    .replace(/^\.|\.$/g, "");
  if (!bare || !apex || bare === apex) return null;

  if (!bare.endsWith(`.${apex}`)) return null;

  const prefix = bare.slice(0, -(apex.length + 1));

  // Exactly one label. `a.b.yipyy.com` is not a facility — allowing it would
  // make two different hosts resolve to the same slug.
  if (prefix.includes(".")) return null;

  if (RESERVED.has(prefix)) return null;
  if (!SLUG.test(prefix)) return null;

  return prefix;
}

/** True when this hostname is reserved rather than merely unknown. */
export function isReservedSubdomain(label: string): boolean {
  return RESERVED.has(label.trim().toLowerCase());
}
