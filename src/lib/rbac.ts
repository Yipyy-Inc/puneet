import type { UserRole } from "@/types/scheduling";

// ============================================================================
// Role-Based Access Control
// ============================================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  general_manager: "General Manager",
  department_manager: "Department Manager",
  supervisor: "Supervisor",
  employee: "Employee",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Full access to every module and setting.",
  general_manager:
    "Full access to schedules, staff, reports across all departments.",
  department_manager: "Manage their department's schedule, staff, requests.",
  supervisor: "View their team, post open shifts, approve simple requests.",
  employee: "View own schedule, request swaps and time off.",
};

/** Higher value = more privilege. Used for `roleAtLeast` ordering checks. */
export const ROLE_RANK: Record<UserRole, number> = {
  employee: 1,
  supervisor: 2,
  department_manager: 3,
  general_manager: 4,
  owner: 5,
};

/** Granular capabilities — gate UI and actions on these, not raw role names. */
export type Permission =
  | "schedule.view"
  | "schedule.edit"
  | "schedule.publish"
  | "shift.assign"
  | "shift.delete"
  | "shift.swap.approve"
  | "timeoff.approve"
  | "availability.approve"
  | "openshift.post"
  | "openshift.approve_claim"
  | "employee.view"
  | "employee.edit"
  | "employee.create"
  | "department.manage"
  | "position.manage"
  | "skill.manage"
  | "report.view"
  | "report.export"
  | "settings.manage"
  | "rbac.manage"
  | "company.manage"
  | "attendance.view"
  | "attendance.edit"
  | "messaging.broadcast"
  | "messaging.send"
  | "payroll.view"
  | "boarding.feeding.view"
  | "boarding.feeding.manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // Owner gets everything
    "schedule.view",
    "schedule.edit",
    "schedule.publish",
    "shift.assign",
    "shift.delete",
    "shift.swap.approve",
    "timeoff.approve",
    "availability.approve",
    "openshift.post",
    "openshift.approve_claim",
    "employee.view",
    "employee.edit",
    "employee.create",
    "department.manage",
    "position.manage",
    "skill.manage",
    "report.view",
    "report.export",
    "settings.manage",
    "rbac.manage",
    "company.manage",
    "attendance.view",
    "attendance.edit",
    "messaging.broadcast",
    "messaging.send",
    "payroll.view",
    "boarding.feeding.view",
    "boarding.feeding.manage",
  ],
  general_manager: [
    "schedule.view",
    "schedule.edit",
    "schedule.publish",
    "shift.assign",
    "shift.delete",
    "shift.swap.approve",
    "timeoff.approve",
    "availability.approve",
    "openshift.post",
    "openshift.approve_claim",
    "employee.view",
    "employee.edit",
    "employee.create",
    "department.manage",
    "position.manage",
    "skill.manage",
    "report.view",
    "report.export",
    "settings.manage",
    "attendance.view",
    "attendance.edit",
    "messaging.broadcast",
    "messaging.send",
    "payroll.view",
    "boarding.feeding.view",
    "boarding.feeding.manage",
  ],
  department_manager: [
    "schedule.view",
    "schedule.edit",
    "schedule.publish",
    "shift.assign",
    "shift.delete",
    "shift.swap.approve",
    "timeoff.approve",
    "availability.approve",
    "openshift.post",
    "openshift.approve_claim",
    "employee.view",
    "employee.edit",
    "report.view",
    "attendance.view",
    "messaging.send",
    "payroll.view",
    "boarding.feeding.view",
    "boarding.feeding.manage",
  ],
  supervisor: [
    "schedule.view",
    "shift.assign",
    "openshift.post",
    "openshift.approve_claim",
    "employee.view",
    "attendance.view",
    "messaging.send",
    "boarding.feeding.view",
  ],
  employee: ["schedule.view", "employee.view"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Convenience: returns true when the user's role rank ≥ the minimum role's rank. */
export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** All permissions for a role (read-only copy). */
export function permissionsFor(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
