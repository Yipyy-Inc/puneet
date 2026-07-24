import type { LucideIcon } from "lucide-react";
import {
  Home,
  Calendar,
  Grid3X3,
  Phone,
  MessageSquare,
  Scissors,
  GraduationCap,
  ShoppingCart,
  Zap,
  Lightbulb,
  Users,
  Clock,
  HeartHandshake,
  FileText,
  ClipboardList,
  CalendarClock,
  ClipboardCheck,
  UserCheck,
  Package,
  Tags,
  Camera,
  DollarSign,
  CreditCard,
  Gift,
  BarChart3,
  Megaphone,
  Award,
  ShieldCheck,
  AlertTriangle,
  Settings,
} from "lucide-react";

import {
  PERMISSION_GROUPS,
  type PermissionGroup,
  type PermissionKey,
} from "@/types/facility-staff";

/**
 * The single source-of-truth facility navigation model.
 *
 * Both the facility admin sidebar and the employee portal sidebar render from
 * this one list — nowhere else defines the facility nav order, grouping, routes,
 * icons, or the permission each entry gates on. Consumers filter items through
 * the RBAC resolver (an item shows only when the acting viewer holds `permKey`);
 * the nav model itself makes no permission decisions and carries no runtime
 * state (badge counts, active state) — those stay with the rendering component.
 */
export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /**
   * The minimum permission (Table 18 / §4.1) needed to see this item. EVERY item
   * has one — the resolver decides visibility. `view_dashboard` is an always-on
   * personal permission, so the Dashboard entry is visible to every account.
   */
  permKey: PermissionKey;
  /**
   * Match the current pathname exactly for the active state (the default), or as
   * a route prefix when `false`. Reserved for consumers that highlight a parent
   * entry across its sub-routes; the shared sidebar matches exactly.
   */
  exact?: boolean;
}

export interface NavSection {
  /** Stable id for the section (used as a React key and for section-level logic). */
  id: string;
  /** Rendered as an UPPERCASE collapsible group header. Omitted → standalone, headerless group. */
  label?: string;
  items: NavItem[];
}

