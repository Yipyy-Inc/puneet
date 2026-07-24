import {
  Scissors,
  CalendarDays,
  Moon,
  Dog,
  Sun,
  Dumbbell,
  ShoppingBag,
  Tags,
  Boxes,
  Calendar,
  Grid3X3,
  ClipboardList,
  FileText,
  CalendarClock,
  ClipboardCheck,
  Users,
  CreditCard,
  Gift,
  Phone,
  Inbox,
  MessageSquare,
  Package,
  AlertTriangle,
  Camera,
  Megaphone,
  Award,
  Zap,
  BarChart3,
  Lightbulb,
  UserCheck,
  Blocks,
  Clock,
  ShieldCheck,
  Settings,
} from "lucide-react";
import type {
  EffectivePermissions,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// ONE shared Operations-nav definition (the anti-drift source of truth).
//
// Both sidebars ultimately answer to this single registry:
//   • The EMPLOYEE sidebar/bottom-nav DERIVE their Operations rows from it
//     (OPERATIONS_NAV_MODEL below) and filter by the viewer's permissions
//     (getOperationsNav). The facility admin holds every key, so it would show
//     the full set.
//   • The FACILITY sidebar is VALIDATED against it by `bun run check:nav-parity`
//     (scripts/check-nav-parity.ts): every module route in the facility nav must
//     be registered here, so a module added to the admin nav can never be
//     silently forgotten in the employee nav.
//
// Each row carries the SAME `permKey` that gates its /employee route (B.1), so
// nav visibility exactly tracks page access. A row's `facilityRoute` links it to
// the admin destination for the parity check; `employeeRoute: null` marks a
// module that is intentionally admin-only (no employee page), which the check
// treats as a documented exception rather than drift.
// ============================================================================

export interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  /** Item-visibility permission key. Omitted → always render (My Workspace). */
  permKey?: PermissionKey;
}

export interface NavSection {
  id: string;
  label: string;
  /**
   * The section's primary visibility key (documentation only). Effective
   * visibility is the OR of the items' keys — a section shows if ANY item is
   * visible (3A).
   */
  permKey?: PermissionKey;
  items: NavItem[];
}

export type NavGroupId =
  | "services"
  | "bookings-calendar"
  | "clients"
  | "financial"
  | "communications"
  | "operations"
  | "marketing"
  | "reports"
  | "staff"
  | "settings";

/** Ordered groups — mirrors the facility sidebar's structure. */
export const NAV_GROUPS: {
  id: NavGroupId;
  label: string;
  /** Representative key (documentation; real gate is the OR of item keys). */
  permKey: PermissionKey;
}[] = [
  { id: "services", label: "Services", permKey: "view_services" },
  {
    id: "bookings-calendar",
    label: "Bookings & Calendar",
    permKey: "view_bookings",
  },
  { id: "clients", label: "Clients", permKey: "view_client_list" },
  { id: "financial", label: "Financial", permKey: "financial_manage_invoices" },
  {
    id: "communications",
    label: "Communications",
    permKey: "messages_view_inbox",
  },
  { id: "operations", label: "Operations", permKey: "ops_incidents_view" },
  { id: "marketing", label: "Marketing", permKey: "marketing_view" },
  { id: "reports", label: "Reports & Insights", permKey: "ops_view_reports" },
  { id: "staff", label: "Staff", permKey: "view_staff" },
  { id: "settings", label: "Settings", permKey: "manage_facility_settings" },
];

export interface OperationsModule {
  /** Stable id (unique per row). */
  id: string;
  /** Employee-facing label. */
  title: string;
  group: NavGroupId;
  /** Controlling key — the same one that gates the employee route. */
  permKey: PermissionKey;
  icon: React.ElementType;
  /**
   * Canonical admin destination, or null for an employee-only sub-row (e.g. the
   * grooming "My Calendar" view, the daycare check-in alias) that has no
   * distinct facility nav entry.
   */
  facilityRoute: string | null;
  /**
   * Employee destination, or null when the module is intentionally admin-only
   * (no /employee page). The parity check treats null as a documented exception.
   */
  employeeRoute: string | null;
}

/**
 * The registry. Order within a group determines render order in the employee
 * sidebar; duplicate `employeeRoute`s (OR-of-keys rows) collapse to the first
 * permitted occurrence in getOperationsNav.
 */
