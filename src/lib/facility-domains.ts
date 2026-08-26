import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { facilityParentHost } from "@/lib/app-host";

// ============================================================================
// A facility's web address.
//
// ── WHAT THIS REPLACES, AND WHY IT IS SO MUCH SMALLER ─────────────────────
//
// `src/lib/vercel/domains.ts` was 376 lines that called
// `POST /v10/projects/{id}/domains` on api.vercel.com every time a facility was
// created. It existed for ONE reason: Vercel will not issue a certificate for
// `*.yipyy.com` without holding the nameservers, so every facility host had to
// be registered individually just to get TLS.
//
// Self-hosted behind Caddy, a certificate is issued on the first request to a
// host, gated by `/api/internal/tls-ask`. So "attaching" a domain is no longer
// a thing that can succeed or fail — the address works the moment the facility
// row exists, because DNS already has a wildcard and Caddy already has a rule.
//
// The module keeps its old shape on purpose. Three routes and two screens
// consume `DomainAttachment` and `AttachedHosts`, and changing the meaning
// underneath them without changing the types would have been the more confusing
// of the two options. What changed is what the answers are DERIVED from:
// nothing here asks a third party whether it agrees that a facility exists.
//
// ── STATUS IS A PROBE, NOT A STORED FLAG ──────────────────────────────────
//
// The old module was careful never to cache attachment, on the grounds that a
// stored flag is a claim about Vercel's state that goes stale the moment
// somebody edits the project by hand. That reasoning survives the move: this
// answers by making a real HTTPS request, so what it reports is what a visitor
// would get, not what a control plane believes.
// ============================================================================

export type DomainAttachment =
  | { attached: true; host: string; verified: boolean; alreadyExisted: boolean }
  | { attached: false; host: string | null; reason: string };

export type AttachedHosts =
  | { configured: true; hosts: string[] }
  | { configured: false; reason: string };

/** A probe must not hold a page open. Caddy answers a warm host in well under this. */
const PROBE_TIMEOUT_MS = 8_000;

/** `<slug>.<appDomain>`, lowercased. The one piece of the old module unchanged. */
export function facilityHost(slug: string, appDomain: string): string {
  return `${slug.trim().toLowerCase()}.${appDomain.trim().toLowerCase()}`;
}

/**
 * The host facilities hang off — `app.yipyy.com` since 2026-08-26, not the
 * apex. Everything in this module builds `<slug>.<this>`, so it is the only
 * line that had to move when facilities did.
 */
function appDomain(): string | null {
  return facilityParentHost(process.env.NEXT_PUBLIC_APP_DOMAIN);
}

/**
 * Does this host actually serve, with a certificate a browser accepts?
 *
 * `fetch` rejects on a TLS failure, so an untrusted or missing certificate is
 * indistinguishable from unreachable here — which is correct, because both are
 * "a visitor cannot use this address".
 */
async function serves(host: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${host}/api/health`, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Make sure a new facility's address is ready before anybody visits it.
 *
 * There is nothing to register. The only real work is warming the certificate:
 * the FIRST request to an unseen host waits on an ACME round trip — measured at
 * 5–7 seconds on this deployment — and it is better that this costs a
 * background request at creation time than a human staring at a slow page.
 *
 * It cannot fail in a way worth reporting: if the warm-up request does not
 * complete, the next visitor simply pays the ACME wait instead. So it never
 * throws and never blocks facility creation, exactly as its predecessor
 * promised for a differently-shaped reason.
 */
export async function attachFacilityDomain(
  slug: string,
): Promise<DomainAttachment> {
  const domain = appDomain();
  if (!domain) {
    return {
      attached: false,
      host: null,
      reason: "NEXT_PUBLIC_APP_DOMAIN is not set, so facilities have no host.",
    };
  }

  const host = facilityHost(slug, domain);
  // Deliberately unawaited in spirit but awaited in fact: the caller runs this
  // post-commit and non-fatally, and an 8s ceiling is cheaper than explaining a
  // cold first visit.
  const warmed = await serves(host);

  return {
    attached: true,
    host,
    verified: warmed,
    // Nothing is created, so nothing can pre-exist. Reported as `true` because
    // the honest answer to "was it already there" is yes: the wildcard record
    // and the Caddy rule cover it before the facility is created.
    alreadyExisted: true,
  };
}

/** Whether this facility's address is serving right now. A live check. */
export async function facilityDomainStatus(
  slug: string,
): Promise<DomainAttachment> {
  const domain = appDomain();
  if (!domain) {
    return {
      attached: false,
      host: null,
      reason: "NEXT_PUBLIC_APP_DOMAIN is not set, so facilities have no host.",
    };
  }

  const host = facilityHost(slug, domain);
  const live = await serves(host);

  if (!live) {
    return {
      attached: false,
      host,
      reason:
        "The address did not answer. Check that the wildcard DNS record still points at this server.",
    };
  }

  return { attached: true, host, verified: true, alreadyExisted: true };
}

/**
 * Every facility host that serves — which, by construction, is all of them.
 *
 * The facilities LIST asks this once rather than probing per row. It is a
 * database read now instead of a paginated walk of somebody else's project, so
 * the answer cannot disagree with the facilities the same page is rendering.
 *
 * RLS decides what is visible; the route above it already admits only platform
 * administrators.
 */
export async function attachedProjectHosts(): Promise<AttachedHosts> {
  const domain = appDomain();
  if (!domain) {
    return {
      configured: false,
      reason: "NEXT_PUBLIC_APP_DOMAIN is not set, so facilities have no host.",
    };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.from("facilities").select("slug");

  if (error) {
    return {
      configured: false,
      reason: "Could not read the facility list to derive their addresses.",
    };
  }

  const hosts = (data ?? [])
    .map((row) => (row.slug ?? "").trim().toLowerCase())
    .filter(Boolean)
    .map((slug) => facilityHost(slug, domain));

  return { configured: true, hosts };
}
