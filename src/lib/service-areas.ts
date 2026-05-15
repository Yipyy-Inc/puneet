import type {
  ServiceArea,
  StaffServiceAreaSchedule,
  TravelZone,
  ZipTaxRate,
} from "@/types/grooming";

export type ServiceAreaCheckResult =
  | { status: "covered"; area: ServiceArea }
  | { status: "not-covered"; closestAreas: ServiceArea[] }
  | { status: "needs-review"; reason: string };

/**
 * Returns service areas active on the given weekday (0=Sun … 6=Sat).
 */
export function getActiveServiceAreasForDay(
  areas: ServiceArea[],
  dayOfWeek: number,
): ServiceArea[] {
  return areas.filter(
    (a) => a.active && a.daysOfWeek.includes(dayOfWeek),
  );
}

/**
 * Normalise a postal/zip code for matching: uppercase, strip whitespace.
 * Canadian postal codes match on the first three chars (FSA prefix) when the
 * area lists prefixes — e.g., "H2P 1A3" matches against "H2P".
 */
function normalisePostal(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "");
}

function postalCodeMatches(
  clientCode: string,
  areaCode: string,
): boolean {
  const c = normalisePostal(clientCode);
  const a = normalisePostal(areaCode);
  if (c === a) return true;
  // Prefix match (FSA / zip-prefix): area code can be a shorter prefix.
  return a.length >= 3 && c.startsWith(a);
}

/**
 * Check whether a client postal code is covered on `dayOfWeek` by any active
 * service area. Radius areas return "needs-review" since precise coverage
 * requires geocoding the address.
 */
export function checkPostalCodeOnDay(
  areas: ServiceArea[],
  postalCode: string,
  dayOfWeek: number,
): ServiceAreaCheckResult {
  const todayAreas = getActiveServiceAreasForDay(areas, dayOfWeek);
  if (todayAreas.length === 0) {
    return { status: "not-covered", closestAreas: [] };
  }
  for (const area of todayAreas) {
    if (area.type === "postal" && area.postalCodes) {
      if (area.postalCodes.some((pc) => postalCodeMatches(postalCode, pc))) {
        return { status: "covered", area };
      }
    }
  }
  // No explicit postal hit. If any radius area is active that day, defer to
  // human review rather than rejecting outright.
  if (todayAreas.some((a) => a.type === "radius")) {
    return {
      status: "needs-review",
      reason:
        "Address falls under a radius-based area — confirm with manual review.",
    };
  }
  return { status: "not-covered", closestAreas: todayAreas };
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Compact summary of which days an area is active. Collapses consecutive days
 * into ranges: e.g., [1,2,3,5] → "Mon–Wed, Fri".
 */
export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 0) return "Never";
  if (days.length === 7) return "Daily";
  const sorted = [...days].sort((a, b) => a - b);
  const ranges: number[][] = [];
  for (const d of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last[last.length - 1] === d - 1) last.push(d);
    else ranges.push([d]);
  }
  return ranges
    .map((r) =>
      r.length === 1
        ? DAY_SHORT[r[0]]
        : `${DAY_SHORT[r[0]]}–${DAY_SHORT[r[r.length - 1]]}`,
    )
    .join(", ");
}

export { DAY_SHORT };

// ============================================================================
// Certain Area for Certain Days — staff-level area resolution
// ============================================================================

/**
 * Resolve the area a staff member covers on `dateStr` (YYYY-MM-DD). Date
 * overrides win; otherwise falls back to the weekly template for the date's
 * day-of-week. Returns null when the staff has no area assigned that day
 * (off / unassigned).
 */
export function getStaffAreaIdForDate(
  schedule: StaffServiceAreaSchedule | undefined,
  dateStr: string,
): string | null {
  if (!schedule) return null;
  // Override wins, even when explicitly set to null (= staff is off that day).
  if (Object.prototype.hasOwnProperty.call(schedule.dateOverrides, dateStr)) {
    return schedule.dateOverrides[dateStr];
  }
  const dow = new Date(dateStr + "T00:00:00").getDay();
  return schedule.weeklyTemplate[String(dow)] ?? null;
}

/**
 * Resolve the ServiceArea object a staff covers on `dateStr`, or null when
 * none assigned (or the assigned area no longer exists / is inactive).
 */
export function getStaffAreaForDate(
  staffId: string,
  dateStr: string,
  schedules: StaffServiceAreaSchedule[],
  areas: ServiceArea[],
): ServiceArea | null {
  const schedule = schedules.find((s) => s.staffId === staffId);
  const areaId = getStaffAreaIdForDate(schedule, dateStr);
  if (!areaId) return null;
  const area = areas.find((a) => a.id === areaId && a.active);
  return area ?? null;
}

