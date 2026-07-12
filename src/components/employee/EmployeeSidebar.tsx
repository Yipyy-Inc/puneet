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
  Scissors,
  Calendar,
  CalendarClock,
  Dog,
  ClipboardList,
  Sun,
  Moon,
  Sparkles,
  Users,
  Dumbbell,
  MonitorSpeaker,
  UserCog,
  ShoppingBag,
  FolderOpen,
  TrendingUp,
  FileText,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import type {
  EffectivePermissions,
  FacilityStaffRole,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// Permission-driven staff navigation (spec Table 18)
//
// The sidebar makes NO independent permission decisions — it renders whatever
// the resolver (F0.2) permits. Each item/section carries its MINIMUM permission
// key; `getStaffNav()` filters against the staff member's effective permissions.
//
// Only sections with a real /employee route are rendered today. The remaining
// Table 18 sections live in the facility portal (no dedicated staff route yet):
//   Operations [ops_incidents_view]   Financial [financial_take_payment]
//   Reports [financial_reports]       Marketing [marketing_view]
//   Calling [calling_view]            Messages [messages_view_inbox]
//   Smart Insights [ops_smart_insights]  Management [ops_incidents_view]
//   Settings [settings_general]       HQ [hq_view]
// They are intentionally omitted here until those routes exist — add a section
// below (with its `require` key) when they do.
// ============================================================================

interface StaffNavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  /** Minimum permission to see this item; omitted = always visible. */
  require?: PermissionKey;
}

interface StaffNavSection {
  id: string;
  label: string;
  /** Minimum permission to see this section; omitted = always visible. */
  require?: PermissionKey;
  items: StaffNavItem[];
}

// Ordered per spec Table 18. All URLs stay under /employee/* to keep the shell.
const STAFF_NAV_SECTIONS: StaffNavSection[] = [
  {
    id: "my-account",
    label: "My Account",
    // No `require` — always visible.
    items: [
      { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
      { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
      // Personal tasks — gated by the always-on `manage_own_tasks`.
      {
        title: "My Tasks",
        url: "/employee/tasks",
        icon: Sparkles,
        require: "manage_own_tasks",
      },
      // Availability submission — gated by the always-on `submit_availability`.
      {
        title: "Availability",
        url: "/employee/availability",
        icon: CalendarClock,
        require: "submit_availability",
      },
      // HR documents — gated by the always-on `view_own_documents`.
      {
        title: "My Documents",
        url: "/employee/documents",
        icon: FolderOpen,
        require: "view_own_documents",
      },
      // Performance — gated by the always-on `view_own_performance`; the page
      // itself only shows metrics when the manager has enabled visibility.
      {
        title: "My Performance",
        url: "/employee/performance",
        icon: TrendingUp,
        require: "view_own_performance",
      },
      // HR records / write-ups — gated by the always-on `view_own_writeups`.
      {
        title: "My HR Records",
        url: "/employee/write-ups",
        icon: FileText,
        require: "view_own_writeups",
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    require: "view_client_list",
    items: [
      {
        title: "Clients",
        url: "/employee/clients",
        icon: Users,
        require: "view_client_list",
      },
      {
        title: "Bookings",
        url: "/employee/bookings",
        icon: ClipboardList,
        require: "view_bookings",
      },
    ],
  },
  {
    id: "grooming",
    label: "Grooming",
    require: "grooming_view_own_calendar",
    items: [
      {
        title: "Today's Queue",
        url: "/employee/grooming",
        icon: Scissors,
        require: "grooming_view_own_calendar",
      },
    ],
  },
  {
    id: "boarding",
    label: "Boarding",
    require: "boarding_view_dashboard",
    items: [
      {
        title: "Boarding",
        url: "/employee/boarding",
        icon: Moon,
        require: "boarding_view_dashboard",
      },
      {
        title: "Kennel View",
        url: "/employee/kennel",
        icon: Dog,
        require: "boarding_view_dashboard",
      },
    ],
  },
  {
    id: "daycare",
    label: "Daycare",
    require: "daycare_view_dashboard",
    items: [
      {
        title: "Daycare",
        url: "/employee/daycare",
        icon: Sun,
        require: "daycare_view_dashboard",
      },
      // Also available to daycare staff who lack boarding access.
      {
        title: "Kennel View",
        url: "/employee/kennel",
        icon: Dog,
        require: "daycare_view_dashboard",
      },
    ],
  },
  {
    id: "training",
    label: "Training",
    require: "training_view_own_calendar",
    items: [
      {
        title: "Training",
        url: "/employee/training",
        icon: Dumbbell,
        require: "training_view_own_calendar",
      },
    ],
  },
  {
    id: "retail",
    label: "Retail / POS",
    require: "retail_pos_access",
    items: [
      {
        title: "Retail",
        url: "/employee/retail",
        icon: ShoppingBag,
        require: "retail_pos_access",
      },
    ],
  },
];

/**
 * Build the ordered, permission-filtered staff navigation from the effective
 * permission map (F0.2). A section renders when its `require` is satisfied (or
 * always, for My Account); within it, only items the staff is permitted to see
 * appear. Duplicate destinations (e.g. Kennel View under both Boarding and
 * Daycare) collapse to their first permitted occurrence.
 */
export function getStaffNav(
  permissions: EffectivePermissions,
): StaffNavSection[] {
  const has = (key?: PermissionKey) =>
    key == null || permissions[key] !== false;
  const seen = new Set<string>();

  return STAFF_NAV_SECTIONS.filter((section) => has(section.require))
    .map((section) => {
      const items = section.items.filter((item) => {
        if (!has(item.require) || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

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

  // Resolve THIS staff member's effective permissions (F0.2) and build the nav
  // from them — the sidebar makes no independent permission decisions.
  const sections = getStaffNav(resolvePermissions(staffId));

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
        {sections.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive =
                  item.url === "/employee"
                    ? pathname === "/employee"
                    : pathname === item.url ||
                      pathname.startsWith(item.url + "/");
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
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
