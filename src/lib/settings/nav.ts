import {
  Bed,
  Bell,
  Briefcase,
  CalendarCheck,
  Building2,
  Calculator,
  CircleDot,
  Clock,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  CloudSun,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  GraduationCap,
  History,
  Languages,
  Lightbulb,
  ListChecks,
  LogOut,
  Mail,
  MapPin,
  NotebookPen,
  Package,
  Palette,
  PawPrint,
  Percent,
  Plug,
  QrCode,
  Receipt,
  ReceiptText,
  Repeat,
  Scissors,
  Shield,
  ShoppingCart,
  Syringe,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Tag,
  TriangleAlert,
  UserCircle,
  UserX,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PermissionKey } from "@/types/facility-staff";

// ============================================================================
// THE SETTINGS REGISTRY — one list, five consumers.
//
// Until now the settings area was described in three places that had to agree
// and had no way to check that they did: `STATIC_GROUPS` in SettingsSidebar
// drew the rail, `SETTINGS_SECTION_KEYS` in the same file gated deep links, and
// a chain of ~45 `activeSection === "…"` branches in a 4,748-line page.tsx
// decided what actually rendered.
//
// They did not agree. The rail synthesises a `custom-<slug>` entry for every
// active custom module and page.tsx has no branch for it, so those items open a
// blank pane. Four links elsewhere in the product point at sections that do not
// exist. Nothing failed, because nothing was comparing the three lists.
//
// This file is the list. The rail renders from it, the landing page groups from
// it, the `?section=` redirect resolves through it, the permission guard reads
// `access` off it, and `bun run check:settings-routes` walks it in both
// directions — every leaf reachable, every link in `src/` resolving to a leaf.
//
// ── WHY THE URL IS FLAT ───────────────────────────────────────────────────
//
// `/settings/taxes`, not `/settings/billing/taxes`.
//
// Nesting the group into the path is the obvious shape and it is a trap here,
// because the group labels are the part we already know is wrong — eleven
// groups on three different axes, with "Notifications" appearing in three of
// them. Regrouping is a later stage of this same piece of work. With the group
// in the path, that stage breaks every child URL and needs a redirect per leaf;
// flat, it is an edit to `group` in this file and nothing moves.
//
// The usual argument for nesting is that a group `layout.tsx` can hold the
// permission guard for all its children. It does not survive contact with this
// data: "General" alone spans `settings_general`, `settings_manage_notifications`,
// `manage_integrations` and `manage_facility_settings`. The guard has to be
// per-leaf whatever the path looks like, so nesting buys nothing and costs the
// regroup.
//
// ── WHY `access` IS REQUIRED ──────────────────────────────────────────────
//
// `SETTINGS_SECTION_KEYS` was a partial map, and `canAccessSettingsSection`
// read a missing entry as ALLOW. The file's own comment records what that
// costs: add a rail entry, forget the map entry, and the link hides from a
// groomer while the deep link still works. Making it a required field with an
// explicit `"personal"` for the sections that genuinely need no permission
// deletes that state rather than documenting it.
// ============================================================================

/**
 * Who may open a leaf. `"personal"` is not a weaker permission — it means the
 * screen holds the viewer's own preferences, so every signed-in viewer has one
 * and there is nothing to check.
 */
export type SettingsAccess = PermissionKey | "personal";

export interface SettingsLeaf {
  /**
   * The `?section=` id. This is a permanent identifier, not a URL: it is what
   * bookmarks, `src/data/facility-onboarding.ts` and Clover's external return
   * path all carry. It never changes, even when `segment` or `label` does.
   */
  id: string;
  /** The URL segment under `/settings`. Starts equal to `id`; may diverge. */
  segment: string;
  label: string;
  icon: LucideIcon;
  access: SettingsAccess;
  /**
   * Rendered indented under this leaf id in the rail. The parent is a heading,
   * not a screen — it has no route of its own, because a heading that
   * navigates either goes nowhere or hijacks one of its children.
   */
  parent?: string;
}

export interface SettingsGroup {
  label: string;
  /** Rail order within the group is this array's order. */
  leaves: SettingsLeaf[];
}

/**
 * The groups exactly as they are today.
 *
 * This file is a faithful move, not the redesign: same eleven groups, same
 * labels, same order, same permissions. Regrouping onto one axis, resolving
 * the three "Notifications" entries and deleting the duplicate Roles screen
 * are a later stage. Mixing a mechanical move with a redesign is how a diff
 * stops being reviewable.
 */
