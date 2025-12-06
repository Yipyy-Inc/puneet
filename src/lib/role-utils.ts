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
  trainer: "Training sessions and progress notes for assigned pets",
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
  | "delete_records"
  | "manage_permissions";

// Permission display labels
export const PERMISSION_LABELS: Record<Permission, string> = {
  view_dashboard: "View Dashboard",
  view_kennel: "View Kennel",
  view_clients: "View Clients",
  view_bookings: "View Bookings",
  view_staff: "View Staff",
  view_scheduling: "View Scheduling",
  view_services: "View Services",
  view_petcams: "View Pet Cams",
  view_daycare: "View Daycare",
  view_boarding: "View Boarding",
  view_grooming: "View Grooming",
  view_training: "View Training",
  view_retail: "View Retail",
  view_billing: "View Billing",
  view_inventory: "View Inventory",
  view_reports: "View Reports",
  view_insights: "View Insights",
  view_marketing: "View Marketing",
  view_communications: "View Communications",
  view_incidents: "View Incidents",
  view_waivers: "View Waivers",
  view_settings: "View Settings",
  create_booking: "Create Booking",
  edit_booking: "Edit Booking",
  cancel_booking: "Cancel Booking",
  check_in_out: "Check In/Out",
  take_payment: "Take Payment",
  process_refund: "Process Refund",
  apply_discount: "Apply Discount",
  manage_staff: "Manage Staff",
  manage_services: "Manage Services",
  manage_pricing: "Manage Pricing",
  manage_settings: "Manage Settings",
  add_pet_notes: "Add Pet Notes",
  add_grooming_notes: "Add Grooming Notes",
  add_training_notes: "Add Training Notes",
  view_financials: "View Financials",
  view_revenue: "View Revenue",
  view_wages: "View Wages",
  view_client_lifetime_value: "View Client Lifetime Value",
  export_reports: "Export Reports",
  send_marketing: "Send Marketing",
  manage_incidents: "Manage Incidents",
  delete_records: "Delete Records",
  manage_permissions: "Manage Permissions",
};

// Permission categories for grouping in UI
export const PERMISSION_CATEGORIES: Record<string, Permission[]> = {
  "Navigation Access": [
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
  ],
  "Booking Actions": [
    "create_booking",
    "edit_booking",
    "cancel_booking",
    "check_in_out",
  ],
  "Financial Actions": [
    "take_payment",
    "process_refund",
    "apply_discount",
    "view_financials",
    "view_revenue",
    "view_wages",
    "view_client_lifetime_value",
  ],
  Management: [
    "manage_staff",
    "manage_services",
    "manage_pricing",
    "manage_settings",
    "manage_incidents",
    "manage_permissions",
    "delete_records",
  ],
  "Pet Care": ["add_pet_notes", "add_grooming_notes", "add_training_notes"],
  "Reports & Marketing": ["export_reports", "send_marketing"],
};

// Default permissions for each facility role (used as baseline)
export const DEFAULT_ROLE_PERMISSIONS: Record<FacilityRole, Permission[]> = {
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
    "manage_permissions",
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

// Storage keys
const ROLE_COOKIE_NAME = "user_role";
const FACILITY_ROLE_COOKIE_NAME = "facility_role";
const CUSTOM_ROLE_PERMISSIONS_KEY = "facility_custom_role_permissions";
const USER_PERMISSION_OVERRIDES_KEY = "facility_user_permission_overrides";
const CURRENT_USER_ID_KEY = "facility_current_user_id";

// Types for custom permissions
export interface UserPermissionOverride {
  userId: string;
  userName: string;
  role: FacilityRole;
  addedPermissions: Permission[];
  removedPermissions: Permission[];
}

// Get custom role permissions from localStorage
export function getCustomRolePermissions(): Record<
  FacilityRole,
  Permission[]
> | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(CUSTOM_ROLE_PERMISSIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error("Failed to parse custom role permissions");
  }
  return null;
}

// Save custom role permissions to localStorage
export function saveCustomRolePermissions(
  permissions: Record<FacilityRole, Permission[]>,
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CUSTOM_ROLE_PERMISSIONS_KEY,
      JSON.stringify(permissions),
    );
  } catch {
    console.error("Failed to save custom role permissions");
  }
}

