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
