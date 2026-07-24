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
  Sparkles,
  FolderOpen,
  TrendingUp,
  FileText,
  Bell,
  Scissors,
  Moon,
  Sun,
  Dumbbell,
  Users,
  UserCog,
  MonitorSpeaker,
  Settings,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import type { FacilityStaffRole } from "@/types/facility-staff";
import { getOperationsNav, type NavItem } from "@/lib/nav/operations-nav";

// Re-export the shared nav surface so existing importers keep resolving here.
export {
  getOperationsNav,
  OPERATIONS_NAV_MODEL,
  type NavItem,
  type NavSection,
} from "@/lib/nav/operations-nav";

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
//
// The Operations model itself (NAV_MODEL + getOperationsNav) lives in the shared
// single source of truth at @/lib/nav/operations-nav and is re-exported above.
// ============================================================================

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
  // Personal notification center — always-on (B.1 gates this route on nothing).
  { title: "Notifications", url: "/employee/notifications", icon: Bell },
  // Settings — always-on: My Profile + My Notifications are personal. Facility
  // admin sections inside appear only when the viewer holds the key.
  { title: "Settings", url: "/employee/settings", icon: Settings },
];

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