// Get user permission overrides from localStorage
export function getUserPermissionOverrides(): UserPermissionOverride[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(USER_PERMISSION_OVERRIDES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error("Failed to parse user permission overrides");
  }
  return [];
}

// Save user permission overrides to localStorage
export function saveUserPermissionOverrides(
  overrides: UserPermissionOverride[],
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      USER_PERMISSION_OVERRIDES_KEY,
      JSON.stringify(overrides),
    );
  } catch {
    console.error("Failed to save user permission overrides");
  }
}

// Get effective role permissions (custom or default)
function getRolePermissions(role: FacilityRole): Permission[] {
  const custom = getCustomRolePermissions();
  if (custom && custom[role]) {
    return custom[role];
  }
  return DEFAULT_ROLE_PERMISSIONS[role];
}

// Get current user ID
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_USER_ID_KEY);
}

// Set current user ID
export function setCurrentUserId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_USER_ID_KEY, userId);
}

// Get effective permissions for a user (role + overrides)
export function getEffectivePermissions(
  role: FacilityRole,
  userId?: string,
): Permission[] {
  // Start with role permissions
  const permissions = new Set(getRolePermissions(role));

  // Apply user-specific overrides if userId provided
  if (userId) {
    const overrides = getUserPermissionOverrides();
    const userOverride = overrides.find((o) => o.userId === userId);

    if (userOverride) {
      // Add extra permissions
      userOverride.addedPermissions.forEach((p) => permissions.add(p));
      // Remove restricted permissions
      userOverride.removedPermissions.forEach((p) => permissions.delete(p));
    }
  }

  return Array.from(permissions);
}

// Navigation items mapped to permissions
const NAV_PERMISSIONS: Record<string, Permission> = {
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

// Check if a role has a specific permission (uses configurable permissions)
export function hasPermission(
  role: FacilityRole,
  permission: Permission,
  userId?: string,
): boolean {
  const effectivePermissions = getEffectivePermissions(role, userId);
  return effectivePermissions.includes(permission);
}

// Check if a role can access a specific route
export function canAccessRoute(
  role: FacilityRole,
  route: string,
  userId?: string,
): boolean {
  const permission = NAV_PERMISSIONS[route];
  if (!permission) return true; // If no permission defined, allow access
  return hasPermission(role, permission, userId);
}

// Reset role permissions to defaults
export function resetRolePermissions(role?: FacilityRole): void {
  if (typeof window === "undefined") return;

  if (role) {
    const custom = getCustomRolePermissions() || {
      ...DEFAULT_ROLE_PERMISSIONS,
    };
    custom[role] = [...DEFAULT_ROLE_PERMISSIONS[role]];
    saveCustomRolePermissions(custom);
  } else {
    localStorage.removeItem(CUSTOM_ROLE_PERMISSIONS_KEY);
  }
}

// Reset all permission overrides for a user
export function resetUserOverrides(userId: string): void {
  const overrides = getUserPermissionOverrides();
  const filtered = overrides.filter((o) => o.userId !== userId);
  saveUserPermissionOverrides(filtered);
}

// Add or update user permission override
export function setUserPermissionOverride(
  override: UserPermissionOverride,
): void {
  const overrides = getUserPermissionOverrides();
  const existingIndex = overrides.findIndex(
    (o) => o.userId === override.userId,
  );

  if (existingIndex >= 0) {
    overrides[existingIndex] = override;
  } else {
    overrides.push(override);
  }

  saveUserPermissionOverrides(overrides);
}

// Update a single permission for a role
export function updateRolePermission(
  role: FacilityRole,
  permission: Permission,
  granted: boolean,
): void {
  const custom = getCustomRolePermissions() || { ...DEFAULT_ROLE_PERMISSIONS };

  if (!custom[role]) {
    custom[role] = [...DEFAULT_ROLE_PERMISSIONS[role]];
  }

  if (granted) {
    if (!custom[role].includes(permission)) {
      custom[role].push(permission);
    }
  } else {
    custom[role] = custom[role].filter((p) => p !== permission);
  }

  saveCustomRolePermissions(custom);
}

// Check if current user is owner (has manage_permissions)
export function canManagePermissions(
  role: FacilityRole,
  userId?: string,
): boolean {
  return hasPermission(role, "manage_permissions", userId);
}
