"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  CalendarDays,
  Sparkles,
  FolderOpen,
  TrendingUp,
  FileText,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Inbox,
  Phone,
  Scissors,
  Moon,
  Dog,
  Sun,
  Dumbbell,
  Users,
  ShoppingBag,
  UserCog,
  MonitorSpeaker,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import type {
  EffectivePermissions,
  FacilityStaffRole,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// Permission-driven employee navigation (Sections 2 / 3A, spec Table 3)
//
// The sidebar makes NO role-name decisions — there is no NAV_BY_ROLE anymore.
// It reads the acting viewer's effective permissions from the RBAC engine
// (useFacilityRbac → resolvePermissions, the aggregate of useCan/usePermission)
// and renders a fixed two-section shell:
//
//   • "My Workspace" — personal items, backed by ALWAYS_ON_PERMISSIONS, that
//      render for every account and are NEVER gated.
//   • "Operations"  — a declarative NAV_MODEL; each section and item renders
//      per the engine (visible iff its permKey resolves to granted OR
//      assigned_only, i.e. `perms[key] !== false`). 3A: a section shows iff at
//      least one of its items is visible.
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
   * The section's primary visibility key (spec Table 3). Effective visibility is
   * the OR of the items' keys — a section shows if ANY item is visible (3A).
   */
  permKey?: PermissionKey;
  items: NavItem[];
}

/**
 * "My Workspace" — always rendered, never gated. Backed by
 * ALWAYS_ON_PERMISSIONS (view_own_schedule, manage_own_tasks, …), which every
 * account holds. (Clock in / out is the always-on action in EmployeeHeader /
 * the mobile bar, not a page, so it has no nav row here.)
 */
export const MY_WORKSPACE_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
  { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
  { title: "My Tasks", url: "/employee/tasks", icon: Sparkles },
  { title: "Availability", url: "/employee/availability", icon: CalendarClock },
  { title: "My Documents", url: "/employee/documents", icon: FolderOpen },
  { title: "My Performance", url: "/employee/performance", icon: TrendingUp },
  { title: "My Write-ups", url: "/employee/write-ups", icon: FileText },
];

/**
 * "Operations" — declarative, permission-gated. Keys are the REAL
 * {@link PermissionKey} values (the spec's Table 3 uses shorthand names, e.g.
 * "view_boarding_dashboard" → `boarding_view_dashboard`, "access_point_of_sale"
 * → `retail_pos_access`, "view_message_inbox" → `messages_view_inbox`).
 *
 * Only sections that have a real /employee route today are listed. The
 * remaining Table 3 sections are enumerated below with their keys — move each
 * into this model when its route lands (Parts 5–7), no logic change needed:
 *   Facility Calendar → view_all_calendars
 *   Marketing → marketing_view                  Smart Insights → ops_smart_insights
 *   Staff → view_staff                          Inventory → view_inventory
 *   Settings → settings_general                 HQ → hq_view
 */