export const SETTINGS_NAV: SettingsGroup[] = [
  {
    label: "My account",
    leaves: [
      {
        id: "my-profile",
        segment: "my-profile",
        label: "My profile",
        icon: UserCircle,
        access: "personal",
      },
      {
        id: "my-notifications",
        segment: "my-notifications",
        label: "My notifications",
        icon: Bell,
        access: "personal",
      },
    ],
  },
  {
    label: "Business",
    leaves: [
      {
        id: "business",
        segment: "business",
        label: "Business profile",
        icon: Building2,
        access: "settings_general",
      },
      {
        id: "hours",
        segment: "hours",
        label: "Hours & closures",
        icon: Clock,
        access: "settings_general",
      },
      {
        id: "locations",
        segment: "locations",
        label: "Locations",
        icon: MapPin,
        access: "settings_general",
      },
      {
        id: "language",
        segment: "language",
        label: "Language & region",
        icon: Languages,
        access: "settings_general",
      },
      {
        id: "branding",
        segment: "branding",
        label: "Branding",
        icon: Palette,
        access: "settings_general",
      },
      {
        id: "weather",
        segment: "weather",
        label: "Yipyy Forecast",
        icon: CloudSun,
        access: "settings_general",
      },
      {
        id: "hq",
        segment: "hq",
        label: "Multi-location (HQ)",
        icon: Globe,
        access: "hq_manage_settings",
      },
    ],
  },
  {
    label: "Bookings",
    leaves: [
      {
        id: "booking-rules",
        segment: "booking-rules",
        label: "Booking rules",
        icon: CalendarCheck,
        access: "settings_general",
      },
      {
        id: "booking-statuses",
        segment: "booking-statuses",
        label: "Booking statuses",
        icon: CircleDot,
        access: "manage_facility_settings",
      },
      {
        id: "checkin-requirements",
        segment: "checkin-requirements",
        label: "Check-in requirements",
        icon: ListChecks,
        access: "manage_facility_settings",
      },
      {
        id: "evaluations",
        segment: "evaluations",
        label: "Evaluations",
        icon: ClipboardCheck,
        access: "manage_facility_settings",
      },
      {
        id: "vaccination-requirements",
        segment: "vaccination-requirements",
        label: "Vaccination requirements",
        icon: Syringe,
        access: "settings_general",
      },
      {
        id: "report-card-template",
        segment: "report-card-template",
        label: "Report card template",
        icon: NotebookPen,
        access: "settings_general",
      },
      {
        id: "incident-reporting",
        segment: "incident-reporting",
        label: "Incident reporting",
        icon: TriangleAlert,
        access: "manage_facility_settings",
      },
      {
        id: "form-requirements",
        segment: "form-requirements",
        label: "Form requirements",
        icon: ClipboardPen,
        access: "settings_manage_forms",
      },
    ],
  },
  {
    label: "Services",
    leaves: [
      {
        id: "boarding",
        segment: "boarding",
        label: "Boarding",
        icon: Bed,
        access: "manage_services",
      },
      {
        id: "daycare",
        segment: "daycare",
        label: "Daycare",
        icon: Sun,
        access: "manage_services",
      },
      {
        id: "grooming",
        segment: "grooming",
        label: "Grooming",
        icon: Scissors,
        access: "manage_services",
      },
      {
        id: "training",
        segment: "training",
        label: "Training",
        icon: GraduationCap,
        access: "manage_services",
      },
      {
        id: "retail",
        segment: "retail",
        label: "Retail / POS",
        icon: ShoppingCart,
        access: "manage_facility_settings",
      },
      {
        id: "addons",
        segment: "addons",
        label: "Add-ons",
        icon: Package,
        access: "manage_services",
      },
      {
        id: "yipyygo",
        segment: "yipyygo",
        label: "Yipyy Go",
        icon: QrCode,
        access: "manage_facility_settings",
      },
    ],
  },
  {
    label: "Money",
    leaves: [
      {
        id: "payments-billing",
        segment: "payments-billing",
        label: "Payments & billing",
        icon: CreditCard,
        access: "settings_billing",
      },
      {
        id: "yipyy-pay",
        segment: "yipyy-pay",
        label: "Yipyy Pay",
        icon: Wallet,
        access: "settings_billing",
        parent: "payments-billing",
      },
      {
        id: "tips",
        segment: "tips",
        label: "Tip settings",
        icon: Coins,
        access: "settings_billing",
        parent: "payments-billing",
      },
      {
        id: "pricing-rules",
        segment: "pricing-rules",
        label: "Pricing rules",
        icon: Calculator,
        access: "manage_rates",
        parent: "payments-billing",
      },
      {
        id: "estimate-settings",
        segment: "estimate-settings",
        label: "Estimate settings",
        icon: FileText,
        access: "manage_rates",
      },
      {
        id: "deposit-rules",
        segment: "deposit-rules",
        label: "Deposit rules",
        icon: DollarSign,
        access: "manage_rates",
      },
      {
        id: "invoice-template",
        segment: "invoice-template",
        label: "Invoice template",
        icon: ReceiptText,
        access: "manage_facility_settings",
      },
      {
        id: "taxes",
        segment: "taxes",
        label: "Taxes",
        icon: Percent,
        access: "settings_manage_taxes",
      },
      {
        id: "payroll-rules",
        segment: "payroll-rules",
        label: "Payroll rules",
        icon: Receipt,
        access: "view_payroll",
      },
      {
        id: "subscription",
        segment: "subscription",
        label: "Subscription",
        icon: Repeat,
        access: "settings_subscription",
      },
    ],
  },
  {
    label: "People",
    leaves: [
      {
        id: "roles-permissions",
        segment: "roles-permissions",
        label: "Roles & permissions",
        icon: Shield,
        access: "manage_roles",
      },
      {
        id: "onboarding-templates",
        segment: "onboarding-templates",
        label: "Onboarding templates",
        icon: ClipboardList,
        access: "manage_onboarding",
      },
      {
        id: "offboarding-templates",
        segment: "offboarding-templates",
        label: "Offboarding templates",
        icon: LogOut,
        access: "manage_onboarding",
      },
      {
        id: "employment-types",
        segment: "employment-types",
        label: "Employment types",
        icon: Briefcase,
        access: "manage_onboarding",
      },
      {
        id: "termination-reasons",
        segment: "termination-reasons",
        label: "Termination reasons",
        icon: UserX,
        access: "manage_onboarding",
      },
      {
        id: "hr-config",
        segment: "hr-config",
        label: "Onboarding & HR",
        icon: SlidersHorizontal,
        access: "manage_onboarding",
      },
    ],
  },
  {
    label: "Communication",
    leaves: [
      {
        id: "notifications",
        segment: "notifications",
        label: "Notifications",
        icon: Bell,
        access: "settings_manage_notifications",
      },
      {
        id: "staff-notifications",
        segment: "staff-notifications",
        label: "Staff notifications",
        icon: Bell,
        access: "manage_onboarding",
      },
      {
        id: "form-notifications",
        segment: "form-notifications",
        label: "Form notifications",
        icon: Bell,
        access: "settings_manage_forms",
      },
      {
        id: "custom-email-domain",
        segment: "custom-email-domain",
        label: "Custom email domain",
        icon: Mail,
        access: "manage_facility_settings",
      },
    ],
  },
  {
    label: "Pets & records",
    leaves: [
      {
        id: "pet-breeds",
        segment: "pet-breeds",
        label: "Pet breeds",
        icon: PawPrint,
        access: "manage_facility_settings",
      },
      {
        id: "care-tasks",
        segment: "care-tasks",
        label: "Care tasks",
        icon: UtensilsCrossed,
        access: "manage_facility_settings",
      },
      {
        id: "tags-notes",
        segment: "tags-notes",
        label: "Tags & notes",
        icon: Tag,
        access: "manage_facility_settings",
      },
    ],
  },
  {
    label: "Platform",
    leaves: [
      {
        id: "integrations",
        segment: "integrations",
        label: "Integrations",
        icon: Plug,
        access: "manage_integrations",
      },
      {
        id: "smart-insights",
        segment: "smart-insights",
        label: "Smart insights",
        icon: Lightbulb,
        access: "manage_facility_settings",
      },
      {
        id: "mobile-app",
        segment: "mobile-app",
        label: "Mobile app",
        icon: Smartphone,
        access: "manage_facility_settings",
      },
      {
        id: "audit",
        segment: "audit",
        label: "Audit log",
        icon: History,
        access: "settings_audit_log",
      },
    ],
  },
];

