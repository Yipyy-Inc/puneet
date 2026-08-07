import "server-only";

import { cloverConfig } from "./config";

// ============================================================================
// The three facts about a merchant that OAuth does not hand back.
//
// The token exchange returns a token pair and nothing else — not the currency,
// not the country, and not the public key the browser needs. All three have to
// be asked for, and each lives somewhere different. Established by probing the
// live sandbox, because the published documentation covers the single-merchant
// dashboard flow rather than the multi-merchant OAuth one:
//
//   currency   GET  api…/v3/merchants/{mid}/properties  ->  defaultCurrency
//   country    GET  api…/v3/merchants/{mid}             ->  address.country
//   publicKey  GET  scl…/pakms/apikey                   ->  apiAccessKey
//
// The last one is on a THIRD host. The same path on the v3 API host is a flat
// 404, which is a confusing failure to debug because everything else about the
// request is correct.
//
// ── EACH ONE FAILS SEPARATELY ─────────────────────────────────────────────
//
// A merchant whose currency lookup fails is still connected; the connection is
// simply missing a fact, and the charge path refuses rather than guessing USD.
// So these return null on failure instead of throwing, and the caller stores
// what it got. The alternative — one call that throws — would mean a merchant
// who has already approved at Clover ends up with no connection at all because
// an enrichment lookup timed out.
// ============================================================================

export interface MerchantProfile {
  /** ISO-4217. NULL when Clover would not say — never defaulted. */
  currency: string | null;
  /** ISO-3166-1 alpha-2. */
  country: string | null;
  /** The PUBLIC apiAccessKey (PAKMS). Belongs in the browser; safe there. */
  publicApiKey: string | null;
}

const TIMEOUT_MS = 10_000;

async function get<T>(
  origin: string,
  path: string,
  accessToken: string,
  merchantId: string,
): Promise<T | null> {
  try {
    const response = await fetch(new URL(path, origin), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Required by the ecommerce host, harmless on the platform API.
        "X-Clover-Merchant-Id": merchantId,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Everything worth knowing about a merchant that the token exchange omitted.
 * Three independent requests, run together; any of them may come back null.
 */
export async function fetchMerchantProfile(
  accessToken: string,
  merchantId: string,
): Promise<MerchantProfile> {
  const config = cloverConfig();
  if (!config) return { currency: null, country: null, publicApiKey: null };

  const [properties, merchant, key] = await Promise.all([
    get<{ defaultCurrency?: string }>(
      config.apiOrigin,
      `/v3/merchants/${merchantId}/properties`,
      accessToken,
      merchantId,
    ),
    // ?expand=address is load-bearing. Without it Clover returns `address` as
    // a href stub rather than the object, so country silently reads undefined
    // and the connection records nothing — which is how the first backfill
    // stored a NULL country against a merchant that plainly has one.
    get<{ address?: { country?: string } }>(
      config.apiOrigin,
      `/v3/merchants/${merchantId}?expand=address`,
      accessToken,
      merchantId,
    ),
    get<{ apiAccessKey?: string; active?: boolean }>(
      config.ecommerceOrigin,
      "/pakms/apikey",
      accessToken,
      merchantId,
    ),
  ]);

  // Shape-checked rather than trusted: these values go into columns with
  // regex constraints, and a surprise from the API should become a null here
  // rather than a constraint violation three layers down.
  const currency = properties?.defaultCurrency;
  const country = merchant?.address?.country;

  return {
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    // An inactive key is not a key. Charging with one fails at the browser,
    // which is the hardest place to diagnose it.
    publicApiKey: key?.active === false ? null : (key?.apiAccessKey ?? null),
  };
}
