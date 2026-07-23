import { getLocationsByFacility } from "@/data/locations";
import type { Location } from "@/types/location";
import type {
  QuickBooksClass,
  QuickBooksCompanyData,
  QuickBooksPlan,
  QuickBooksRef,
} from "@/types/quickbooks";

import type { MappingSet } from "./mappings-store";

// ============================================================================
// Tracking one QuickBooks company by Yipyy location (Phase 8).
//
// A multi-location facility that runs every branch through ONE QuickBooks
// company has no way to answer "how did Mile End do last month" unless each
// transaction carries the branch. QuickBooks' answer to that is Classes, and
// this file is the bridge: Yipyy location → QuickBooks Class.
//
// The whole feature is gated on the subscription. Classes do not exist on
// Simple Start or Essentials — not "are unavailable", do not exist — so sending
// a ClassRef there is rejected at post time. Discovering that after a month of
// failed syncs is exactly the outcome the greyed-out toggle prevents.
//
// TODO: real QuickBooks reads — Class comes from the Class query, and the plan
// from CompanyInfo / the AccountingInfoPrefs ClassTrackingPerTxn preference.
// ============================================================================

/** Only these two tiers have the Class entity. */
const PLANS_WITH_CLASSES: ReadonlySet<QuickBooksPlan> = new Set([
  "plus",
  "advanced",
]);

export function planSupportsClasses(plan: QuickBooksPlan): boolean {
  return PLANS_WITH_CLASSES.has(plan);
}

export const PLAN_LABEL: Record<QuickBooksPlan, string> = {
  simple_start: "Simple Start",
  essentials: "Essentials",
  plus: "Plus",
  advanced: "Advanced",
};

/** The exact sentence the disabled toggle shows. */
export const CLASS_TRACKING_REQUIRED_MESSAGE =
  "Class tracking requires QuickBooks Plus or Advanced.";

/** The mappings-store key for a location. */
export function locationMappingKey(locationId: string): string {
  return `location:${locationId}`;
}

/** Locations this facility actually operates, in the order the HQ screens use.
 *  A branch that is announced but not yet open has nothing to post, so it isn't
 *  offered — mapping it would be work with no transaction behind it. */
export function facilityLocations(facilityId: string | number): Location[] {
  const numeric =
    typeof facilityId === "number" ? facilityId : Number(facilityId);
  if (Number.isNaN(numeric)) return [];
  return getLocationsByFacility(numeric).filter(
    (l) => l.status !== "coming_soon",
  );
}

/** Classes a facility can pick from. Inactive ones are hidden: QuickBooks
 *  rejects a posting against an inactive Class. */
export function selectableClasses(
  data: QuickBooksCompanyData,
): QuickBooksClass[] {
  return data.classes.filter((c) => c.Active);
}

/**
 * A Class whose name matches the location, offered as a suggestion.
 *
 * Deliberately conservative: an exact-ish name match only. Guessing that
 * "Plateau" means the class called "Retail" would silently file a branch's
 * revenue under someone else's, and a wrong Class is harder to spot than a
 * missing one.
 */
export function suggestClassForLocation(
  location: { name: string; shortCode?: string },
  classes: QuickBooksClass[],
): QuickBooksClass | undefined {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const name = normalise(location.name);
  const short = normalise(location.shortCode ?? "");

  return classes.find((c) => {
    const cls = normalise(c.Name);
    if (!cls) return false;
    if (cls === name || (short && cls === short)) return true;
    // "Yipyy – Plateau" contains "Plateau": the branch name is usually the
    // company name plus the neighbourhood.
    return cls.length >= 3 && name.endsWith(` ${cls}`);
  });
}

export interface LocationClassResolution {
  classRef?: QuickBooksRef;
  /** Attached to the sync log when a sale can't be attributed to a branch. */
  warning?: string;
}

/**
 * Which Class a transaction should carry.
 *
 * Never blocks: an unmapped location posts without a Class and says so. The
 * sale still reaches the books, just unattributed — which is recoverable,
 * unlike a rejected posting.
 */
export function resolveLocationClass(
  locationId: string | undefined,
  mappings: MappingSet,
  data: QuickBooksCompanyData,
  /** Only needed to name the location in a warning, so the shape is minimal —
   *  a document builder shouldn't have to carry the whole Location record. */
  locations: { id: string; name: string }[] = [],
): LocationClassResolution {
  if (!planSupportsClasses(data.plan)) return {};

  if (!locationId) {
    return {
      warning:
        "This sale has no Yipyy location on it — it posts to QuickBooks without a Class, so it won't appear in any location's totals.",
    };
  }

  const classId = mappings[locationMappingKey(locationId)]?.classId;
  const label = locations.find((l) => l.id === locationId)?.name ?? locationId;

  if (!classId) {
    return {
      warning: `"${label}" isn't mapped to a QuickBooks Class — this sale posts without one and won't appear in that location's totals.`,
    };
  }

  const cls = data.classes.find((c) => c.Id === classId);
  if (!cls) {
    return {
      warning: `The QuickBooks Class mapped to "${label}" no longer exists — this sale posts without one.`,
    };
  }
  if (!cls.Active) {
    return {
      warning: `The QuickBooks Class "${cls.Name}" is inactive — QuickBooks would reject the posting, so this sale is sent without a Class.`,
    };
  }

  return { classRef: { value: cls.Id, name: cls.Name } };
}

export interface LocationMappingProgress {
  mapped: number;
  total: number;
  unmapped: Location[];
}

export function locationMappingProgress(
  locations: Location[],
  mappings: MappingSet,
): LocationMappingProgress {
  const unmapped = locations.filter(
    (l) => !mappings[locationMappingKey(l.id)]?.classId,
  );
  return {
    mapped: locations.length - unmapped.length,
    total: locations.length,
    unmapped,
  };
}
