"use client";

// Platform-level roles
export type UserRole = "super_admin" | "facility_admin";

// Facility-specific roles for granular access control
export type FacilityRole =
  | "owner"
  | "manager"
  | "front_desk"
  | "groomer"
  | "trainer"
  | "kennel_tech";

// All facility roles as an array (derived from the type)
export const ALL_FACILITY_ROLES: FacilityRole[] = [
  "owner",
  "manager",
  "front_desk",
  "groomer",
  "trainer",
  "kennel_tech",
];

// Role display names for UI
export const FACILITY_ROLE_LABELS: Record<FacilityRole, string> = {
  owner: "Owner/Admin",
  manager: "Manager",
  front_desk: "Front Desk",
  groomer: "Groomer",
  trainer: "Trainer",
  kennel_tech: "Kennel Tech",
};

// Role descriptions
export const FACILITY_ROLE_DESCRIPTIONS: Record<FacilityRole, string> = {
  owner: "Full facility access and configuration",
  manager: "Operational oversight with limited financial visibility",
  front_desk: "Client-facing operations: check-in/out, bookings, payments",
  groomer: "Grooming appointments and notes for assigned pets",
  trainer: "Training classes and progress notes for assigned pets",
  kennel_tech: "Daily pet care: kennel view, feeding schedules, report cards",
};

// Permission categories
export type Permission =
  // Navigation/Page Access
  | "view_dashboard"
  | "view_kennel"
  | "view_clients"
  | "view_bookings"
  | "view_staff"
  | "view_scheduling"
  | "view_services"
  | "view_petcams"
  | "view_daycare"
  | "view_boarding"
  | "view_grooming"
  | "view_training"
  | "view_retail"
  | "view_billing"
  | "view_inventory"
  | "view_reports"
  | "view_insights"
  | "view_marketing"
  | "view_communications"
  | "view_incidents"
  | "view_waivers"
  | "view_settings"
  // Actions
  | "create_booking"
  | "edit_booking"
  | "cancel_booking"
  | "check_in_out"
  | "take_payment"
  | "process_refund"
  | "apply_discount"
  | "manage_staff"
  | "manage_services"
  | "manage_pricing"
  | "manage_settings"
  | "add_pet_notes"
  | "add_grooming_notes"
  | "add_training_notes"
  | "view_financials"
  | "view_revenue"
  | "view_wages"
  | "view_client_lifetime_value"
  | "export_reports"
  | "send_marketing"
  | "manage_incidents"
  | "delete_records";

// Permissions for each facility role
export const ROLE_PERMISSIONS: Record<FacilityRole, Permission[]> = {
  owner: [
    // Full access to everything
    "view_dashboard",
    "view_kennel",
    "view_clients",
    "view_bookings",
    "view_staff",
    "view_scheduling",
    "view_services",
    "view_petcams",
    "view_daycare",
    "view_boarding",
    "view_grooming",
    "view_training",
    "view_retail",
    "view_billing",
    "view_inventory",
    "view_reports",
    "view_insights",
    "view_marketing",
    "view_communications",
    "view_incidents",
    "view_waivers",
    "view_settings",
    "create_booking",
    "edit_booking",
    "cancel_booking",
    "check_in_out",
    "take_payment",
    "process_refund",
    "apply_discount",
    "manage_staff",
    "manage_services",
    "manage_pricing",
    "manage_settings",
    "add_pet_notes",
    "add_grooming_notes",
    "add_training_notes",
    "view_financials",
    "view_revenue",
    "view_wages",
    "view_client_lifetime_value",
    "export_reports",
    "send_marketing",
    "manage_incidents",
    "delete_records",
  ],
  manager: [
    // Operational oversight, limited financial visibility
    "view_dashboard",
    "view_kennel",
    "view_clients",
    "view_bookings",
    "view_staff",
    "view_scheduling",
    "view_services",
    "view_petcams",
    "view_daycare",
    "view_boarding",
    "view_grooming",
    "view_training",
    "view_retail",
    "view_billing",
    "view_inventory",
    "view_reports",
    "view_insights",
    "view_marketing",
    "view_communications",
    "view_incidents",
    "view_waivers",
    "create_booking",
    "edit_booking",
    "cancel_booking",
    "check_in_out",
    "take_payment",
    "process_refund",
    "apply_discount",
    "manage_staff",
    "add_pet_notes",
    "add_grooming_notes",
    "add_training_notes",
    "view_financials",
    "view_revenue",
    // No view_wages - cannot see staff wages
    "view_client_lifetime_value",
    "export_reports",
    "send_marketing",
    "manage_incidents",
    // No manage_pricing, manage_settings, manage_services, delete_records
  ],
  front_desk: [
    // Client-facing operations
    "view_dashboard",
    "view_kennel",
    "view_clients",
    "view_bookings",
    "view_scheduling",
    "view_petcams",
    "view_daycare",
    "view_boarding",
    "view_grooming",
    "view_training",
    "view_retail",
    "view_billing",
    "view_communications",
    "view_incidents",
    "view_waivers",
    "create_booking",
    "edit_booking",
    "check_in_out",
    "take_payment",
    // No process_refund
    // No apply_discount
    "add_pet_notes",
    // No view_revenue, view_financials
  ],
  groomer: [
    // Grooming only
    "view_dashboard",
    "view_grooming",
    "view_petcams",
    "view_clients", // Limited - assigned pets only
    "view_scheduling",
    "add_grooming_notes",
    "add_pet_notes",
    "check_in_out",
  ],
  trainer: [
    // Training only
    "view_dashboard",
    "view_training",
    "view_petcams",
    "view_clients", // Limited - enrolled pets only
    "view_scheduling",
    "add_training_notes",
    "add_pet_notes",
    "check_in_out",
  ],
  kennel_tech: [
    // Daily pet care
    "view_dashboard",
    "view_kennel",
    "view_daycare",
    "view_boarding",
    "view_petcams",
    "view_clients", // Limited - pets in care only
    "view_scheduling",
    "add_pet_notes",
    "check_in_out",
  ],
};

