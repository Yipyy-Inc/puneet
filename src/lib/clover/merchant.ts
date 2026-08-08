import "server-only";

import { cloverConfig } from "./config";
import { cloverGet } from "./request";

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

/** The retry lives in ./request.ts — see there for why it is shared. */
async function get<T>(
  origin: string,
  path: string,
  accessToken: string,
  merchantId: string,
): Promise<T | null> {
  const read = await cloverGet<T>(origin, path, accessToken, merchantId);
  return read.data;
}

/**
 * Everything worth knowing about a merchant that the token exchange omitted.
 *
 * ── ONE AT A TIME, AND THAT IS THE FIX ────────────────────────────────────
 *
 * These three ran in a Promise.all, which looked obviously right — they are
 * independent, so why wait. Measured against the sandbox, roughly one in three
 * bursts came back with a 429 on one of them, a DIFFERENT one each time:
 *
 *     PARALLEL    properties 200   merchant 429   apikey 200
 *     SEQUENTIAL  properties 200   merchant 200   apikey 200   (3/3 rounds)
 *
 * The 429 was swallowed as a null and stored as one. So a facility connecting
 * Clover had about a one-in-three chance of ending up with a NULL currency —
 * and a null currency makes chargeCard refuse EVERY card payment, with a
 * message about not knowing the merchant's currency that points nowhere near
 * a rate limit. Three requests saved a few hundred milliseconds and cost the
 * facility its card payments.
 *
 * Sequential, with the retry above. This runs when a merchant connects and
 * when their properties change — a second of latency there is free.
 *
 * ── EACH ONE STILL FAILS SEPARATELY ───────────────────────────────────────
 *
 * A merchant whose currency lookup fails after retries is still connected; the
 * connection is simply missing a fact, and the charge path refuses rather than
 * guessing USD.
 */
export async function fetchMerchantProfile(
  accessToken: string,
  merchantId: string,
): Promise<MerchantProfile> {
  const config = cloverConfig();
  if (!config) return { currency: null, country: null, publicApiKey: null };

  const properties = await get<{ defaultCurrency?: string }>(
    config.apiOrigin,
    `/v3/merchants/${merchantId}/properties`,
    accessToken,
    merchantId,
  );
  // ?expand=address is load-bearing. Without it Clover returns `address` as a
  // href stub rather than the object, so country silently reads undefined and
  // the connection records nothing — which is how the first backfill stored a
  // NULL country against a merchant that plainly has one.
  const merchant = await get<{ address?: { country?: string } }>(
    config.apiOrigin,
    `/v3/merchants/${merchantId}?expand=address`,
    accessToken,
    merchantId,
  );
  const key = await get<{ apiAccessKey?: string; active?: boolean }>(
    config.ecommerceOrigin,
    "/pakms/apikey",
    accessToken,
    merchantId,
  );

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
