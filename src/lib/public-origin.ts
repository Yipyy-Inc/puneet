import "server-only";

// ============================================================================
// Where a link we PUT IN AN EMAIL should point.
//
// ── THE BUG THIS EXISTS TO END ────────────────────────────────────────────
//
// Every outbound email built its URLs from `request.headers.get("origin")` —
// the host the person who pressed the button happened to be on. That is not a
// property of the recipient, the facility, or the platform. It is a property
// of somebody else's browser tab.
//
// Reported from production: a superadmin with a Pawradise tab open created
// Doggieville Mtl, and its owner was emailed a link to
// pawradise.yipyy.com/sign-up — told to create an account at a business she
// had never heard of, on the one email that hands somebody their company.
//
// It still WORKED, which is what let it ship: access is tied to the email
// address rather than the host, so nothing failed loudly. Only the meaning was
// wrong.
//
// ── TWO KINDS OF LINK, TWO ANSWERS ────────────────────────────────────────
//
// A facility's people belong at THEIR facility's door — their name, their
// logo (spec 002 D2). The platform's own people belong at the apex; sending a
// Yipyy administrator to a customer's branded host to set up their account is
// the same mistake pointing the other way.
//
// Neither answer involves the request. That is the whole point.
//
// ── THE REQUEST IS STILL THE LAST FALLBACK ────────────────────────────────
//
// With no NEXT_PUBLIC_APP_URL and no NEXT_PUBLIC_APP_DOMAIN there is no
// deployment-wide address to use — a local dev server, a preview, a
// self-hosted instance. Falling back to the request there is right, because
// the alternative is a link to a host that does not exist. It is only wrong
// when we know better, and these two functions are how we know better.
// ============================================================================

function fromRequest(request: Request): string {
  const header = request.headers.get("origin");
  if (header) return header;
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

/**
 * Yipyy's own address, for platform-level mail — an administrator invitation,
 * a security notice. Never a customer's branded host.
 */
export function platformOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (appDomain) return `https://${appDomain}`;

  return fromRequest(request);
}

/**
 * A facility's own address, for mail to its owner, its staff or its customers.
 *
 * `slug` must come from the FACILITY ROW, never from the request — the point of
 * this function is defeated entirely if the caller can name the host.
 *
 * Falls back to the platform origin when there is no app domain (so no
 * per-facility hosts exist) or no slug. A link to the apex is a working link;
 * a link to a subdomain that was never configured is not.
 */
export function facilityOrigin(
  slug: string | null | undefined,
  request: Request,
): string {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  const trimmed = slug?.trim().toLowerCase();
  if (appDomain && trimmed) return `https://${trimmed}.${appDomain}`;
  return platformOrigin(request);
}
