import { NextResponse, type NextRequest } from "next/server";

import { getBrandingBySlug } from "@/lib/api/facility-branding";
import { facilitySlugFromHost } from "@/lib/facility-host";
import { facilityParentHost, platformHost } from "@/lib/app-host";

// ============================================================================
// Which hostnames may have a TLS certificate issued for them.
//
// Caddy calls this during a TLS handshake for any hostname it has not seen
// before: `GET /api/internal/tls-ask?domain=<host>`. A 2xx authorises it to ask
// Let's Encrypt for a certificate; anything else refuses.
//
// ── THIS ENDPOINT IS WHY THE VERCEL DOMAIN CLIENT CAN BE DELETED ──────────
//
// `src/lib/vercel/domains.ts` (deleted 2026-08-25) existed for one reason:
// Vercel would not issue
// `*.yipyy.com` without holding the nameservers, so every facility subdomain
// had to be registered individually through `POST /v10/projects/{id}/domains`
// just to get a certificate. Caddy issues one on first request instead, and
// this is the gate that decides which requests deserve one.
//
// ── IT IS NOT OPTIONAL ────────────────────────────────────────────────────
//
// Without it, anyone who points any hostname on the internet at this server
// makes us request a certificate for it. Let's Encrypt allows 50 per registered
// domain per week. Exhaust that and NO NEW FACILITY can get a certificate for
// seven days — a self-inflicted outage for every business onboarded that week.
//
// ── IT IS ON THE TLS HANDSHAKE CRITICAL PATH ──────────────────────────────
//
// A visitor's browser is mid-handshake while this runs. That is why the route
// is excluded from the `src/proxy.ts` matcher (a WorkOS session read here would
// be pure added latency, for a request that has no session and cannot have
// one), and why it does exactly one database lookup and no more.
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Refusals say nothing about why. This is an authorisation gate, not an API. */
const DENY = new NextResponse("no", { status: 403 });
const ALLOW = new NextResponse("ok", { status: 200 });

/**
 * Strip anything that is not the hostname.
 *
 * Caddy sends a bare hostname, but a hostname that arrives with a port or a
 * trailing dot is still the same name to DNS, and `facilitySlugFromHost` would
 * reject it. Normalising here rather than trusting the caller's shape.
 */
function normalise(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
}

export async function GET(request: NextRequest) {
  // facility-from-request-ok: Caddy asks about a hostname during a TLS
  // handshake. There is no session and there cannot be one — the certificate
  // being decided on is the one that would carry it. The name is validated
  // against the RESERVED set and then against a SECURITY DEFINER lookup that
  // answers about exactly one facility, so a caller can confirm a facility
  // exists and nothing else.
  const domain = normalise(request.nextUrl.searchParams.get("domain") ?? "");
  if (!domain) return DENY;

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase();
  if (!appDomain) {
    // Refuse rather than guess. An unset app domain here would otherwise mean
    // approving every hostname on the internet.
    return DENY;
  }

  // The apex and www carry the platform itself — the super-admin portal, the
  // Clover webhook, the customer sign-in. Always allowed.
  if (domain === appDomain || domain === `www.${appDomain}`) return ALLOW;

  // ── AND `app`, WHICH IS WHERE THE SOFTWARE LIVES ────────────────────────
  //
  // Named explicitly, because the check below would refuse it: `app` is one of
  // the 37 RESERVED labels in `facility-host.ts`, so `facilitySlugFromHost`
  // answers null for it exactly as it does for `mail` or `admin`. That is
  // correct — no facility may ever be called `app` — but it also meant
  // app.yipyy.com could not obtain a certificate at all, and the TLS handshake
  // failed before any of it reached the application.
  //
  // Being reserved is what makes this safe rather than a hole: the name cannot
  // collide with a tenant, so allowing it authorises exactly one hostname.
  if (domain === `app.${appDomain}`) return ALLOW;

  // ── AND `hq`, WHERE YIPYY'S OWN STAFF RUN THE PLATFORM ──────────────────
  //
  // Same shape and same justification as `app` above: `hq` is RESERVED — in
  // `facility-host.ts` and, since 20260826140000, in Postgres — so no facility
  // can hold the slug and this authorises exactly one hostname.
  if (domain === platformHost(appDomain)) return ALLOW;

  // ── A FACILITY HAS TWO ADDRESSES, AND BOTH ARE REAL ─────────────────────
  //
  // `pawradise.app.yipyy.com` is where that facility's STAFF work.
  // `pawradise.yipyy.com` is where its CUSTOMERS go. Both need a certificate
  // because both are served — the second is not a legacy shape kept alive for a
  // redirect, which is what it was for a few hours on 2026-08-26 before the
  // customer portal was given its own host.
  //
  // Both go through the same pure function `src/proxy.ts` uses, so a hostname
  // that cannot name a facility cannot mint a certificate either — including
  // the 37 reserved labels, so `admin.yipyy.com` and `mail.yipyy.com` are
  // refused here as firmly as they are there.
  const parent = facilityParentHost(appDomain);
  const slug =
    (parent ? facilitySlugFromHost(domain, parent) : null) ??
    facilitySlugFromHost(domain, appDomain);
  if (!slug) return DENY;

  // And the facility has to actually exist. A wildcard DNS record means every
  // conceivable subdomain resolves to this server, so without this check
  // `anything.yipyy.com` would be issued a certificate on demand.
  try {
    const branding = await getBrandingBySlug(slug);
    return branding ? ALLOW : DENY;
  } catch {
    // A database blip must not authorise issuance. Failing closed here costs a
    // visitor one retry; failing open costs the weekly certificate quota.
    return DENY;
  }
}