/**
 * Order and grouping exactly as the facility sidebar shows them. Standalone
 * groups (Dashboard, Services, Customer, Scheduling, Settings) carry no `label`
 * so they render without a header, matching the current layout.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "dashboard",
    items: [
      {
        title: "Dashboard",
        url: "/facility/dashboard",
        icon: Home,
        permKey: "view_dashboard",
        exact: true,
      },
    ],
  },
  {
    id: "calendars",
    label: "Calendars",
    items: [
      {
        title: "Facility Calendar",
        url: "/facility/dashboard/calendar",
        icon: Calendar,
        permKey: "view_all_calendars",
      },
      {
        title: "Occupancy Calendar",
        url: "/facility/dashboard/kennel-view",
        icon: Grid3X3,
        permKey: "view_occupancy_calendar",
      },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      {
        title: "Calling",
        url: "/facility/dashboard/calling",
        icon: Phone,
        permKey: "calling_view",
      },
      {
        title: "Inbox",
        url: "/facility/dashboard/messaging",
        icon: MessageSquare,
        permKey: "messages_view_inbox",
      },
    ],
  },
  {
    id: "services",
    items: [
      {
        title: "Grooming",
        url: "/facility/dashboard/services/grooming",
        icon: Scissors,
        permKey: "view_grooming_queue",
      },
      {
        title: "Training",
        url: "/facility/dashboard/services/training",
        icon: GraduationCap,
        permKey: "view_training_queue",
      },
      {
        title: "Retail / POS",
        url: "/facility/dashboard/services/retail",
        icon: ShoppingCart,
        permKey: "retail_pos_access",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      {
        title: "Automations",
        url: "/facility/dashboard/automations",
        icon: Zap,
        permKey: "marketing_manage_automations",
      },
      {
        title: "Smart Insights",
        url: "/facility/dashboard/insights",
        icon: Lightbulb,
        permKey: "ops_smart_insights",
      },
    ],
  },
  {
    id: "customer",
    items: [
      {
        title: "Customer",
        url: "/facility/dashboard/clients",
        icon: Users,
        permKey: "view_client_list",
      },
    ],
  },
  {
    id: "scheduling",
    items: [
      {
        title: "Scheduling",
        url: "/facility/dashboard/services/scheduling",
        icon: Clock,
        permKey: "scheduling_view_all",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        title: "Daily Care",
        url: "/facility/dashboard/daily-care",
        icon: HeartHandshake,
        permKey: "boarding_daily_care_log",
      },
      {
        title: "Bookings",
        url: "/facility/dashboard/bookings",
        icon: Calendar,
        permKey: "view_bookings",
      },
      {
        title: "Estimates",
        url: "/facility/dashboard/estimates",
        icon: FileText,
        permKey: "view_estimates",
      },
      {
        title: "Tasks",
        url: "/facility/dashboard/tasks",
        icon: ClipboardList,
        permKey: "ops_manage_tasks",
      },
      {
        title: "Booking Requests",
        url: "/facility/dashboard/online-booking",
        icon: CalendarClock,
        permKey: "manage_booking_calendar",
      },
      {
        title: "Evaluations",
        url: "/facility/dashboard/evaluations",
        icon: ClipboardCheck,
        permKey: "view_evaluations",
      },
      {
        title: "Staff",
        url: "/facility/dashboard/staff",
        icon: UserCheck,
        permKey: "view_staff",
      },
      {
        title: "Operational Inventory",
        url: "/facility/dashboard/inventory",
        icon: Package,
        permKey: "view_inventory",
      },
      {
        title: "Memberships",
        url: "/facility/services/memberships",
        icon: Tags,
        permKey: "view_services",
      },
      {
        title: "Live Pet Cams",
        url: "/facility/dashboard/petcams",
        icon: Camera,
        permKey: "view_petcams",
      },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    items: [
      {
        title: "Payments & Billing",
        url: "/facility/dashboard/billing",
        icon: DollarSign,
        permKey: "financial_take_payment",
      },
      {
        title: "Subscription & Billing",
        url: "/facility/settings/billing",
        icon: CreditCard,
        permKey: "settings_billing",
      },
      {
        title: "Gift Cards",
        url: "/facility/dashboard/gift-cards",
        icon: Gift,
        permKey: "financial_manage_gift_cards",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    items: [
      {
        title: "Reports & Analytics",
        url: "/facility/dashboard/reports",
        icon: BarChart3,
        permKey: "ops_view_reports",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      {
        title: "Marketing",
        url: "/facility/dashboard/marketing",
        icon: Megaphone,
        permKey: "marketing_view",
      },
      {
        title: "Loyalty Program",
        url: "/facility/dashboard/loyalty",
        icon: Award,
        permKey: "marketing_manage_loyalty",
      },
      {
        title: "Loyalty Reports",
        url: "/facility/dashboard/marketing/loyalty-reports",
        icon: BarChart3,
        permKey: "marketing_view_analytics",
      },
      {
        title: "Reputation Booster",
        url: "/facility/dashboard/marketing/reputation-booster",
        icon: ShieldCheck,
        permKey: "marketing_manage_reviews",
      },
    ],
  },
  {
    id: "management",
    label: "Management",
    items: [
      {
        title: "Incidents",
        url: "/facility/dashboard/incidents",
        icon: AlertTriangle,
        permKey: "ops_incidents_view",
      },
      {
        title: "Digital Waivers",
        url: "/facility/dashboard/waivers",
        icon: FileText,
        permKey: "view_waivers",
      },
      {
        title: "Intake Forms",
        url: "/facility/dashboard/forms",
        icon: ClipboardList,
        permKey: "view_intake_forms",
      },
    ],
  },
  // Single Settings entry at the end. Daycare, Boarding and the HQ controls live
  // inside the Settings page rather than the sidebar.
  {
    id: "settings",
    items: [
      {
        title: "Settings",
        url: "/facility/dashboard/settings",
        icon: Settings,
        permKey: "settings_general",
      },
    ],
  },
];

// ============================================================================
// Position-builder permission groups
//
// The Roles & Permissions studio lets a manager "build a position" by switching
// features on/off. To make that read as "turn on the features this position
// needs," the nav-feature toggles are grouped by the SAME sections the nav shows
// (Calendars, Communication, Operations, Financial, …) — derived here from
// NAV_SECTIONS so the switchboard and the nav can never drift.
// ============================================================================

/** Editor label for a nav section that renders without a sidebar header. */
const NAV_SECTION_EDITOR_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  services: "Services",
  customer: "Customer",
  scheduling: "Scheduling",
  settings: "Settings",
};

/**
 * One editor group per nav section, each listing that section's items as feature
 * toggles (keyed by the item's permKey, labelled by its nav title). Toggling one
 * grants/revokes exactly the key that gates that nav item + its page.
 */
export const NAV_FEATURE_GROUPS: PermissionGroup[] = NAV_SECTIONS.map(
  (section) => ({
    id: `nav-${section.id}`,
    label: section.label ?? NAV_SECTION_EDITOR_LABEL[section.id] ?? section.id,
    description: "Turn on the features this position needs.",
    permissions: section.items.map((item) => ({
      key: item.permKey,
      label: item.title,
    })),
  }),
);

/** Every permKey the nav surfaces — one feature toggle each. */
const NAV_FEATURE_KEYS = new Set<PermissionKey>(
  NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.permKey)),
);

/**
 * The rest of the permission catalog with the nav-feature keys removed — the
 * granular, non-nav permissions (create/edit actions, personal always-on, etc.)
 * keep their original categories so every key stays editable exactly once.
 */
export const ADVANCED_PERMISSION_GROUPS: PermissionGroup[] =
  PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.filter((p) => !NAV_FEATURE_KEYS.has(p.key)),
  })).filter((group) => group.permissions.length > 0);

/**
 * The ordered group list the Roles & Permissions studio and the per-staff
 * override editor render: nav features first (grouped by nav section — the
 * "build a position" surface), then the advanced granular permissions. Every
 * PermissionKey appears exactly once.
 */
export const POSITION_EDITOR_GROUPS: PermissionGroup[] = [
  ...NAV_FEATURE_GROUPS,
  ...ADVANCED_PERMISSION_GROUPS,
];