/** Every leaf, in rail order. */
export const SETTINGS_LEAVES: SettingsLeaf[] = SETTINGS_NAV.flatMap(
  (g) => g.leaves,
);

const LEAF_BY_ID = new Map(SETTINGS_LEAVES.map((l) => [l.id, l]));

/**
 * Ids that are headings rather than screens. `payments-billing` gathers the
 * three screens that decide what a customer is charged; it has no content of
 * its own, so it is reachable in the rail and not as a destination.
 */
export const SETTINGS_PARENT_IDS: ReadonlySet<string> = new Set(
  SETTINGS_LEAVES.flatMap((l) => (l.parent ? [l.parent] : [])),
);

/**
 * Old `?section=` values that still arrive from bookmarks.
 *
 * `financial` is deliberately kept in the permission map as well as here: if
 * this alias is ever dropped, a stale bookmark should meet a permission check
 * rather than an unguarded section.
 */
export const LEGACY_SECTION_ALIASES: Record<string, string> = {
  "form-permissions": "roles-permissions",
  financial: "yipyy-pay",
  // "Staff & HR › Roles" rendered <FacilityRolesStudio /> — the SAME component
  // as "Access Control › Roles & Permissions", byte for byte — behind
  // `manage_onboarding` instead of `manage_roles`. So somebody who could set up
  // a new hire could also open the full role editor and change what every role
  // in the facility may do. The writes go to /api/roles/custom and
  // /api/roles/overrides, which enforce `manage_roles` through RLS, so the
  // database refused them and nothing was ever actually granted — but the
  // screen offered it, and every button on it failed. The duplicate is gone and
  // its address now resolves to the one real role editor.
  "staff-roles": "roles-permissions",
};