// Navigation items mapped to permissions
export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/facility/dashboard": "view_dashboard",
  "/facility/dashboard/kennel-view": "view_kennel",
  "/facility/dashboard/clients": "view_clients",
  "/facility/dashboard/bookings": "view_bookings",
  "/facility/staff": "view_staff",
  "/facility/scheduling": "view_scheduling",
  "/facility/services": "view_services",
  "/facility/dashboard/petcams": "view_petcams",
  "/facility/dashboard/services/daycare": "view_daycare",
  "/facility/dashboard/services/boarding": "view_boarding",
  "/facility/dashboard/services/grooming": "view_grooming",
  "/facility/training": "view_training",
  "/facility/retail": "view_retail",
  "/facility/dashboard/billing": "view_billing",
  "/facility/inventory": "view_inventory",
  "/facility/dashboard/reports": "view_reports",
  "/facility/dashboard/insights": "view_insights",
  "/facility/dashboard/marketing": "view_marketing",
  "/facility/dashboard/communications": "view_communications",
  "/facility/dashboard/incidents": "view_incidents",
  "/facility/dashboard/waivers": "view_waivers",
  "/facility/dashboard/settings": "view_settings",
};

const ROLE_COOKIE_NAME = "user_role";
const FACILITY_ROLE_COOKIE_NAME = "facility_role";

// Get platform-level role
export function getUserRole(): UserRole | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const roleCookie = cookies.find((cookie) =>
    cookie.startsWith(`${ROLE_COOKIE_NAME}=`),
  );

  if (!roleCookie) return null;

  const role = roleCookie.split("=")[1] as UserRole;
  return role === "super_admin" || role === "facility_admin" ? role : null;
}

// Set platform-level role
export function setUserRole(role: UserRole): void {
  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; max-age=31536000`; // 1 year
}

// Get facility-specific role
export function getFacilityRole(): FacilityRole {
  if (typeof document === "undefined") return "owner";

  const cookies = document.cookie.split("; ");
  const roleCookie = cookies.find((cookie) =>
    cookie.startsWith(`${FACILITY_ROLE_COOKIE_NAME}=`),
  );

  if (!roleCookie) return "owner"; // Default to owner for backward compatibility

  const role = roleCookie.split("=")[1] as FacilityRole;
  return ALL_FACILITY_ROLES.includes(role) ? role : "owner";
}

// Set facility-specific role
export function setFacilityRole(role: FacilityRole): void {
  if (typeof document === "undefined") return;

  document.cookie = `${FACILITY_ROLE_COOKIE_NAME}=${role}; path=/; max-age=31536000`; // 1 year
}

// Check if a role has a specific permission
export function hasPermission(
  role: FacilityRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Check if a role can access a specific route
export function canAccessRoute(role: FacilityRole, route: string): boolean {
  const permission = NAV_PERMISSIONS[route];
  if (!permission) return true; // If no permission defined, allow access
  return hasPermission(role, permission);
}

// Get all permissions for a role
export function getRolePermissions(role: FacilityRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}
