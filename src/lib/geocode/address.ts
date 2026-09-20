// ============================================================================
// An address suggestion, and how one is read out of a Photon response.
//
// ── WHY THE PROVIDER IS BEHIND A SHAPE OF OUR OWN ─────────────────────────
//
// The client asked for Photon (komoot.io), self-hosted on the VPS for
// unlimited free lookups. Photon is the right tool and the wrong place: it is
// a JVM with an embedded OpenSearch that wants several GB to itself, and the
// box it would share runs BOTH deployment colours of this app plus Caddy in
// 8 GB. An OOM kill there does not degrade search, it takes the site down.
//
// So we run against Komoot's own public Photon instance, which is the same
// software answering the same API. Self-hosting later is `GEOCODER_URL`
// pointing somewhere else and nothing in this file changing — that is the
// whole reason the route maps into OUR shape here rather than handing a
// provider's JSON to a form.
//
// ── WHAT A FORM ACTUALLY NEEDS ────────────────────────────────────────────
//
// Four fields, because that is what `clients.address` holds and what
// CreateClientModal asks for: street, city, province, postal code. The
// coordinates come too — not for the form, but because
// `src/lib/route-planning.ts` currently HASHES the address string into a fake
// map position, so every drive time a mobile groomer reads is invented. A real
// latitude and longitude is what eventually retires that.
// ============================================================================

export interface AddressSuggestion {
  /** Stable within a response; used as a React key and nothing else. */
  id: string;
  /** The one line a person reads in the list. */
  label: string;
  street: string;
  city: string;
  /** Two letters where we recognise the province, its full name otherwise. */
  province: string;
  postalCode: string;
  /** ISO-3166-1 alpha-2, uppercase. */
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Photon answers with the province's FULL NAME ("Quebec"), and every address
 * form in this app — and Canada Post — wants the two-letter code.
 *
 * ── BOTH LANGUAGES, BECAUSE WE ASK FOR BOTH ───────────────────────────────
 *
 * The route sends `lang=fr` for a French reader, and Photon then answers
 * `"state": "Nouvelle-Écosse"`. Measured, not assumed — an English-only map
 * looked complete because "Québec" folds to "quebec" and happened to match,
 * so Quebec worked and every other province quietly put a French sentence in
 * a two-letter field for exactly the readers this product is built for.
 *
 * Accent-insensitive rather than a list of spellings: `lang` decides whether
 * "Québec" or "Quebec" arrives, and neither is worth a second entry.
 */
const CANADIAN_PROVINCES: Record<string, string> = {
  alberta: "AB",
  britishcolumbia: "BC",
  colombiebritannique: "BC",
  manitoba: "MB",
  newbrunswick: "NB",
  nouveaubrunswick: "NB",
  newfoundlandandlabrador: "NL",
  terreneuveetlabrador: "NL",
  novascotia: "NS",
  nouvelleecosse: "NS",
  northwestterritories: "NT",
  territoiresdunordouest: "NT",
  nunavut: "NU",
  ontario: "ON",
  princeedwardisland: "PE",
  ileduprinceedouard: "PE",
  quebec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
  yukonterritory: "YT",
};

/** Lowercased, unaccented, stripped of spaces, hyphens and apostrophes. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function provinceCode(name: string | null | undefined): string {
  const value = name?.trim() ?? "";
  if (!value) return "";
  // Already a code — pass it through rather than failing to match it.
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  return CANADIAN_PROVINCES[fold(value)] ?? value;
}

/** One Photon feature, in the fields it actually sets. */
interface PhotonFeature {
  properties?: {
    osm_type?: string | null;
    osm_id?: number | string | null;
    name?: string | null;
    housenumber?: string | null;
    street?: string | null;
    city?: string | null;
    district?: string | null;
    county?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
    countrycode?: string | null;
  } | null;
  geometry?: { coordinates?: unknown } | null;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * The street line.
 *
 * `housenumber` and `street` are separate fields and both can be absent: a
 * named place (a park, a business) sets `name` and no street at all. Returning
 * the name keeps that row selectable instead of showing a blank line — the
 * person still gets the city, province and postcode filled in, which is more
 * than they had.
 */
function streetLine(p: NonNullable<PhotonFeature["properties"]>): string {
  const street = text(p.street);
  const number = text(p.housenumber);
  if (street) return number ? `${number} ${street}` : street;
  return text(p.name);
}

/**
 * Which municipality. Photon sets `city` for a city proper, and leaves it
 * EMPTY for an address in a town or a rural county, where `district` or
 * `county` carries it. Falling straight through to "" would put the burden of
 * noticing back on the person, which is what autocomplete is for.
 */
function cityLine(p: NonNullable<PhotonFeature["properties"]>): string {
  return text(p.city) || text(p.district) || text(p.county);
}

export interface SuggestionOptions {
  /**
   * Keep only results in this country (alpha-2). Photon has no country
   * parameter — a query is biased toward a point and can still answer with
   * somewhere else — so the filter belongs here, where it can be tested.
   * Empty means keep everything.
   */
  country?: string;
}

export function suggestionsFromPhoton(
  payload: unknown,
  options: SuggestionOptions = {},
): AddressSuggestion[] {
  const features = (payload as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];

  const wanted = options.country?.trim().toUpperCase() ?? "";
  const seen = new Set<string>();
  const out: AddressSuggestion[] = [];

  for (const raw of features as PhotonFeature[]) {
    const p = raw?.properties;
    if (!p) continue;

    const country = text(p.countrycode).toUpperCase();
    if (wanted && country !== wanted) continue;

    const street = streetLine(p);
    // Nothing to put in the street field and nothing to read in the list.
    if (!street) continue;

    const coordinates = raw.geometry?.coordinates;
    // GeoJSON is [lon, lat]. Reading it the other way round puts every
    // Canadian address in the Indian Ocean, silently, which is the sort of
    // thing a unit test should hold rather than a reviewer.
    const lon = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const city = cityLine(p);
    const province = provinceCode(p.state);
    const postalCode = text(p.postcode).toUpperCase();

    // Two OSM objects can describe the same doorway (a node and the building
    // way). They read identically in a list, so the second one is noise.
    const key = `${street}|${city}|${province}|${postalCode}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: `${text(p.osm_type)}${String(p.osm_id ?? "")}` || key,
      label: [street, city, province, postalCode].filter(Boolean).join(", "),
      street,
      city,
      province,
      postalCode,
      country,
      latitude: lat,
      longitude: lon,
    });
  }

  return out;
}
