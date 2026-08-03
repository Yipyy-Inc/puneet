import type {
  GroomingWaitlistEntry,
  GroomingWaitlistStatus,
  WaitlistExpectedDate,
  WaitlistExpectedTime,
  WaitlistSource,
} from "@/data/grooming-waitlist";

// ============================================================================
// grooming_waitlist_entries → the GroomingWaitlistEntry the screens read.
//
// ── THE LEGACY FIELDS ARE NEVER EMITTED ────────────────────────────────────
//
// `date`/`expectedDate`, `preferredTimeWindow`/`expectedTime`,
// `preferredStylistName`/`preferredStylistIds` and `notes`/`comment` are four
// legacy-vs-structured pairs on the type. The table stores only the structured
// half (20260806100000, Decision 1), so this mapper emits only the structured
// half. The optional legacy fields stay on the TYPE — nothing here fills them.
//
// `date` is the exception that proves the rule: it is required by the type and
// it is not the legacy twin of `expectedDate`, it is `anchor_date` — the one
// day the calendar hangs its per-day count on, derived by the database from the
// preference. A rule and the first date the rule admits are two facts, not one
// fact twice.
//
// ── THE UNION IS REBUILT FROM ITS DISCRIMINANT ─────────────────────────────
//
// The table stores `expected_date_kind` plus the columns that kind uses, with a
// CHECK making every other combination impossible. So these two builders can
// read the kind and trust the payload: there is no row where `kind = 'range'`
// and the dates are missing, because the database refuses to hold one.
//
// ── preferredStylistIds CARRIES STAFF LEGACY IDS OUT OF HERE ───────────────
//
// Same seam as `rowToGroomingAppointment`: the screens compare against the mock
// `stylists` list (`stylist-002`), which links to staff via `staffId`. That
// mapping lives client-side in `stylistIdForStaff`, so this emits the STAFF
// legacy id and the query factory remaps. Teaching the server about a mock
// array to save one hop would put the seam in two places.
//
// The uuid→legacy_id half is passed IN rather than joined: `preferred_staff_ids`
// is a uuid[] column, and PostgREST embeds relationships, not arrays. The route
// reads the facility's staff once and hands down the lookup — one query for the
// page rather than one per row.
// ============================================================================

export interface WaitlistRow {
  id: string;
  legacy_id: string | null;
  pet_name: string;
  pet_breed: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string | null;
  service_name: string;
  anchor_date: string;
  expected_date_kind: string;
  expected_date: string | null;
  expected_days_of_week: number[] | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  excluded_dates: string[] | null;
  expected_time_kind: string;
  expected_period: string | null;
  expected_time: string | null;
  valid_until: string | null;
  postal_code: string | null;
  source: string;
  comment: string | null;
  status: string;
  offered_at: string | null;
  offered_until: string | null;
  offered_slot: string | null;
  added_at: string;
  preferred_staff_ids: string[] | null;
  client: { ref: number } | null;
  pet: { ref: number } | null;
}

function toExpectedDate(row: WaitlistRow): WaitlistExpectedDate {
  switch (row.expected_date_kind) {
    case "specific-date":
      return { kind: "specific-date", date: row.expected_date ?? "" };
    case "day-of-week":
      return {
        kind: "day-of-week",
        daysOfWeek: row.expected_days_of_week ?? [],
      };
    case "range":
      return {
        kind: "range",
        startDate: row.expected_start_date ?? "",
        endDate: row.expected_end_date ?? "",
      };
    default:
      return { kind: "asap" };
  }
}

function toExpectedTime(row: WaitlistRow): WaitlistExpectedTime {
  switch (row.expected_time_kind) {
    case "period":
      return {
        kind: "period",
        period: row.expected_period as "morning" | "afternoon" | "evening",
      };
    case "exact-time":
      // Postgres hands back HH:MM:SS; the matcher parses HH:MM and compares
      // minutes, so the seconds are dropped here rather than in four callers.
      return {
        kind: "exact-time",
        time: (row.expected_time ?? "").slice(0, 5),
      };
    default:
      return { kind: "anytime" };
  }
}

export function rowToWaitlistEntry(
  row: WaitlistRow,
  staffLegacyById: Map<string, string>,
): GroomingWaitlistEntry {
  return {
    id: row.legacy_id ?? row.id,
    date: row.anchor_date,
    ...(row.client ? { clientId: row.client.ref } : {}),
    ...(row.pet ? { petId: row.pet.ref } : {}),
    petName: row.pet_name,
    petBreed: row.pet_breed,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ...(row.owner_email ? { ownerEmail: row.owner_email } : {}),
    serviceName: row.service_name,
    expectedDate: toExpectedDate(row),
    expectedTime: toExpectedTime(row),
    ...(row.excluded_dates?.length
      ? { excludedDates: row.excluded_dates }
      : {}),
    // Staff legacy ids — remapped to stylist ids by the query factory. A
    // preferred groomer who has since left the facility drops out of the list
    // rather than becoming a dangling id: "anyone" is a better reading of an
    // unfillable preference than "somebody who does not work here".
    preferredStylistIds: (row.preferred_staff_ids ?? [])
      .map((id) => staffLegacyById.get(id))
      .filter((id): id is string => !!id),
    ...(row.valid_until ? { validUntil: row.valid_until } : {}),
    ...(row.postal_code ? { postalCode: row.postal_code } : {}),
    source: row.source as WaitlistSource,
    ...(row.comment ? { comment: row.comment } : {}),
    addedAt: row.added_at,
    status: row.status as GroomingWaitlistStatus,
    ...(row.offered_at ? { offeredAt: row.offered_at } : {}),
    ...(row.offered_until ? { offeredUntil: row.offered_until } : {}),
    ...(row.offered_slot ? { offeredSlot: row.offered_slot } : {}),
  };
}

/**
 * uuid → staff legacy id, for every staff row the caller can read.
 *
 * Lives here rather than in either route because both need it and routes must
 * not import each other. One query per request: a facility has tens of staff
 * and the alternative is a lookup per preferred groomer per entry.
 */
export function staffLegacyMap(
  rows: { id: string; legacy_id: string | null }[] | null,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows ?? []) {
    if (row.legacy_id) map.set(row.id, row.legacy_id);
  }
  return map;
}

/** The select the route issues. Beside the row type so the two cannot drift. */
export const WAITLIST_SELECT = `
  id, legacy_id, pet_name, pet_breed, owner_name, owner_phone, owner_email,
  service_name, anchor_date,
  expected_date_kind, expected_date, expected_days_of_week,
  expected_start_date, expected_end_date, excluded_dates,
  expected_time_kind, expected_period, expected_time,
  valid_until, postal_code, source, comment,
  status, offered_at, offered_until, offered_slot, added_at,
  preferred_staff_ids,
  client:client_id ( ref ),
  pet:pet_id ( ref )
` as const;
