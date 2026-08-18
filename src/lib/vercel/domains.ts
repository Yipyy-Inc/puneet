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
// Confirmed again on 2026-08-18 by adding `*.yipyy.com` to the project: it
// reports "Invalid Configuration -- update your domain's nameservers", and
// offers no DNS-01 record to add. Nameserver delegation is the ONLY route, so
// there is nothing to retry here.
//
// Moving the nameservers would mean recreating ELEVEN records, and most of them
// have nothing to do with facilities. Enumerated from the live zone rather than
// remembered (the earlier version of this note counted twelve and named Clerk's
// `clerk`/`accounts` hosts, which ADR 0004 removed):
//
//   A      yipyy.com                   -> Vercel          the site
//   CNAME  www                         -> yipyy.com       the site
//   CNAME  *                           -> Vercel          EVERY facility host
//   MX     yipyy.com                   -> mx1/mx2.hostinger.com   ALL COMPANY EMAIL
//   TXT    yipyy.com                   -> v=spf1 ...hostinger...  company email SPF
//   TXT    yipyy.com                   -> google-site-verification=...
//   CNAME  autodiscover                -> ...hostinger.com        mail auto-setup
//   TXT    _dmarc                      -> v=DMARC1; p=none
//   MX     send                        -> feedback-smtp...amazonses.com   Resend bounces
//   TXT    send                        -> v=spf1 include:amazonses.com    Resend SPF
//   TXT    resend._domainkey           -> p=MIGfMA0G...                   Resend DKIM
//
// The last three carry every password-reset and verification email WorkOS
// sends. A typo there does not break facilities -- it locks people out of the
// platform, silently, because the mail still sends and just lands in spam.
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
  // ── TWO NAMES FOR EACH, DELIBERATELY ────────────────────────────────────
  //
  // Vercel injects VERCEL_PROJECT_ID and VERCEL_TEAM_ID itself when system
  // environment variables are exposed, and it may refuse a CUSTOM variable
  // whose name starts with `VERCEL_` — the documentation does not say either
  // way, and guessing wrong means handing somebody a setup step that silently
  // does not work.
  //
  // So each is read under a settable name first and falls back to the one
  // Vercel provides. On Vercel, usually only DOMAINS_API_TOKEN needs setting;
  // anywhere else, set all three.
  const token =
    process.env.DOMAINS_API_TOKEN?.trim() ||
    process.env.VERCEL_API_TOKEN?.trim();
  const projectId =
    process.env.DOMAINS_PROJECT_ID?.trim() ||
    process.env.VERCEL_PROJECT_ID?.trim();
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();

  if (!token) return { reason: "DOMAINS_API_TOKEN is not set." };
  if (!projectId) return { reason: "DOMAINS_PROJECT_ID is not set." };
  if (!appDomain) return { reason: "NEXT_PUBLIC_APP_DOMAIN is not set." };

  return {
    token,
    projectId,
    // A personal-account project has no team. Vercel rejects an empty teamId
    // rather than ignoring it, so it is omitted from the query when absent.
    teamId:
      process.env.DOMAINS_TEAM_ID?.trim() ||
      process.env.VERCEL_TEAM_ID?.trim() ||
      null,
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

/**
 * Every host attached to the project, in ONE call.
 *
 * `facilityDomainStatus` answers for a single facility and is right for the
 * detail screen. The facilities LIST needs the same answer for every row, and
 * asking per row would be one Vercel round trip per facility — forty-odd calls
 * to render a table, against a documented rate limit of 500/minute. This asks
 * once and lets the caller compare.
 *
 * ── WHY THE LIST NEEDS THIS AT ALL ────────────────────────────────────────
 *
 * A failed attach was already loud in the two places it happens — the wizard's
 * success screen and the facility's Overview tab. Both are per-facility, so
 * finding a broken one meant opening every facility in turn. That is fine at
 * three and useless at forty, and forty is exactly when it matters: the Vercel
 * plan caps domains per project (50 on Hobby), so the failures do not arrive
 * one at a time — every facility created after the ceiling fails, and the first
 * anyone hears of it is the business asking why their address is dead.
 *
 * Paginated deliberately. The cap is 50 on Hobby but unlimited on Pro, so a
 * single page is an assumption with a expiry date on it.
 */
export type AttachedHosts =
  | { configured: true; hosts: string[] }
  | { configured: false; reason: string };

export async function attachedProjectHosts(): Promise<AttachedHosts> {
  const config = configure();
  if ("reason" in config) return { configured: false, reason: config.reason };

  // A Set, because a cursor that repeats a page would otherwise inflate the
  // list with duplicates and hide that anything went wrong.
  const hosts = new Set<string>();
  let since: string | undefined;
  let complete = false;

  try {
    // Bounded rather than `while (true)`: a malformed pagination cursor that
    // never advances would otherwise spin against Vercel until the request
    // times out. 20 pages of 100 is 2,000 hosts — far past the Pro soft limit
    // anyone here will reach, and it fails visibly rather than hanging.
    for (let page = 0; page < 20; page += 1) {
      const query = `&limit=100${since ? `&until=${encodeURIComponent(since)}` : ""}`;
      const response = await fetch(
        url(
          config,
          `/v9/projects/${encodeURIComponent(config.projectId)}/domains?production=true`,
        ) + query,
        { headers: { Authorization: `Bearer ${config.token}` } },
      );

      const body = (await response.json().catch(() => null)) as {
        domains?: { name?: string }[];
        pagination?: { next?: number | null };
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        return {
          configured: false,
          reason:
            body?.error?.message ?? `Vercel answered HTTP ${response.status}.`,
        };
      }

      // An OK response whose shape we do not recognise must NOT be read as
      // "no domains are attached". That answer is indistinguishable from a
      // real empty project, and the caller badges every facility it cannot
      // find as broken -- so a change at Vercel's end would send a superadmin
      // chasing forty problems that do not exist. Unknown shape is unknown.
      if (!Array.isArray(body?.domains)) {
        return {
          configured: false,
          reason: "Vercel returned an unrecognised response.",
        };
      }

      for (const domain of body.domains) {
        if (domain.name) hosts.add(domain.name.toLowerCase());
      }

      const next = body?.pagination?.next;
      if (next === null || next === undefined) {
        complete = true;
        break;
      }
      since = String(next);
    }

    // Falling out of the loop instead of breaking means the cursor never
    // reached the end -- too many domains, or a cursor that does not advance.
    // Either way the list is PARTIAL, and a partial list is the one thing the
    // caller must never treat as complete: every host missing from it gets
    // badged as having no web address.
    if (!complete) {
      return {
        configured: false,
        reason: "Too many domains to list in one pass.",
      };
    }

    return { configured: true, hosts: [...hosts] };
  } catch (error) {
    return {
      configured: false,
      reason:
        error instanceof Error ? error.message : "Could not reach Vercel.",
    };
  }
}