/**
 * All distinct ServiceAreas the team is covering on `dateStr`. Used by the
 * customer-facing booking flow to filter "what areas can I book today?".
 * When no schedules exist for a date, falls back to the legacy area-level
 * daysOfWeek setting so existing facilities keep working.
 */
export function getActiveAreasForDate(
  dateStr: string,
  schedules: StaffServiceAreaSchedule[],
  areas: ServiceArea[],
): ServiceArea[] {
  const seen = new Set<string>();
  const out: ServiceArea[] = [];
  for (const schedule of schedules) {
    const areaId = getStaffAreaIdForDate(schedule, dateStr);
    if (!areaId || seen.has(areaId)) continue;
    const area = areas.find((a) => a.id === areaId && a.active);
    if (area) {
      seen.add(areaId);
      out.push(area);
    }
  }
  if (out.length > 0) return out;
  // Legacy fallback: when no staff schedules are defined, use the area-level
  // weekday flag so we don't regress facilities that haven't configured CAfCD.
  const dow = new Date(dateStr + "T00:00:00").getDay();
  return getActiveServiceAreasForDay(areas, dow);
}

/**
 * Staff-aware coverage check. When `certainAreaEnabled` is true and a
 * `stylistId` is provided, coverage is restricted to that staff's scheduled
 * area for the date. Falls back to the area-level day check otherwise.
 */
export function checkCoverageForStaffOnDate(args: {
  postalCode: string;
  dateStr: string;
  staffId: string | undefined;
  certainAreaEnabled: boolean;
  schedules: StaffServiceAreaSchedule[];
  areas: ServiceArea[];
}): ServiceAreaCheckResult {
  const { postalCode, dateStr, staffId, certainAreaEnabled, schedules, areas } =
    args;
  if (certainAreaEnabled && staffId) {
    const area = getStaffAreaForDate(staffId, dateStr, schedules, areas);
    if (!area) {
      return {
        status: "not-covered",
        closestAreas: [],
      };
    }
    if (area.type === "postal" && area.postalCodes) {
      const matched = area.postalCodes.some((pc) =>
        postalCodeMatches(postalCode, pc),
      );
      return matched
        ? { status: "covered", area }
        : { status: "not-covered", closestAreas: [area] };
    }
    return {
      status: "needs-review",
      reason: `${area.name} is a radius area — confirm with manual review.`,
    };
  }
  // Legacy path: check by area-level daysOfWeek.
  const dow = new Date(dateStr + "T00:00:00").getDay();
  return checkPostalCodeOnDay(areas, postalCode, dow);
}

// ============================================================================
// Mobile-grooming travel zones + ZIP-code tax
// ============================================================================

/**
 * Deterministic mock distance estimate (in miles) from the facility's base
 * postal/ZIP prefix to a client postal code. Real implementation would
 * geocode both addresses and compute haversine distance; this hash gives
 * the demo plausible, stable numbers without external services.
 */
export function estimatePostalDistanceMiles(
  basePostalCode: string,
  clientPostalCode: string,
): number {
  const fa = basePostalCode.toUpperCase().replace(/\s+/g, "").slice(0, 3);
  const fb = clientPostalCode.toUpperCase().replace(/\s+/g, "").slice(0, 3);
  if (fa === fb) return 2;
  let diff = 0;
  for (let i = 0; i < 3; i++) {
    diff += Math.abs((fa.charCodeAt(i) || 0) - (fb.charCodeAt(i) || 0));
  }
  // Spread into 3–30 mile range so all three demo zones get exercised.
  return Math.min(30, 3 + (diff % 28));
}

/**
 * Resolve the travel zone a client falls into. Zones are evaluated in
 * `maxMiles` ascending order so the tightest matching bracket wins. Inactive
 * zones are skipped. Returns null when no active zone covers the distance.
 */
export function findZoneForDistance(
  zones: TravelZone[],
  distanceMiles: number,
): TravelZone | null {
  const sorted = zones
    .filter((z) => z.active)
    .sort((a, b) => a.maxMiles - b.maxMiles);
  for (const zone of sorted) {
    if (distanceMiles <= zone.maxMiles) return zone;
  }
  return null;
}

