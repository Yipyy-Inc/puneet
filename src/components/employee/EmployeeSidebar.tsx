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
  Sparkles,
  Scissors,
  Moon,
  Sun,
  Dumbbell,
  Users,
  UserCog,
  MonitorSpeaker,
  type LucideIcon,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import type { FacilityStaffRole } from "@/types/facility-staff";
import { NAV_SECTIONS } from "@/lib/nav/facility-nav";
import { toEmployeeRoute } from "@/lib/nav/employee-nav";

// ============================================================================
// Permission-driven employee navigation — a PURE mirror of the facility sidebar.
//
// The sidebar makes NO role-name decisions and has NO personal "My Workspace"
// group. Exactly like the facility sidebar, personal/self-service actions live
// in the top header (EmployeeHeader — clock in/out, the notification bell, and
// the avatar dropdown's My Schedule / My Tasks / Availability / Documents /
// Performance / Write-ups / Settings). The sidebar renders ONLY the shared nav
// model (@/lib/nav/facility-nav NAV_SECTIONS), filtered to the viewer's
// permissions: an item shows iff its permKey is granted (`perms[key] !== false`),
// a section iff at least one of its items is granted.
// ============================================================================

/** A rendered nav row (a nav-section item mapped into the employee shell). */
type SidebarRow = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Match the pathname exactly for the active state (else prefix-match). */
  exact?: boolean;
};

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

  // Resolve THIS staff member's effective permissions and mirror the facility
  // sidebar: render the shared NAV_SECTIONS, filtered so an item shows iff its
  // permKey is granted and a section shows iff at least one item survives (3A).
  // No role-name branching — identical structure/order/labels/links to facility.
  const perms = resolvePermissions(staffId);
  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => perms[item.permKey] !== false)
      // Employees stay in the /employee shell — each item points at its
      // employee-shell route, which re-renders the same facility page behind
      // RequirePermission (the same permKey that gated the nav item).
      .map((item) => ({ ...item, url: toEmployeeRoute(item.url) })),
  })).filter((section) => section.items.length > 0);

  const renderItem = (item: SidebarRow) => {
    const ItemIcon = item.icon;
    const base = item.url.split("?")[0];
    const isActive = item.exact
      ? pathname === base
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
        {/* Pure facility mirror — same sections, order, labels, and page links
            as the facility sidebar, filtered to the employee's permissions.
            Labeled sections show their header; standalone sections render
            headerless. Personal items live in the header (see EmployeeHeader). */}
        {navSections.map((section) => (
          <SidebarGroup key={section.id}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarMenu>{section.items.map(renderItem)}</SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
