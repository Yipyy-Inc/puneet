import { NextResponse, type NextRequest } from "next/server";

import {
  suggestionsFromPhoton,
  type AddressSuggestion,
} from "@/lib/geocode/address";
import { getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/geocode/suggest?q=… — addresses to choose from while typing.
//
// ── WHY A ROUTE AND NOT A FETCH FROM THE FORM ─────────────────────────────
//
// Three things, and the first is the one that decides it:
//
//   * A provider key never reaches a browser. Komoot's public Photon needs
//     none today, and the moment we move to a keyed provider or to our own
//     host, a client-side fetch would have to be rewritten under time
//     pressure. The seam exists before it is needed, which is the only time
//     it is cheap.
//   * Requests are POOLED. Komoot asks callers to "be fair"; a cache in front
//     of it means the fourth person typing the same street this morning costs
//     them nothing.
//   * The response is OUR shape, so swapping providers changes two files and
//     no screen. `GEOCODER_URL` is the switch — pointing it at a self-hosted
//     Photon on its own box is a deploy, not a rewrite.
//
// ── IT NEVER FAILS THE FORM ───────────────────────────────────────────────
//
// Every failure — provider down, timeout, nonsense body — answers 200 with an
// empty list and `available: false`. An address field is a TEXT INPUT with a
// convenience attached; if the convenience is unavailable the person types
// their address, exactly as they do today. A 500 here would invite a screen to
// show an error over a form that is working perfectly.
// ============================================================================

export const dynamic = "force-dynamic";

/** Komoot's public instance. A self-hosted Photon answers the same paths. */
const DEFAULT_GEOCODER = "https://photon.komoot.io";

/** Long enough to be a street, short enough not to be a paste of a novel. */
const MIN_QUERY = 3;
const MAX_QUERY = 120;
const MAX_LIMIT = 8;

/**
 * Where to bias results toward — the middle of populated Canada.
 *
 * Photon takes a point, not a country, and ranks what is near it first. The
 * hard country filter happens in the mapper; this only decides that "main
 * street" offers a Canadian one before a Texan one.
 */
const BIAS = { lat: 45.5, lon: -73.6 };

const TIMEOUT_MS = 4_000;
/** Long enough that a person correcting a typo re-uses the answer. */
const CACHE_TTL_MS = 10 * 60_000;
/** Bounded so a busy day cannot grow the server's heap without limit. */
const CACHE_MAX = 500;

interface CacheEntry {
  at: number;
  suggestions: AddressSuggestion[];
}

// Per-instance and deliberately not shared: this is a courtesy to the provider
// and a latency win, never a source of truth. Two containers keeping separate
// copies of the same public data costs nothing.
const cache = new Map<string, CacheEntry>();

function cached(key: string): AddressSuggestion[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Least-recently-used: re-inserting moves it to the end of the Map's own
  // insertion order, which is what the eviction below reads.
  cache.delete(key);
  cache.set(key, hit);
  return hit.suggestions;
}

function remember(key: string, suggestions: AddressSuggestion[]): void {
  cache.set(key, { at: Date.now(), suggestions });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

const empty = (available: boolean) =>
  NextResponse.json({ suggestions: [], available });

export async function GET(request: NextRequest) {
  // Signed in, and nothing more. Staff type a client's address and a customer
  // types their own, so both portals reach this — and it holds no facility
  // data, so there is nothing here to scope. The session is what keeps it from
  // becoming an open geocoding proxy for the internet.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, MAX_QUERY);
  if (q.length < MIN_QUERY) return empty(true);

  const limit = Math.min(
    Math.max(Number.parseInt(params.get("limit") ?? "5", 10) || 5, 1),
    MAX_LIMIT,
  );
  // The reader's own language, so a Montréal street comes back in the one they
  // are reading the form in. Photon carries en/fr/de and falls back on its own.
  const lang = params.get("lang") === "fr" ? "fr" : "en";

  const key = `${lang}:${limit}:${q.toLowerCase()}`;
  const hit = cached(key);
  if (hit) return NextResponse.json({ suggestions: hit, available: true });

  const base = (process.env.GEOCODER_URL ?? DEFAULT_GEOCODER).replace(
    /\/+$/,
    "",
  );
  const url = new URL(`${base}/api/`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", lang);
  url.searchParams.set("lat", String(BIAS.lat));
  url.searchParams.set("lon", String(BIAS.lon));
  // Addresses and streets only. Without this the list fills with countries,
  // regions and rivers, none of which can be put in a street field.
  url.searchParams.append("layer", "house");
  url.searchParams.append("layer", "street");

  try {
    const response = await fetch(url, {
      // Identifying the caller is what a public instance asks for, and it is
      // what lets Komoot tell us apart from abuse rather than throttling both.
      headers: { "User-Agent": "Yipyy/1.0 (+https://yipyy.com)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return empty(false);

    const suggestions = suggestionsFromPhoton(await response.json(), {
      country: "CA",
    });
    remember(key, suggestions);
    return NextResponse.json({ suggestions, available: true });
  } catch {
    // Timeout, DNS, a body that is not JSON. The form carries on.
    return empty(false);
  }
}
