import "server-only";

import { holds, myPermissions } from "@/lib/auth/permissions";
import {
  redactStaffProfile,
  rowToStaffProfile,
  type StaffProfileWithRowId,
} from "@/lib/api/mappers/staff";
import type { Tables } from "@/types/database";

// ============================================================================
// One place that turns a staff row into a response.
//
// Every route that returns a staff record has to trim it the same way, and
// "the same way" is not something to reimplement per handler. The write path
// is the easy one to forget: POST and PATCH both echo the row back, so a
// handler that skips this hands payroll to a caller the GET route was
// carefully keeping it from. Same data, same person, different verb.
//
// The redaction rules themselves live in mappers/staff.ts; this resolves the
// permissions behind them once and applies them.
// ============================================================================

export interface StaffResponder {
  /** Trim one row to what the caller may see. */
  toResponse: (row: Tables<"staff">) => StaffProfileWithRowId;
}

/**
 * Resolve the caller's grants once, then reuse them per row.
 *
 * `email` is the caller's VERIFIED session email, used to spot their own
 * record — you always see yourself in full. Lowercased on both sides because
 * the staff table does not constrain case, and a mismatch fails safe: you get
 * redacted from your own record, which is confusing but not a leak.
 */
export async function staffResponder(
  email: string | null | undefined,
): Promise<StaffResponder> {
  const permissions = await myPermissions();
  const grants = {
    payroll: holds(permissions, "view_payroll"),
    permissions: holds(permissions, "view_staff_permissions"),
    hr: holds(permissions, "manage_staff"),
  };
  const self = email?.trim().toLowerCase();

  return {
    toResponse(row) {
      const profile = rowToStaffProfile(row);
      const isSelf =
        self != null && profile.email?.trim().toLowerCase() === self;
      return redactStaffProfile(profile, grants, isSelf);
    },
  };
}