/** Compute the dollar surcharge a zone applies to a given service subtotal. */
export function computeZoneSurcharge(
  zone: TravelZone | null | undefined,
  serviceSubtotal: number,
): number {
  if (!zone) return 0;
  if (zone.surchargeMode === "flat") return zone.surchargeAmount;
  return Math.round(serviceSubtotal * zone.surchargeAmount) / 100;
}

/**
 * Longest-prefix-wins lookup of a ZIP/postal tax rate. Falls back to the
 * row flagged `isDefault: true` (or null if none flagged).
 */
export function findZipTaxRate(
  rates: ZipTaxRate[],
  postalCode: string,
): ZipTaxRate | null {
  if (!postalCode) {
    return rates.find((r) => r.isDefault) ?? null;
  }
  const norm = postalCode.toUpperCase().replace(/\s+/g, "");
  const candidates = rates
    .filter((r) => norm.startsWith(r.prefix.toUpperCase().replace(/\s+/g, "")))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  return candidates[0] ?? rates.find((r) => r.isDefault) ?? null;
}

export type BookingTotalsBreakdown = {
  /** Sum of all pet-line prices, before add-ons. */
  serviceSubtotal: number;
  /** Sum of add-on prices. */
  addOnTotal: number;
  /** Zone surcharge (0 when not mobile or no zone matches). */
  zoneSurcharge: number;
  zone: TravelZone | null;
  /** Pre-tax subtotal = serviceSubtotal + addOnTotal + zoneSurcharge. */
  preTaxSubtotal: number;
  /** Effective tax rate applied (decimal — e.g. 0.14975 for 14.975%). */
  taxRate: number;
  /** Tax rule used (null when override is in effect). */
  appliedRate: ZipTaxRate | null;
  taxAmount: number;
  total: number;
  /**
   * Source of the tax rate — "zip" for an automatic prefix match, "default"
   * for the global fallback, "override" when staff manually set a rate, and
   * "none" when no rate could be determined (treated as 0% tax).
   */
  taxSource: "zip" | "default" | "override" | "none";
};

/**
 * Compute the complete booking totals breakdown. Spec calculation order:
 *   tax = (service + zone surcharge) × tax rate
 * so the zone surcharge IS taxable. Add-ons are included in the pre-tax
 * subtotal too — they're a line item the facility charges, so they should
 * be taxed the same way.
 */
export function computeBookingTotals(args: {
  serviceSubtotal: number;
  addOnTotal: number;
  isMobile: boolean;
  basePostalCode?: string;
  clientPostalCode?: string;
  zones: TravelZone[];
  zipTaxRates: ZipTaxRate[];
  /** When set, replaces the auto-resolved tax rate entirely. */
  manualTaxRatePercent?: number | null;
}): BookingTotalsBreakdown {
  const {
    serviceSubtotal,
    addOnTotal,
    isMobile,
    basePostalCode,
    clientPostalCode,
    zones,
    zipTaxRates,
    manualTaxRatePercent,
  } = args;

  let zone: TravelZone | null = null;
  if (isMobile && basePostalCode && clientPostalCode) {
    const miles = estimatePostalDistanceMiles(
      basePostalCode,
      clientPostalCode,
    );
    zone = findZoneForDistance(zones, miles);
  }
  const zoneSurcharge = computeZoneSurcharge(zone, serviceSubtotal);
  const preTaxSubtotal = serviceSubtotal + addOnTotal + zoneSurcharge;

  let taxRate = 0;
  let appliedRate: ZipTaxRate | null = null;
  let taxSource: BookingTotalsBreakdown["taxSource"] = "none";

  if (manualTaxRatePercent !== undefined && manualTaxRatePercent !== null) {
    taxRate = manualTaxRatePercent / 100;
    taxSource = "override";
  } else if (clientPostalCode) {
    const match = findZipTaxRate(zipTaxRates, clientPostalCode);
    if (match) {
      taxRate = match.ratePercent / 100;
      appliedRate = match;
      taxSource = match.isDefault ? "default" : "zip";
    }
  } else {
    const fallback = zipTaxRates.find((r) => r.isDefault);
    if (fallback) {
      taxRate = fallback.ratePercent / 100;
      appliedRate = fallback;
      taxSource = "default";
    }
  }

  const taxAmount = Math.round(preTaxSubtotal * taxRate * 100) / 100;
  const total = Math.round((preTaxSubtotal + taxAmount) * 100) / 100;

  return {
    serviceSubtotal,
    addOnTotal,
    zoneSurcharge,
    zone,
    preTaxSubtotal,
    taxRate,
    appliedRate,
    taxAmount,
    total,
    taxSource,
  };
}
