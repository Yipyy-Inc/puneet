import type { LucideIcon } from "lucide-react";
import {
  House,
  CalendarDays,
  LayoutGrid,
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
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardPen,
  FileSignature,
  UserCheck,
  Package,
  Tags,
  Camera,
  CreditCard,
  Vault,
  Receipt,
  Gift,
  BarChart3,
  TrendingUp,
  Repeat,
  Megaphone,
  Award,
  ShieldCheck,
  TriangleAlert,
  Settings,
} from "lucide-react";

import {
  PERMISSION_GROUPS,
  type PermissionGroup,
  type PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// THE GLYPHS COME FROM docs/design-system/icon-map.json, NOT FROM TASTE.
// §5b1, and stage 10 of WORK_ORDER.md.
//
// "One glyph per meaning — take it from icon-map.json, never a synonym." The
// map's `tier1.navigation` names a lucide glyph for all 36 areas, and
// `bun run check:nav-icons` compares this file against it on every push, so a
// synonym cannot creep back in the way six of them already had.
//
// ── THE SIX COLLISIONS THE MAP RECORDS, AND HOW EACH RESOLVED ─────────────
//
// A collision is two nav areas wearing the same glyph, which makes the glyph
// carry no information at all — the label is doing all the work and the icon
// is decoration. The map names the loser and the replacement, with a reason:
//
//   calendar        Facility Calendar + Bookings
//                   -> Bookings takes `calendar-check`. "The calendar is the
//                      grid you look at; a booking is one confirmed
//                      reservation."
//   credit-card     Payments + Subscription & Billing
//                   -> Subscription takes `repeat`. "What Yipyy charges the
//                      facility is a recurring charge, not a card taken at
//                      the desk."
//   bar-chart-3     Reports & Analytics + Loyalty Reports
//                   -> Loyalty Reports takes `trending-up`. "One metric over
//                      time, not the reporting suite."
//   file-text       Estimates + Digital Waivers
//                   -> Waivers take `file-signature`. "A waiver's whole
//                      nature is that it is signed."
//   clipboard-list  Tasks + Intake Forms
//                   -> Forms take `clipboard-pen`. "A form is filled in; a
//                      task is ticked off."
//   dollar-sign     the money pair
//                   -> `wallet` for Billing. NOT APPLIED: this nav has one
//                      item, "Subscription & Billing", and no dollar-sign
//                      anywhere. The map's own note says "the titles need
//                      separating too", which is a product decision about
//                      what those screens are, not an icon swap. Left for
//                      whoever splits them; the credit-card collision above
//                      is resolved either way.
//
// Three more were plain drift rather than collisions, and the map is equally
// specific: Dashboard is `house` (was `Home`, lucide's deprecated alias),
// Facility Calendar is `calendar-days` (was the bare `Calendar`), Occupancy is
// `layout-grid` (was `Grid3X3`), and Incidents is `triangle-alert` (was
// `AlertTriangle`, the deprecated alias again).
// ============================================================================

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
        icon: House,
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
        icon: CalendarDays,
        permKey: "view_all_calendars",
      },
      {
        title: "Occupancy Calendar",
        url: "/facility/dashboard/kennel-view",
        icon: LayoutGrid,
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
        icon: CalendarCheck,
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
        // Every payment, whichever channel took it — the same list that sits
        // in Settings → Yipyy Pay → Transactions, given an address somebody
        // would think to visit. `financial_view_amounts` rather than
        // `financial_take_payment`: reading the day's takings is not the same
        // permission as putting a card through, and the bookkeeper holds only
        // the first.
        //
        // "Payments & Billing" used to sit directly beneath this entry and is
        // gone. It read `src/data/payments` at a HARDCODED `facilityId = 11`,
        // so every facility was shown the same fourteen invented payments:
        // $1,201.50 of revenue and $15.00 of tips against the demo facility's
        // real 724 payments, $34,757.25 and $1,356.00. Its other three tabs
        // duplicated screens that already exist here and are real — gift cards
        // (/facility/dashboard/gift-cards), credits (Memberships → Credits),
        // and this one — and its fourth listed outstanding invoices, of which
        // there is no table, no route and no way to create one.
        title: "Payments",
        url: "/facility/dashboard/payments",
        icon: CreditCard,
        permKey: "financial_view_amounts",
      },
      {
        title: "Daily Register",
        url: "/facility/dashboard/billing/cash-drawer",
        icon: Vault,
        permKey: "open_close_register",
      },
      {
        // The screen the ACCOUNTANT was missing: they hold `view_payroll` and
        // are staff-level, so every money surface in the admin-only portal was
        // out of reach. In the shared nav, so BOTH sidebars render it and the
        // permission decides who sees it — no new access level required.
        title: "Payroll",
        url: "/facility/dashboard/payroll",
        icon: Receipt,
        permKey: "view_payroll",
      },
      {
        title: "Subscription & Billing",
        url: "/facility/settings/billing",
        icon: Repeat,
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
        icon: TrendingUp,
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
        icon: TriangleAlert,
        permKey: "ops_incidents_view",
      },
      {
        title: "Digital Waivers",
        url: "/facility/dashboard/waivers",
        icon: FileSignature,
        permKey: "view_waivers",
      },
      {
        title: "Intake Forms",
        url: "/facility/dashboard/forms",
        icon: ClipboardPen,
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