/** A `?section=` id — current or legacy — resolved to a leaf, or undefined. */
export function settingsLeaf(id: string): SettingsLeaf | undefined {
  return LEAF_BY_ID.get(LEGACY_SECTION_ALIASES[id] ?? id);
}

/**
 * Where a leaf lives, per portal.
 *
 * Two portals render the same settings: `/facility/dashboard/settings/*` and
 * `/employee/settings/*`. An employee sent to a facility URL is bounced by
 * `guardPortal` in the facility layout, which would take away the personal
 * settings every employee is guaranteed — so the href has to know which shell
 * asked for it. Every call site goes through here rather than writing a path.
 */
export type SettingsPortal = "facility" | "employee";

export function settingsHref(
  leaf: SettingsLeaf | string,
  portal: SettingsPortal = "facility",
): string {
  const resolved = typeof leaf === "string" ? settingsLeaf(leaf) : leaf;
  const base = settingsIndexHref(portal);
  if (!resolved) return base;
  // ── THE SECTION IS THE PATH, AS OF STAGE 2 ─────────────────────────────
  //
  // This returned `${base}?section=${id}` while settings was one page reading a
  // query parameter. Converting the call sites BEFORE the routes is what made
  // the change to this line safe, and it was worth doing on its own: of the
  // twenty hand-written query strings around the product, five were already
  // wrong. Two named `training-disciplines`, which is not a section and landed
  // on Business in silence; three used `?tab=` where the page read `?section=`,
  // so they did nothing at all.
  //
  // `id` remains the permanent identifier and `segment` the address. They are
  // equal today. They stop being equal the first time a section is renamed —
  // and a rename must not break a bookmark, so the old address keeps resolving
  // through LEGACY_SECTION_ALIASES and the index route redirects it here.
  return `${base}/${resolved.segment}`;
}

/**
 * The settings index — the landing page, and what a nav item points at.
 *
 * Its own function because it is the one settings URL with no leaf behind it,
 * and `settingsHref("")` returning the base by accident is not something a
 * reader should have to know.
 */
export function settingsIndexHref(portal: SettingsPortal = "facility"): string {
  return portal === "employee"
    ? "/employee/settings"
    : "/facility/dashboard/settings";
}

/** Which portal a pathname belongs to, for building sibling hrefs. */
export function settingsPortalFor(pathname: string): SettingsPortal {
  return pathname.startsWith("/employee") ? "employee" : "facility";
}