export const OPERATIONS_MODULES: OperationsModule[] = [
  // ── Services ──────────────────────────────────────────────────────────────
  {
    id: "grooming",
    title: "Grooming Queue",
    group: "services",
    permKey: "view_grooming_queue",
    icon: Scissors,
    facilityRoute: "/facility/dashboard/services/grooming",
    employeeRoute: "/employee/grooming",
  },
  {
    id: "grooming-my-calendar",
    title: "My Calendar",
    group: "services",
    permKey: "grooming_view_own_calendar",
    icon: CalendarDays,
    facilityRoute: null,
    employeeRoute: "/employee/grooming?view=mine",
  },
  {
    id: "grooming-full-calendar",
    title: "Full Calendar",
    group: "services",
    permKey: "grooming_view_all_calendars",
    icon: CalendarDays,
    facilityRoute: null,
    employeeRoute: "/employee/grooming?view=all",
  },
  {
    id: "boarding",
    title: "Boarding",
    group: "services",
    permKey: "boarding_view_dashboard",
    icon: Moon,
    facilityRoute: "/facility/dashboard/services/boarding",
    employeeRoute: "/employee/boarding",
  },
  {
    id: "kennel-boarding",
    title: "Kennel View",
    group: "services",
    permKey: "boarding_view_dashboard",
    icon: Dog,
    facilityRoute: null,
    employeeRoute: "/employee/kennel",
  },
  {
    id: "daycare",
    title: "Daycare",
    group: "services",
    permKey: "daycare_view_dashboard",
    icon: Sun,
    facilityRoute: "/facility/dashboard/services/daycare",
    employeeRoute: "/employee/daycare",
  },
  {
    id: "daycare-checkin",
    title: "Daycare Check-In",
    group: "services",
    permKey: "daycare_check_in_out",
    icon: Sun,
    facilityRoute: null,
    employeeRoute: "/employee/daycare",
  },
  {
    id: "kennel-daycare",
    title: "Kennel View",
    group: "services",
    permKey: "daycare_view_dashboard",
    icon: Dog,
    facilityRoute: null,
    employeeRoute: "/employee/kennel",
  },
  {
    id: "training",
    title: "Training",
    group: "services",
    permKey: "training_view_own_calendar",
    icon: Dumbbell,
    facilityRoute: "/facility/dashboard/services/training",
    employeeRoute: "/employee/training",
  },
  {
    id: "training-manage",
    title: "Training",
    group: "services",
    permKey: "training_manage_programs",
    icon: Dumbbell,
    facilityRoute: null,
    employeeRoute: "/employee/training",
  },
  {
    id: "retail",
    title: "Retail / POS",
    group: "services",
    permKey: "retail_pos_access",
    icon: ShoppingBag,
    facilityRoute: "/facility/dashboard/services/retail",
    employeeRoute: "/employee/retail",
  },
  {
    id: "add-ons",
    title: "Services",
    group: "services",
    permKey: "view_services",
    icon: Tags,
    facilityRoute: "/facility/dashboard/add-ons",
    employeeRoute: "/employee/add-ons",
  },
  {
    id: "resources",
    title: "Resources",
    group: "services",
    permKey: "view_services",
    icon: Boxes,
    facilityRoute: "/facility/dashboard/resources",
    employeeRoute: "/employee/resources",
  },
  {
    id: "memberships",
    title: "Memberships",
    group: "services",
    permKey: "view_services",
    icon: Tags,
    // Admin-only today: no /employee memberships page.
    facilityRoute: "/facility/services/memberships",
    employeeRoute: null,
  },
  // ── Bookings & Calendar ───────────────────────────────────────────────────
  {
    id: "calendar",
    title: "Calendar",
    group: "bookings-calendar",
    permKey: "view_all_calendars",
    icon: Calendar,
    facilityRoute: "/facility/dashboard/calendar",
    employeeRoute: "/employee/calendar",
  },
  {
    id: "occupancy-calendar",
    title: "Occupancy Calendar",
    group: "bookings-calendar",
    permKey: "view_bookings",
    icon: Grid3X3,
    facilityRoute: "/facility/dashboard/kennel-view",
    employeeRoute: "/employee/kennel",
  },
  {
    id: "bookings",
    title: "Bookings",
    group: "bookings-calendar",
    permKey: "view_bookings",
    icon: ClipboardList,
    facilityRoute: "/facility/dashboard/bookings",
    employeeRoute: "/employee/bookings",
  },
  {
    id: "estimates",
    title: "Estimates",
    group: "bookings-calendar",
    permKey: "view_bookings",
    icon: FileText,
    facilityRoute: "/facility/dashboard/estimates",
    employeeRoute: "/employee/estimates",
  },
  {
    id: "online-booking",
    title: "Booking Requests",
    group: "bookings-calendar",
    permKey: "manage_booking_calendar",
    icon: CalendarClock,
    facilityRoute: "/facility/dashboard/online-booking",
    employeeRoute: "/employee/online-booking",
  },
  {
    id: "evaluations",
    title: "Evaluations",
    group: "bookings-calendar",
    permKey: "view_bookings",
    icon: ClipboardCheck,
    facilityRoute: "/facility/dashboard/evaluations",
    employeeRoute: "/employee/evaluations",
  },
  // ── Clients ───────────────────────────────────────────────────────────────
  {
    id: "clients",
    title: "Clients",
    group: "clients",
    permKey: "view_client_list",
    icon: Users,
    facilityRoute: "/facility/dashboard/clients",
    employeeRoute: "/employee/clients",
  },
  // ── Financial ─────────────────────────────────────────────────────────────
  {
    id: "billing",
    title: "Billing",
    group: "financial",
    permKey: "financial_manage_invoices",
    icon: CreditCard,
    facilityRoute: "/facility/dashboard/billing",
    employeeRoute: "/employee/billing",
  },
  {
    id: "gift-cards",
    title: "Gift Cards",
    group: "financial",
    permKey: "financial_manage_gift_cards",
    icon: Gift,
    facilityRoute: "/facility/dashboard/gift-cards",
    employeeRoute: "/employee/gift-cards",
  },
  {
    id: "subscription-billing",
    title: "Subscription & Billing",
    group: "financial",
    permKey: "settings_billing",
    icon: CreditCard,
    // Admin-only: facility's own subscription, no employee page.
    facilityRoute: "/facility/settings/billing",
    employeeRoute: null,
  },
  // ── Communications ────────────────────────────────────────────────────────
  {
    id: "calling",
    title: "Calling",
    group: "communications",
    permKey: "calling_view",
    icon: Phone,
    facilityRoute: "/facility/dashboard/calling",
    employeeRoute: "/employee/calling",
  },
  {
    id: "inbox",
    title: "Inbox",
    group: "communications",
    permKey: "messages_view_inbox",
    icon: Inbox,
    facilityRoute: "/facility/dashboard/messaging",
    employeeRoute: "/employee/inbox",
  },
  {
    id: "communications",
    title: "Messages",
    group: "communications",
    permKey: "communicate_clients",
    icon: MessageSquare,
    // The admin /dashboard/communications route just redirects to messaging, so
    // it has no distinct facility nav row; the employee page reuses the hub.
    facilityRoute: null,
    employeeRoute: "/employee/communications",
  },
  // ── Operations ────────────────────────────────────────────────────────────
  {
    id: "daily-care",
    title: "Daily Care",
    group: "operations",
    permKey: "boarding_daily_care_log",
    icon: ClipboardCheck,
    facilityRoute: "/facility/dashboard/daily-care",
    employeeRoute: "/employee/daily-care",
  },
  {
    id: "daily-care-feeding",
    title: "Daily Care",
    group: "operations",
    permKey: "log_feedings",
    icon: ClipboardCheck,
    facilityRoute: null,
    employeeRoute: "/employee/daily-care",
  },
  {
    id: "tasks",
    title: "Tasks",
    group: "operations",
    permKey: "ops_manage_tasks",
    icon: ClipboardList,
    // The admin ops-task board. Employees get their PERSONAL tasks in My
    // Workspace (always-on), which is a different surface, so no gated
    // Operations row maps here.
    facilityRoute: "/facility/dashboard/tasks",
    employeeRoute: null,
  },
  {
    id: "inventory",
    title: "Inventory",
    group: "operations",
    permKey: "view_inventory",
    icon: Package,
    facilityRoute: "/facility/dashboard/inventory",
    employeeRoute: "/employee/inventory",
  },
  {
    id: "incidents",
    title: "Incidents",
    group: "operations",
    permKey: "ops_incidents_view",
    icon: AlertTriangle,
    facilityRoute: "/facility/dashboard/incidents",
    employeeRoute: "/employee/incidents",
  },
  {
    id: "petcams",
    title: "Live Pet Cams",
    group: "operations",
    permKey: "view_bookings",
    icon: Camera,
    facilityRoute: "/facility/dashboard/petcams",
    employeeRoute: "/employee/petcams",
  },
  {
    id: "waivers",
    title: "Digital Waivers",
    group: "operations",
    permKey: "settings_manage_forms",
    icon: FileText,
    facilityRoute: "/facility/dashboard/waivers",
    employeeRoute: "/employee/waivers",
  },
  {
    id: "forms",
    title: "Intake Forms",
    group: "operations",
    permKey: "settings_manage_forms",
    icon: ClipboardList,
    facilityRoute: "/facility/dashboard/forms",
    employeeRoute: "/employee/forms",
  },
  {
    id: "scheduling",
    title: "Scheduling",
    group: "operations",
    permKey: "scheduling_view_all",
    icon: Clock,
    // Admin-only: staff scheduling has no employee-portal equivalent.
    facilityRoute: "/facility/dashboard/services/scheduling",
    employeeRoute: null,
  },
  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    id: "marketing",
    title: "Marketing",
    group: "marketing",
    permKey: "marketing_view",
    icon: Megaphone,
    facilityRoute: "/facility/dashboard/marketing",
    employeeRoute: "/employee/marketing",
  },
  {
    id: "loyalty",
    title: "Loyalty Program",
    group: "marketing",
    permKey: "marketing_manage_loyalty",
    icon: Award,
    facilityRoute: "/facility/dashboard/loyalty",
    employeeRoute: "/employee/loyalty",
  },
  {
    id: "automations",
    title: "Automations",
    group: "marketing",
    permKey: "marketing_manage_automations",
    icon: Zap,
    facilityRoute: "/facility/dashboard/automations",
    employeeRoute: "/employee/automations",
  },
  {
    id: "loyalty-reports",
    title: "Loyalty Reports",
    group: "marketing",
    permKey: "marketing_view_analytics",
    icon: BarChart3,
    // Admin-only analytics view.
    facilityRoute: "/facility/dashboard/marketing/loyalty-reports",
    employeeRoute: null,
  },
  {
    id: "reputation-booster",
    title: "Reputation Booster",
    group: "marketing",
    permKey: "marketing_manage_reviews",
    icon: ShieldCheck,
    // Admin-only.
    facilityRoute: "/facility/dashboard/marketing/reputation-booster",
    employeeRoute: null,
  },
  // ── Reports & Insights ────────────────────────────────────────────────────
  {
    id: "reports",
    title: "Reports",
    group: "reports",
    permKey: "ops_view_reports",
    icon: BarChart3,
    facilityRoute: "/facility/dashboard/reports",
    employeeRoute: "/employee/reports",
  },
  {
    id: "insights",
    title: "Smart Insights",
    group: "reports",
    permKey: "ops_smart_insights",
    icon: Lightbulb,
    facilityRoute: "/facility/dashboard/insights",
    employeeRoute: "/employee/insights",
  },
  // ── Staff ─────────────────────────────────────────────────────────────────
  {
    id: "staff",
    title: "Staff",
    group: "staff",
    permKey: "view_staff",
    icon: UserCheck,
    facilityRoute: "/facility/dashboard/staff",
    employeeRoute: "/employee/staff",
  },
  // ── Settings ──────────────────────────────────────────────────────────────
  {
    id: "modules",
    title: "Modules",
    group: "settings",
    permKey: "manage_facility_settings",
    icon: Blocks,
    // The employee "Modules" surface (request/registry). The facility settings
    // home is a separate admin-only route registered below.
    facilityRoute: null,
    employeeRoute: "/employee/modules",
  },
  {
    id: "settings",
    title: "Settings",
    group: "settings",
    permKey: "settings_general",
    icon: Settings,
    // Admin-only settings home.
    facilityRoute: "/facility/dashboard/settings",
    employeeRoute: null,
  },
];

