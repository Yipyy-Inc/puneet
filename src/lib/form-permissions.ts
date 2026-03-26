/**
 * 8) Form Permissions — role-based access control for the forms module.
 *
 * Admin/Manager: create, edit, publish, configure mapping + logic, view all submissions
 * Staff: view submissions (if allowed), process submissions (if allowed), staff-assisted intake
 * Customer: view/submit forms they're allowed to access (controlled by FormAudience)
 */

import {
  type FacilityRole,
  type Permission,
  hasPermission,
  PERMISSION_LABELS,
} from "@/lib/role-utils";

// ---- Form permission helpers ----

export type FormPermission =
  | "forms_create"
  | "forms_edit"
  | "forms_publish"
  | "forms_configure_mapping"
  | "forms_configure_logic"
  | "forms_view_submissions"
  | "forms_process_submissions"
  | "forms_staff_assisted_intake";

/** All form permissions grouped by access tier */
export const FORM_PERMISSION_TIERS = {
  "Admin / Manager": [
    "forms_create",
    "forms_edit",
    "forms_publish",
    "forms_configure_mapping",
    "forms_configure_logic",
    "forms_view_submissions",
    "forms_process_submissions",
    "forms_staff_assisted_intake",
  ] as FormPermission[],
  Staff: [
    "forms_view_submissions",
    "forms_process_submissions",
    "forms_staff_assisted_intake",
  ] as FormPermission[],
  Customer: [] as FormPermission[], // Customer access is controlled by FormAudience, not permissions
};

/** Check if a facility role has a specific form permission */
export function hasFormPermission(
  role: FacilityRole,
  permission: FormPermission,
  userId?: string,
): boolean {
  return hasPermission(role, permission as Permission, userId);
}

/** Check if a role can create/edit forms (Admin/Manager level) */
export function canManageForms(role: FacilityRole, userId?: string): boolean {
  return (
    hasFormPermission(role, "forms_create", userId) &&
    hasFormPermission(role, "forms_edit", userId)
  );
}

/** Check if a role can configure mapping and logic rules */
export function canConfigureForms(
  role: FacilityRole,
  userId?: string,
): boolean {
  return (
    hasFormPermission(role, "forms_configure_mapping", userId) &&
    hasFormPermission(role, "forms_configure_logic", userId)
  );
}

/** Check if a role can publish forms */
export function canPublishForms(role: FacilityRole, userId?: string): boolean {
  return hasFormPermission(role, "forms_publish", userId);
}

/** Check if a role can view form submissions */
export function canViewSubmissions(
  role: FacilityRole,
  userId?: string,
): boolean {
  return hasFormPermission(role, "forms_view_submissions", userId);
}

/** Check if a role can process submissions (merge, link to customer) */
export function canProcessSubmissions(
  role: FacilityRole,
  userId?: string,
): boolean {
  return hasFormPermission(role, "forms_process_submissions", userId);
}

/** Check if a role can fill forms on behalf of a customer */
export function canDoStaffAssistedIntake(
  role: FacilityRole,
  userId?: string,
): boolean {
  return hasFormPermission(role, "forms_staff_assisted_intake", userId);
}

/** Get all form permissions for a role with labels */
export function getFormPermissionsForRole(
  role: FacilityRole,
  userId?: string,
): { permission: FormPermission; label: string; granted: boolean }[] {
  const allFormPerms: FormPermission[] = [
    "forms_create",
    "forms_edit",
    "forms_publish",
    "forms_configure_mapping",
    "forms_configure_logic",
    "forms_view_submissions",
    "forms_process_submissions",
    "forms_staff_assisted_intake",
  ];

  return allFormPerms.map((p) => ({
    permission: p,
    label: PERMISSION_LABELS[p as Permission] ?? p,
    granted: hasFormPermission(role, p, userId),
  }));
}

/** Get a summary of form access level for display */
export function getFormAccessLevel(
  role: FacilityRole,
  userId?: string,
): {
  level: "full" | "process" | "view" | "none";
  label: string;
  description: string;
} {
  if (canManageForms(role, userId)) {
    return {
      level: "full",
      label: "Full Access",
      description:
        "Create, edit, publish forms. Configure mapping & logic. View and process all submissions.",
    };
  }
  if (canProcessSubmissions(role, userId)) {
    return {
      level: "process",
      label: "Process & Intake",
      description:
        "View and process submissions. Fill forms on behalf of customers.",
    };
  }
  if (canViewSubmissions(role, userId)) {
    return {
      level: "view",
      label: "View Only",
      description:
        "View form submissions. Cannot create, edit, or process forms.",
    };
  }
  return {
    level: "none",
    label: "No Access",
    description: "No access to the forms module.",
  };
}
