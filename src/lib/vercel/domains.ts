import "server-only";

// ============================================================================
// Attaching a facility's subdomain to the deployment.
//
// Spec 002 D2 puts every facility on its own host — pawradise.yipyy.com — and
// D1 says provisioning is one action, not a checklist. A superadmin who has to
// open Vercel after creating a facility is doing the second half of a job the
// software claimed to finish.
//
// ── WHY THIS EXISTS INSTEAD OF A WILDCARD DOMAIN ──────────────────────────
//
// Measured, not assumed. Vercel will not issue `*.yipyy.com` unless it holds
// the nameservers, because a WILDCARD certificate can only be validated by a
// DNS-01 challenge — Let's Encrypt requires an `_acme-challenge` TXT record
// that Vercel has to write and rotate itself.
//
// Moving the nameservers to Vercel would mean recreating twelve records, four
// of them load-bearing: the MX pair (all company email), `clerk` and
// `accounts` (every sign-in on the platform), and the DKIM pair (Clerk's mail
// stops authenticating). A typo in any of them is an outage in something
// unrelated to facilities.
//
// So DNS keeps a single wildcard CNAME at the registrar — every subdomain
// RESOLVES to Vercel — and each facility host is added to the project on its
// own, taking an ordinary single-host certificate over HTTP-01, which needs no
// control of DNS. `www.yipyy.com` has worked exactly that way all along.
//
// ── FAILURE IS REPORTED, NEVER RAISED ─────────────────────────────────────
//
// Same rule as the owner invitation: the facility is already committed by the
// time this runs. A facility whose subdomain did not attach is one click from
// fixed; a rolled-back facility whose subdomain DID attach is a support
// ticket. So every function here resolves to a result object and none of them
// throw.
// ============================================================================

const API = "https://api.vercel.com";

export type DomainAttachment =
  | { attached: true; host: string; verified: boolean; alreadyExisted: boolean }
  | { attached: false; host: string | null; reason: string };

interface VercelConfig {
  token: string;
  projectId: string;
  teamId: string | null;
  appDomain: string;
}

/**
 * Configuration, or the reason there is none.
 *
 * Returns a reason rather than throwing so a deployment WITHOUT a Vercel token
 * — a local dev server, a preview, a self-hosted instance — provisions
 * facilities normally and says plainly that the subdomain was not attached.
 * Refusing to create the facility would make an optional integration
 * load-bearing.
 */
function configure(): VercelConfig | { reason: string } {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();

  if (!token) return { reason: "VERCEL_API_TOKEN is not set." };
  if (!projectId) return { reason: "VERCEL_PROJECT_ID is not set." };
  if (!appDomain) return { reason: "NEXT_PUBLIC_APP_DOMAIN is not set." };

  return {
    token,
    projectId,
    // A personal-account project has no team. Vercel rejects an empty teamId
    // rather than ignoring it, so it is omitted from the query when absent.
    teamId: process.env.VERCEL_TEAM_ID?.trim() || null,
    appDomain,
  };
}

function url(config: VercelConfig, path: string): string {
  const suffix = config.teamId
    ? `?teamId=${encodeURIComponent(config.teamId)}`
    : "";
  return `${API}${path}${suffix}`;
}

/** `pawradise` → `pawradise.yipyy.com`. */
export function facilityHost(slug: string, appDomain: string): string {
  return `${slug}.${appDomain}`;
}

/**
 * Attach `<slug>.<appDomain>` to the project.
 *
 * Idempotent. Vercel answers 409 `domain_already_in_use` when the host is
 * already on this project, and re-provisioning or retrying must not turn that
 * into a failure — the desired state is reached either way.
 */
export async function attachFacilityDomain(
  slug: string,
): Promise<DomainAttachment> {
  const config = configure();
  if ("reason" in config) return { attached: false, host: null, ...config };

  const host = facilityHost(slug, config.appDomain);

  try {
    const response = await fetch(
      url(
        config,
        `/v10/projects/${encodeURIComponent(config.projectId)}/domains`,
      ),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: host }),
      },
    );

    const body = (await response.json().catch(() => null)) as {
      verified?: boolean;
      error?: { code?: string; message?: string };
    } | null;

    if (response.ok) {
      return {
        attached: true,
        host,
        verified: body?.verified === true,
        alreadyExisted: false,
      };
    }

    // Already on this project. The state we wanted, reached earlier.
    if (
      response.status === 409 ||
      body?.error?.code === "domain_already_in_use"
    ) {
      const status = await facilityDomainStatus(slug);
      return {
        attached: true,
        host,
        verified: status.attached ? status.verified : false,
        alreadyExisted: true,
      };
    }

    return {
      attached: false,
      host,
      reason:
        body?.error?.message ??
        `Vercel refused the domain (HTTP ${response.status}).`,
    };
  } catch (error) {
    // A network failure here must not fail a request whose facility is already
    // committed.
    return {
      attached: false,
      host,
      reason:
        error instanceof Error ? error.message : "Could not reach Vercel.",
    };
  }
}

/**
 * Whether a facility's host is attached, asked of Vercel each time.
 *
 * Deliberately NOT cached in a column. A stored flag is a claim about
 * somebody else's system that goes stale the moment anyone edits the project
 * by hand — and this is an admin screen read a few times a week, not a hot
 * path.
 */
export async function facilityDomainStatus(
  slug: string,
): Promise<DomainAttachment> {
  const config = configure();
  if ("reason" in config) return { attached: false, host: null, ...config };

  const host = facilityHost(slug, config.appDomain);

  try {
    const response = await fetch(
      url(
        config,
        `/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(host)}`,
      ),
      { headers: { Authorization: `Bearer ${config.token}` } },
    );

    if (response.status === 404) {
      return { attached: false, host, reason: "Not attached to the project." };
    }

    const body = (await response.json().catch(() => null)) as {
      verified?: boolean;
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      return {
        attached: false,
        host,
        reason:
          body?.error?.message ?? `Vercel answered HTTP ${response.status}.`,
      };
    }

    return {
      attached: true,
      host,
      verified: body?.verified === true,
      alreadyExisted: true,
    };
  } catch (error) {
    return {
      attached: false,
      host,
      reason:
        error instanceof Error ? error.message : "Could not reach Vercel.",
    };
  }
}