/**
 * The employee "Operations" model, DERIVED from the registry: every module with
 * an employeeRoute, grouped in NAV_GROUPS order. This is what the sidebar
 * filters through getOperationsNav — so adding a module to the registry (with an
 * employeeRoute) makes it appear in the employee sidebar automatically.
 */
export const OPERATIONS_NAV_MODEL: NavSection[] = NAV_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  permKey: group.permKey,
  items: OPERATIONS_MODULES.filter(
    (m) => m.group === group.id && m.employeeRoute !== null,
  ).map((m) => ({
    title: m.title,
    url: m.employeeRoute as string,
    icon: m.icon,
    permKey: m.permKey,
  })),
})).filter((section) => section.items.length > 0);

/**
 * Build the visible Operations nav from an effective-permission map (F0.2 /
 * spec 3A). An item shows iff its `permKey` is granted or assigned_only
 * (`perms[key] !== false`); a section shows iff it has at least one visible
 * item. Duplicate destinations (e.g. Kennel View under Boarding and Daycare)
 * collapse to their first permitted occurrence.
 */
export function getOperationsNav(perms: EffectivePermissions): NavSection[] {
  const has = (key?: PermissionKey) => key == null || perms[key] !== false;
  const seen = new Set<string>();

  return OPERATIONS_NAV_MODEL.map((section) => {
    const items = section.items.filter((item) => {
      if (!has(item.permKey) || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}
