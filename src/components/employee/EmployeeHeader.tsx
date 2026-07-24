"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  User,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  MoreHorizontal,
  Calendar,
  CheckSquare,
  CalendarClock,
  FolderOpen,
  TrendingUp,
  FileText,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import { setUserRole, clearEmployeeStaffId } from "@/lib/role-utils";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useMediaQuery } from "@/hooks/use-media-query";
import { EmployeePortalSwitcher } from "@/components/layout/EmployeePortalSwitcher";
import { ClockInOut } from "@/components/employee/ClockInOut";
import { GlobalSearchNext } from "@/components/search/GlobalSearchNext";
import { MobileSearch } from "@/components/search/MobileSearch";
import { FacilityHeader } from "@/components/layout/FacilityHeader";
import { TopBarIconsNext } from "@/components/layout/TopBarIconsNext";
import { HeaderDropdown } from "@/components/layout/HeaderDropdown";
import { FacilityNotificationsDropdown } from "@/components/facility/FacilityNotificationsDropdown";
import { getUnreadMessagesCount } from "@/lib/messaging-unread";

// ============================================================================
// Employee top bar — the SAME header the facility admin sees (search, "+ New",
// Messages, Bell, Avatar), reusing the facility header components directly so it
// is visually indistinguishable. The only difference is permission scoping:
//   • Global search + Bell + Avatar — always on (personal utilities).
//   • "+ New" — each menu item is gated inside FacilityHeader; the whole button
//     hides when the viewer can create nothing.
//   • Messages — gated on messages_view_inbox.
// ClockInOut takes the facility header's leftmost-action slot (where the admin
// header shows Calling): it is the employee's core always-on action.
// ============================================================================

// Stable (module-level) counts source for the Messages badge — reads the real
// mock message data. Stable identity keeps TopBarIcons' polling effect from
// re-subscribing every render.
async function employeeTopBarCounts() {
  return { unreadMessages: getUnreadMessagesCount() };
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

// Personal, always-on self-service — the employee's "My Workspace". These used
// to be a sidebar group; to mirror the facility portal (whose sidebar carries no
// personal items) they now live in the avatar dropdown. Clock in/out and the
// notification bell are the two personal actions that stay as header buttons.
const MY_WORKSPACE_LINKS = [
  { href: "/employee/schedule", label: "My Schedule", icon: Calendar },
  { href: "/employee/tasks", label: "My Tasks", icon: CheckSquare },
  {
    href: "/employee/availability",
    label: "Availability",
    icon: CalendarClock,
  },
  { href: "/employee/documents", label: "My Documents", icon: FolderOpen },
  { href: "/employee/performance", label: "My Performance", icon: TrendingUp },
  { href: "/employee/write-ups", label: "My Write-ups", icon: FileText },
  { href: "/employee/settings", label: "Settings", icon: Settings },
] as const;

export function EmployeeHeader({ staffId }: { staffId: string }) {
  const staff = facilityStaff.find((s) => s.id === staffId);
  const isWide = useMediaQuery("(min-width: 1280px)", true);

  // Header-control gates (resolved for the signed-in employee via the RBAC
  // boundary). Search's "create customer" affordance follows create_clients.
  const canViewMessages = usePermission("messages_view_inbox");
  const canCreateClients = usePermission("create_clients");

  const switchToFacility = () => {
    setUserRole("facility_admin");
    window.location.href = "/facility/dashboard";
  };

  const switchToCustomer = () => {
    window.location.href = "/customer/dashboard";
  };

  const switchToAdmin = () => {
    setUserRole("super_admin");
    window.location.href = "/dashboard";
  };

  const logout = () => {
    clearEmployeeStaffId();
    window.location.href = "/employee/select";
  };

  // Secondary items (Messages + language). Inline on desktop; collapsed into the
  // overflow popover below xl — exactly one branch mounts. Mirrors the facility
  // header's FacilityHeaderActions.
  const secondary = (
    <>
      {canViewMessages && (
        <TopBarIconsNext
          getCounts={employeeTopBarCounts}
          messagesHref="/employee/inbox"
        />
      )}
      <HeaderDropdown />
    </>
  );

  const initials = staff ? getInitials(staff.firstName, staff.lastName) : "?";
  const avatarStyle = {
    backgroundColor: (staff?.colorHex ?? "#666") + "33",
    color: staff?.colorHex ?? "#666",
  };

  return (
    <header className="from-background to-muted/20 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-linear-to-r px-4 backdrop-blur-sm sm:px-6">
      {/* Left — global search (always on; scoped to what the viewer can see). */}
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors md:hidden" />
        <GlobalSearchNext
          className="hidden w-[460px] max-w-[480px] min-w-0 sm:flex"
          canCreateCustomer={canCreateClients}
        />
        <MobileSearch
          className="sm:hidden"
          canCreateCustomer={canCreateClients}
        />
      </div>

      {/* Right — action cluster (mirrors FacilityHeaderActions). */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Leftmost action — clock in / out, the employee's always-on core
            action (the slot the admin header gives to Calling). */}
        <ClockInOut staffId={staffId} />

        {/* "+ New" — self-gates its items; renders nothing if none permitted. */}
        <FacilityHeader facilityId={11} />

        {isWide ? (
          <div className="flex items-center gap-1">{secondary}</div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="More options"
                className="hover:bg-muted size-9 rounded-xl"
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto max-w-[80vw] p-2">
              <div className="flex flex-wrap items-center justify-end gap-1">
                {secondary}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Notification bell — always on; the personal center lives in-portal. */}
        <FacilityNotificationsDropdown
          facilityId={11}
          viewAllHref="/employee/notifications"
        />

        {/* Avatar / profile menu — role-colored initials, Profile Settings,
            portal + employee switching, and Logout. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 rounded-full px-2 py-1"
            >
              <Avatar className="size-7">
                <AvatarImage src={staff?.avatarUrl} />
                <AvatarFallback
                  className="text-xs font-medium"
                  style={avatarStyle}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {staff && (
                <span className="hidden text-sm font-medium sm:block">
                  {staff.firstName}
                </span>
              )}
              <ChevronDown className="text-muted-foreground size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarImage src={staff?.avatarUrl} />
                <AvatarFallback className="text-xs" style={avatarStyle}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {staff ? `${staff.firstName} ${staff.lastName}` : "Employee"}
                </p>
                <p className="text-muted-foreground text-xs">{staff?.email}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs font-normal">
              My Workspace
            </DropdownMenuLabel>
            {MY_WORKSPACE_LINKS.map((link) => (
              <DropdownMenuItem
                key={link.href}
                asChild
                className="cursor-pointer gap-2"
              >
                <Link href={link.href}>
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer gap-2">
              <Link href="/profile">
                <User className="size-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs font-normal">
              Switch Portal
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={switchToFacility}
              className="cursor-pointer gap-2"
            >
              <Building2 className="size-4" />
              Facility Admin View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={switchToCustomer}
              className="cursor-pointer gap-2"
            >
              <User className="size-4" />
              Customer Portal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={switchToAdmin}
              className="cursor-pointer gap-2"
            >
              <Shield className="size-4" />
              Super Admin
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs font-normal">
              Switch Employee
            </DropdownMenuLabel>
            <EmployeePortalSwitcher standalone={false} />

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer gap-2"
            >
              <LogOut className="size-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