export const OPERATIONS_NAV_MODEL: NavSection[] = [
  {
    id: "bookings",
    label: "Bookings",
    permKey: "view_bookings",
    items: [
      {
        title: "Bookings",
        url: "/employee/bookings",
        icon: ClipboardList,
        permKey: "view_bookings",
      },
    ],
  },
  {
    id: "grooming",
    label: "Grooming",
    permKey: "view_grooming_queue",
    items: [
      {
        title: "Today's Queue",
        url: "/employee/grooming",
        icon: Scissors,
        permKey: "view_grooming_queue",
      },
      {
        title: "My Calendar",
        url: "/employee/grooming?view=mine",
        icon: CalendarDays,
        permKey: "grooming_view_own_calendar",
      },
      {
        title: "Full Calendar",
        url: "/employee/grooming?view=all",
        icon: CalendarDays,
        permKey: "grooming_view_all_calendars",
      },
    ],
  },
  {
    id: "boarding",
    label: "Boarding",
    permKey: "boarding_view_dashboard",
    items: [
      {
        title: "Boarding",
        url: "/employee/boarding",
        icon: Moon,
        permKey: "boarding_view_dashboard",
      },
      {
        title: "Kennel View",
        url: "/employee/kennel",
        icon: Dog,
        permKey: "boarding_view_dashboard",
      },
    ],
  },
  {
    id: "daycare",
    label: "Daycare",
    permKey: "daycare_view_dashboard",
    items: [
      {
        title: "Daycare",
        url: "/employee/daycare",
        icon: Sun,
        permKey: "daycare_view_dashboard",
      },
      // Duplicate destination with Boarding — collapses to its first permitted
      // occurrence via the URL-dedup in getOperationsNav.
      {
        title: "Kennel View",
        url: "/employee/kennel",
        icon: Dog,
        permKey: "daycare_view_dashboard",
      },
    ],
  },
  {
    id: "daily-care",
    label: "Daily Care",
    permKey: "boarding_daily_care_log",
    // Table 3: log_feedings OR boarding_daily_care_log — OR expressed as two
    // same-URL items (deduped), so boarding staff AND daycare attendants see it
    // while a groomer (perform_grooming only) does not (5D).
    items: [
      {
        title: "Daily Care",
        url: "/employee/daily-care",
        icon: ClipboardCheck,
        permKey: "boarding_daily_care_log",
      },
      {
        title: "Daily Care",
        url: "/employee/daily-care",
        icon: ClipboardCheck,
        permKey: "log_feedings",
      },
    ],
  },
  {
    id: "training",
    label: "Training",
    permKey: "training_view_own_calendar",
    // OR across the trainer key and the manager-oversight key (same route,
    // deduped) so trainers AND managers see Training, but reception — which has
    // only view_training_queue — does not (spec 1.2 acceptance).
    items: [
      {
        title: "Training",
        url: "/employee/training",
        icon: Dumbbell,
        permKey: "training_view_own_calendar",
      },
      {
        title: "Training",
        url: "/employee/training",
        icon: Dumbbell,
        permKey: "training_manage_programs",
      },
    ],
  },
  {
    id: "inbox",
    label: "Inbox",
    permKey: "messages_view_inbox",
    items: [
      {
        title: "Inbox",
        url: "/employee/inbox",
        icon: Inbox,
        permKey: "messages_view_inbox",
      },
    ],
  },
  {
    id: "calling",
    label: "Calling",
    permKey: "calling_view",
    items: [
      {
        title: "Calling",
        url: "/employee/calling",
        icon: Phone,
        permKey: "calling_view",
      },
    ],
  },
  {
    id: "incidents",
    label: "Incidents",
    permKey: "ops_incidents_view",
    items: [
      {
        title: "Incidents",
        url: "/employee/incidents",
        icon: AlertTriangle,
        permKey: "ops_incidents_view",
      },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    permKey: "view_client_list",
    items: [
      {
        title: "Clients",
        url: "/employee/clients",
        icon: Users,
        permKey: "view_client_list",
      },
    ],
  },
  {
    id: "retail",
    label: "Retail / POS",
    permKey: "retail_pos_access",
    items: [
      {
        title: "Retail",
        url: "/employee/retail",
        icon: ShoppingBag,
        permKey: "retail_pos_access",
      },
    ],
  },
];

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

// Identity card (display only — never a permission decision).
const ROLE_ICON: Record<FacilityStaffRole, React.ElementType> = {
  owner: UserCog,
  admin: UserCog,
  manager: Users,
  supervisor: Users,
  reception: MonitorSpeaker,
  groomer: Scissors,
  trainer: Dumbbell,
  caretaker: Moon,
  daycare_attendant: Sun,
  boarding_attendant: Moon,
  retail: Sparkles,
  accountant: MonitorSpeaker,
  sanitation: Sparkles,
};

const ROLE_LABEL: Record<FacilityStaffRole, string> = {
  owner: "Owner / Admin",
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  reception: "Reception",
  groomer: "Groomer",
  trainer: "Trainer",
  caretaker: "Caretaker",
  daycare_attendant: "Daycare Attendant",
  boarding_attendant: "Boarding Staff",
  retail: "Retail Associate",
  accountant: "Accountant",
  sanitation: "Sanitation",
};

const ROLE_COLOR: Record<FacilityStaffRole, string> = {
  owner: "from-amber-400 to-amber-600",
  admin: "from-amber-400 to-amber-600",
  manager: "from-violet-400 to-violet-600",
  supervisor: "from-purple-400 to-purple-600",
  reception: "from-sky-400 to-sky-600",
  groomer: "from-rose-400 to-rose-600",
  trainer: "from-emerald-400 to-emerald-600",
  caretaker: "from-cyan-400 to-cyan-600",
  daycare_attendant: "from-orange-400 to-orange-600",
  boarding_attendant: "from-indigo-400 to-indigo-600",
  retail: "from-fuchsia-400 to-fuchsia-600",
  accountant: "from-lime-400 to-lime-600",
  sanitation: "from-teal-400 to-teal-600",
};

export function EmployeeSidebar({ staffId }: { staffId: string }) {
  const pathname = usePathname();
  const { resolvePermissions } = useFacilityRbac();
  const staff = facilityStaff.find((s) => s.id === staffId);
  const role = staff?.primaryRole ?? "reception";
  const Icon = ROLE_ICON[role];

  // Resolve THIS staff member's effective permissions and gate the Operations
  // nav from them — no role-name branching anywhere below.
  const operations = getOperationsNav(resolvePermissions(staffId));

  const renderItem = (item: NavItem) => {
    const ItemIcon = item.icon;
    const base = item.url.split("?")[0];
    const isActive =
      base === "/employee"
        ? pathname === "/employee"
        : pathname === base || pathname.startsWith(base + "/");
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={item.url}>
            <ItemIcon className="size-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex size-8 items-center justify-center rounded-lg bg-linear-to-br ${ROLE_COLOR[role]}`}
          >
            <Icon className="size-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{ROLE_LABEL[role]}</p>
            {staff && (
              <p className="text-muted-foreground truncate text-xs">
                {staff.firstName} {staff.lastName}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* My Workspace — always on. */}
        <SidebarGroup>
          <SidebarGroupLabel>My Workspace</SidebarGroupLabel>
          <SidebarMenu>{MY_WORKSPACE_ITEMS.map(renderItem)}</SidebarMenu>
        </SidebarGroup>

        {/* Operations — permission-gated modules (3A). */}
        {operations.length > 0 && (
          <>
            <SidebarGroup className="pb-0">
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
            </SidebarGroup>
            {operations.map((section) => (
              <SidebarGroup key={section.id}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarMenu>{section.items.map(renderItem)}</SidebarMenu>
              </SidebarGroup>
            ))}
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
