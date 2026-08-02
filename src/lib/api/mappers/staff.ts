import type { StaffProfile } from "@/types/facility-staff";
import type { Tables, TablesInsert } from "@/types/database";

// ============================================================================
// Database row -> the StaffProfile the app already expects.
//
// Same split as clients and bookings: queryable fields are columns, the long
// tail lives in `details`. Here that tail is payroll, employment, clock-in
// rules, notification preferences and permission overrides — none of which any
// list query filters on, and all of which the profile screen needs whole.
//
// `id` maps from `legacy_id`, the "fs-*" string the app uses everywhere. The
// uuid is carried as `rowId` for writes. That is what lets the 47 files still
// importing the mock array move over one at a time rather than in a single
// commit nobody can review.
// ============================================================================

type StaffRow = Tables<"staff">;

export type StaffProfileWithRowId = StaffProfile & { rowId: string };

/**
 * Defaults for the `details` fields StaffProfile declares as REQUIRED.
 *
 * `details` is a JSON blob, so the database cannot promise any of them, and
 * the cast at the end of this function was promising all of them anyway. Rows
 * seeded from the mock array happen to carry them; a row created through
 * POST /api/staff, or the dev-account rows, do not.
 *
 * That gap is not theoretical — it crashed the staff directory the moment it
 * started reading Postgres: `profile.assignedLocations.map(...)` on a row
 * without the key. Guarding at each of the twenty-odd call sites would be
 * whack-a-mole; the honest fix is to make the type's promise true HERE, once,
 * where the promise is made.
 *
 * Note what is deliberately NOT in this list: `payroll` and
 * `permissionOverrides`. Those are optional in the type because absent means
 * WITHHELD, and defaulting them would turn a redaction into "$0/hr" and
 * "no overrides".
 */
const DETAIL_DEFAULTS = {
  assignedLocations: [] as string[],
  calendarAccess: { mode: "all" } as StaffProfile["calendarAccess"],
  clockIn: { requireAccessCode: false } as StaffProfile["clockIn"],
  notifications: {} as StaffProfile["notifications"],
  employment: {
    hireDate: "",
    employmentType: "",
  } as StaffProfile["employment"],
  upcomingAppointments: 0,
  openTasks: 0,
} satisfies Partial<StaffProfile>;

export function rowToStaffProfile(row: StaffRow): StaffProfileWithRowId {
  const details = (row.details ?? {}) as Record<string, unknown>;

  return {
    ...DETAIL_DEFAULTS,
    ...(details as Partial<StaffProfile>),
    rowId: row.id,
    id: row.legacy_id ?? row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? "",
    jobTitle: row.job_title ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    colorHex: row.color_hex ?? "#64748B",
    primaryRole: row.primary_role,
    additionalRoles: row.additional_roles ?? [],
    serviceAssignments: row.service_assignments ?? [],
    status: row.status as StaffProfile["status"],
    statusChangedAt: row.status_changed_at ?? undefined,
    statusReason: row.status_reason ?? undefined,
    statusNote: row.status_note ?? undefined,
    showOnCalendar: row.show_on_calendar,
    lastActive: row.last_active ?? "",
  } as StaffProfileWithRowId;
}

export const STAFF_SELECT = `*` as const;

// ── The way back ────────────────────────────────────────────────────────────
// Mirrors rowToStaffProfile. Fields that are COLUMNS are written as columns;
// everything else is the `details` tail, exactly as the read direction assumes.
//
// Only what it is GIVEN is mapped, so a partial update stays partial. That
// matters more here than elsewhere: this shape carries payroll and permission
// overrides, and a full-replace mapper would blank whichever of them the
// caller left out.
const COLUMN_FIELDS = [
  "id",
  "rowId",
  "firstName",
  "lastName",
  "email",
  "phone",
  "jobTitle",
  "avatarUrl",
  "colorHex",
  "primaryRole",
  "additionalRoles",
  "serviceAssignments",
  "status",
  "statusChangedAt",
  "statusReason",
  "statusNote",
  "showOnCalendar",
  "lastActive",
];

/**
 * `""` is not a timestamp, and it is what comes back out of the read mapper.
 *
 * `rowToStaffProfile` turns a null `last_active` into an empty string, because
 * the client type says `lastActive: string`. Round-trip that — read a profile,
 * change a phone number, send it back — and Postgres is asked to store `""` in
 * a `timestamptz`, which is a 500 rather than a null.
 *
 * It only bites on staff who have never been active, which is why the first
 * test to hit it was the one editing a dev account rather than a seeded one.
 */
function timestampOrNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export function staffToRow(
  input: Partial<StaffProfile>,
  context: { facilityId?: string; legacyId?: string },
): Partial<TablesInsert<"staff">> {
  const row: Partial<TablesInsert<"staff">> = {};

  if (context.facilityId) row.facility_id = context.facilityId;
  if (context.legacyId) row.legacy_id = context.legacyId;

  if (input.firstName !== undefined) row.first_name = input.firstName;
  if (input.lastName !== undefined) row.last_name = input.lastName;
  if (input.email !== undefined) row.email = input.email;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.jobTitle !== undefined) row.job_title = input.jobTitle;
  if (input.avatarUrl !== undefined) row.avatar_url = input.avatarUrl;
  if (input.colorHex !== undefined) row.color_hex = input.colorHex;
  if (input.primaryRole !== undefined) row.primary_role = input.primaryRole;
  if (input.additionalRoles !== undefined) {
    row.additional_roles = input.additionalRoles;
  }
  if (input.serviceAssignments !== undefined) {
    row.service_assignments = input.serviceAssignments;
  }
  if (input.status !== undefined) row.status = input.status;
  if (input.statusChangedAt !== undefined) {
    row.status_changed_at = timestampOrNull(input.statusChangedAt);
  }
  if (input.statusReason !== undefined) row.status_reason = input.statusReason;
  if (input.statusNote !== undefined) row.status_note = input.statusNote;
  if (input.showOnCalendar !== undefined) {
    row.show_on_calendar = input.showOnCalendar;
  }
  if (input.lastActive !== undefined) {
    row.last_active = timestampOrNull(input.lastActive);
  }

  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!COLUMN_FIELDS.includes(key) && value !== undefined) {
      details[key] = value;
    }
  }
  if (Object.keys(details).length > 0) {
    row.details = details as TablesInsert<"staff">["details"];
  }

  return row;
}

// ============================================================================
// Redaction — because RLS gates rows, not columns.
//
// Every staff member can read their colleagues' rows, and that is deliberate:
// rotas, calendars and handovers are unusable otherwise. Being able to see
// that a groomer exists is not the sensitive part. What rides along in
// `details` is: what they are paid, the free-text HR notes about them, the
// code they clock in with, and the individual permission grants that describe
// how the facility's access control is put together.
//
// So the row is the right unit for the database and the wrong unit for the
// response. This trims the response to what the caller may see.
//
// TWO RULES SHAPE ALL OF IT:
//
//   • You always see your OWN record in full. Your pay is yours; your clock-in
//     code is one you type in yourself. Withholding it would be theatre.
//
//   • Withheld means ABSENT, never zeroed. A `hourlyRate: 0` in the response
//     is indistinguishable from an unpaid volunteer, and the UI would render
//     "$0/hr" as fact. `undefined` is the only value that cannot be mistaken
//     for an answer, which is why the fields below are optional in the type.
// ============================================================================

export interface StaffFieldGrants {
  /** `view_payroll` — commission, hourly rate, tips. */
  payroll: boolean;
  /** `view_staff_permissions` — the per-person permission overrides. */
  permissions: boolean;
  /** `manage_staff` — HR notes, status notes, and the clock-in access code. */
  hr: boolean;
}

/**
 * A colleague's profile, trimmed to what `grants` allows.
 *
 * `isSelf` short-circuits everything: it is your own record.
 */
export function redactStaffProfile<T extends StaffProfile>(
  profile: T,
  grants: StaffFieldGrants,
  isSelf: boolean,
): T {
  if (isSelf) return profile;

  const out = { ...profile };

  if (!grants.payroll) delete out.payroll;
  if (!grants.permissions) delete out.permissionOverrides;

  if (!grants.hr) {
    // Free text written ABOUT this person by a manager — the termination note
    // especially. Never a directory field.
    delete out.statusNote;
    if (out.employment)
      out.employment = { ...out.employment, notes: undefined };
    // Whether a code is required is roster information and stays. The code
    // itself is a shared secret that clocks this person in.
    if (out.clockIn?.accessCode) {
      out.clockIn = { ...out.clockIn, accessCode: undefined };
    }
  }

  return out;
}
