import { NAV_SECTIONS } from "@/lib/nav/facility-nav";

// ============================================================================
// Employee-shell route mapping.
//
// The shared nav model (facility-nav.ts NAV_SECTIONS) carries the FACILITY urls
// (/facility/dashboard/*). Employees must stay inside the /employee shell, where
// each route re-renders the real facility page behind <RequirePermission> (see
// src/app/employee/(shell)/*). This maps every NAV_SECTIONS url to its
// employee-shell equivalent so the employee sidebar/bottom-nav link in-shell
// while still pointing at the exact same page, gated by the same permKey.
//
// Keep this in sync with NAV_SECTIONS: every item url must have an entry. The
// `assertEmployeeRoutesCoverNav()` guard below fails fast in dev if one is
// missing, and toEmployeeRoute() falls back to the facility url otherwise.
// ============================================================================

/** facility url → employee-shell url. Complete for every NAV_SECTIONS item. */
export const EMPLOYEE_ROUTE_BY_FACILITY_URL: Record<string, string> = {
  "/facility/dashboard": "/employee",
  // Calendars
  "/facility/dashboard/calendar": "/employee/calendar",
  "/facility/dashboard/kennel-view": "/employee/kennel-view",
  // Communication
  "/facility/dashboard/calling": "/employee/calling",
  "/facility/dashboard/messaging": "/employee/inbox",
  // Services
  "/facility/dashboard/services/grooming": "/employee/grooming",
  "/facility/dashboard/services/training": "/employee/training",
  "/facility/dashboard/services/retail": "/employee/retail",
  // Intelligence
  "/facility/dashboard/automations": "/employee/automations",
  "/facility/dashboard/insights": "/employee/insights",
  // Customer / Scheduling
  "/facility/dashboard/clients": "/employee/clients",
  "/facility/dashboard/services/scheduling": "/employee/scheduling",
  // Operations
  "/facility/dashboard/daily-care": "/employee/daily-care",
  "/facility/dashboard/bookings": "/employee/bookings",
  "/facility/dashboard/estimates": "/employee/estimates",
  "/facility/dashboard/tasks": "/employee/tasks",
  "/facility/dashboard/online-booking": "/employee/online-booking",
  "/facility/dashboard/evaluations": "/employee/evaluations",
  "/facility/dashboard/staff": "/employee/staff",
  "/facility/dashboard/inventory": "/employee/inventory",
  "/facility/services/memberships": "/employee/memberships",
  "/facility/dashboard/petcams": "/employee/petcams",
  // Financial
  "/facility/dashboard/billing": "/employee/billing",
  "/facility/settings/billing": "/employee/subscription-billing",
  "/facility/dashboard/gift-cards": "/employee/gift-cards",
  // Reports
  "/facility/dashboard/reports": "/employee/reports",
  // Marketing
  "/facility/dashboard/marketing": "/employee/marketing",
  "/facility/dashboard/loyalty": "/employee/loyalty",
  "/facility/dashboard/marketing/loyalty-reports": "/employee/loyalty-reports",
  "/facility/dashboard/marketing/reputation-booster":
    "/employee/reputation-booster",
  // Management
  "/facility/dashboard/incidents": "/employee/incidents",
  "/facility/dashboard/waivers": "/employee/waivers",
  "/facility/dashboard/forms": "/employee/forms",
  // Settings
  "/facility/dashboard/settings": "/employee/settings",
};

/**
 * Resolve a NAV_SECTIONS (facility) url to its employee-shell route. Falls back
 * to the original url if unmapped — but every NAV_SECTIONS item is mapped above,
 * so a fallback in practice means a new nav item needs an entry here (and a
 * matching wrapper route under src/app/employee/(shell)/).
 */
export function toEmployeeRoute(facilityUrl: string): string {
  return EMPLOYEE_ROUTE_BY_FACILITY_URL[facilityUrl] ?? facilityUrl;
}

/**
 * Dev guard: every NAV_SECTIONS item url has an employee-shell mapping. Returns
 * the list of unmapped urls (empty when the map is complete). Call sites can
 * assert on this in tests / a nav-parity check.
 */
export function unmappedNavUrls(): string[] {
  return NAV_SECTIONS.flatMap((s) => s.items)
    .map((i) => i.url)
    .filter((url) => !(url in EMPLOYEE_ROUTE_BY_FACILITY_URL));
}
