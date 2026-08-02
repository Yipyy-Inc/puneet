import type { StaffProfile } from "@/types/facility-staff";
import type { Tables } from "@/types/database";

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

export function rowToStaffProfile(row: StaffRow): StaffProfileWithRowId {
  const details = (row.details ?? {}) as Record<string, unknown>;

  return {
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
