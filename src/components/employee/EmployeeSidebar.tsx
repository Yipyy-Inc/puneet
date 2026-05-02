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
  Dog,
  ClipboardList,
  Home,
  Sun,
  Moon,
  Sparkles,
  Users,
  Dumbbell,
  MonitorSpeaker,
  UserCog,
  ShoppingBag,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import type { FacilityStaffRole } from "@/types/facility-staff";

// Navigation by role — all URLs stay under /employee/* to keep the shell intact
const NAV_BY_ROLE: Record<
  FacilityStaffRole,
  { title: string; url: string; icon: React.ElementType }[]
> = {
  owner: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Bookings", url: "/employee/bookings", icon: ClipboardList },
    { title: "Clients", url: "/employee/clients", icon: Users },
  ],
  manager: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Bookings", url: "/employee/bookings", icon: ClipboardList },
    { title: "Clients", url: "/employee/clients", icon: Users },
  ],
  reception: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Bookings", url: "/employee/bookings", icon: ClipboardList },
    { title: "Clients", url: "/employee/clients", icon: Users },
    { title: "Retail", url: "/employee/retail", icon: ShoppingBag },
  ],
  groomer: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Today's Queue", url: "/employee/grooming", icon: Scissors },
    { title: "My Clients", url: "/employee/clients", icon: Dog },
  ],
  trainer: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Training", url: "/employee/training", icon: Dumbbell },
    { title: "My Clients", url: "/employee/clients", icon: Dog },
  ],
  daycare_attendant: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Daycare", url: "/employee/daycare", icon: Sun },
    { title: "Kennel View", url: "/employee/kennel", icon: Dog },
  ],
  boarding_attendant: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Boarding", url: "/employee/boarding", icon: Moon },
    { title: "Kennel View", url: "/employee/kennel", icon: Dog },
  ],
  sanitation: [
    { title: "Dashboard", url: "/employee", icon: LayoutDashboard },
    { title: "My Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Tasks", url: "/employee/tasks", icon: Sparkles },
  ],
};

const ROLE_ICON: Record<FacilityStaffRole, React.ElementType> = {
  owner: UserCog,
  manager: Users,
  reception: MonitorSpeaker,
  groomer: Scissors,
  trainer: Dumbbell,
  daycare_attendant: Sun,
  boarding_attendant: Moon,
  sanitation: Sparkles,
};

const ROLE_LABEL: Record<FacilityStaffRole, string> = {
  owner: "Owner / Admin",
  manager: "Manager",
  reception: "Reception",
  groomer: "Groomer",
  trainer: "Trainer",
  daycare_attendant: "Daycare Attendant",
  boarding_attendant: "Boarding Staff",
  sanitation: "Sanitation",
};

const ROLE_COLOR: Record<FacilityStaffRole, string> = {
  owner: "from-amber-400 to-amber-600",
  manager: "from-violet-400 to-violet-600",
  reception: "from-sky-400 to-sky-600",
  groomer: "from-rose-400 to-rose-600",
  trainer: "from-emerald-400 to-emerald-600",
  daycare_attendant: "from-orange-400 to-orange-600",
  boarding_attendant: "from-indigo-400 to-indigo-600",
  sanitation: "from-teal-400 to-teal-600",
};

export function EmployeeSidebar({ staffId }: { staffId: string }) {
  const pathname = usePathname();
  const staff = facilityStaff.find((s) => s.id === staffId);
  const role = staff?.primaryRole ?? "reception";
  const Icon = ROLE_ICON[role];
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.reception;

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
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive =
                item.url === "/employee"
                  ? pathname === "/employee"
                  : pathname === item.url || pathname.startsWith(item.url + "/");
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
      </SidebarContent>
    </Sidebar>
  );
}
