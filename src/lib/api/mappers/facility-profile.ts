import type { BusinessProfile } from "@/types/facility";
import type { Tables } from "@/types/database";

// ============================================================================
// The facilities row -> the BusinessProfile the screens already read.
//
// ── EMPTY STRINGS, NOT INVENTED ONES ──────────────────────────────────────
//
// `BusinessProfile` types every field as a required string, because it was
// born as a fixture where everything was filled in. The columns are nullable,
// because a facility that signed up an hour ago has not entered an address.
//
// So null becomes "", and the screen renders an empty field asking to be
// filled — which is the honest thing for a facility to see. What it must NEVER
// become is a plausible default: this whole conversion exists because
// "PawCare Facility" and "contact@pawcare.com" were being shown to every
// facility on the platform, and to their customers, as though somebody had
// typed them.
//
// ── businessName IS facilities.name ───────────────────────────────────────
//
// Not a separate profile field. There was one name in the fixture and there is
// one column in the database; keeping two would let a facility be called one
// thing in its settings and another in the platform admin's list, with nothing
// to say which is right.
// ============================================================================

type FacilityRow = Tables<"facilities">;

/** The address object, tolerant of a row that has never been filled in. */
function toAddress(value: unknown): BusinessProfile["address"] {
  const a = (value ?? {}) as Partial<BusinessProfile["address"]>;
  return {
    street: a.street ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    zipCode: a.zipCode ?? "",
    country: a.country ?? "",
  };
}

function toPreferences(value: unknown): BusinessProfile["preferences"] {
  const p = (value ?? {}) as Partial<BusinessProfile["preferences"]>;
  return {
    clockFormat: p.clockFormat === "24h" ? "24h" : "12h",
    weightUnit: p.weightUnit === "kg" ? "kg" : "lbs",
    temperatureUnit:
      p.temperatureUnit === "fahrenheit" ? "fahrenheit" : "celsius",
  };
}

export function rowToBusinessProfile(row: FacilityRow): BusinessProfile {
  const social = (row.social_media ?? {}) as Record<string, string | undefined>;

  return {
    businessName: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    address: toAddress(row.address),
    logo: row.logo_url ?? "",
    description: row.description ?? "",
    socialMedia: {
      facebook: social.facebook,
      instagram: social.instagram,
      twitter: social.twitter,
    },
    preferences: toPreferences(row.preferences),
  };
}

/**
 * A patch -> the columns to write.
 *
 * Only what the caller SENT. A form that posts its whole state would otherwise
 * blank every field the user did not touch, and `undefined` is how PostgREST is
 * told to leave a column alone — which is a different thing from `null`,
 * meaning "clear it".
 *
 * The columns this cannot reach — id, org_id, slug, legacy_id, business_types,
 * allow_customer_signup — are protected in the DATABASE by
 * `private.enforce_facility_profile_scope()`, not here. This function is a
 * convenience; the trigger is the boundary.
 */
export function businessProfileToRow(
  patch: Partial<BusinessProfile>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (patch.businessName !== undefined) row.name = patch.businessName;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.logo !== undefined) row.logo_url = patch.logo;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.socialMedia !== undefined) row.social_media = patch.socialMedia;
  if (patch.preferences !== undefined) row.preferences = patch.preferences;

  return row;
}

export const FACILITY_PROFILE_SELECT =
  "id, name, email, phone, website, description, logo_url, address, social_media, preferences" as const;
