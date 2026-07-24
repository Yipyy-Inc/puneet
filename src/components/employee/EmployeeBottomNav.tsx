"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Calendar,
  CheckSquare,
  Users,
  User,
  RefreshCw,
  CalendarClock,
  FolderOpen,
  TrendingUp,
  FileText,
  Bell,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { facilityStaff } from "@/data/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { getOperationsNav } from "@/lib/nav/operations-nav";
import {
  fullNameOf,
  RolePill,
} from "@/app/facility/dashboard/staff/_components/staff-shared";

interface NavSlot {
  title: string;
  url: string;
  icon: React.ElementType;
}

const isActive = (pathname: string, url: string) =>
  url === "/employee"
    ? pathname === "/employee"
    : pathname === url || pathname.startsWith(url + "/");

// The account links surfaced in the Profile sheet (beyond the fixed tabs).
const ACCOUNT_LINKS: NavSlot[] = [
  { title: "Availability", url: "/employee/availability", icon: CalendarClock },
  { title: "Notifications", url: "/employee/notifications", icon: Bell },
  { title: "My Documents", url: "/employee/documents", icon: FolderOpen },
  { title: "My Performance", url: "/employee/performance", icon: TrendingUp },
  { title: "My HR Records", url: "/employee/write-ups", icon: FileText },
];

export function EmployeeBottomNav({ staffId }: { staffId: string }) {
  const pathname = usePathname();
  const { resolvePermissions } = useFacilityRbac();
  const staff = facilityStaff.find((s) => s.id === staffId);

  // Role-contextual slot = the viewer's first permitted Operations section (A2
  // nav), mirroring the sidebar's permission-gated NAV_MODEL — never a role name.
  const operations = getOperationsNav(resolvePermissions(staffId));
  const roleSection = operations[0];
  const roleSlot: NavSlot = roleSection?.items[0]
    ? {
        title: roleSection.label,
        url: roleSection.items[0].url,
        icon: roleSection.items[0].icon,
      }
    : { title: "Clients", url: "/employee/clients", icon: Users };

  const tabs: NavSlot[] = [
    { title: "Home", url: "/employee", icon: Home },
    { title: "Schedule", url: "/employee/schedule", icon: Calendar },
    { title: "Tasks", url: "/employee/tasks", icon: CheckSquare },
    roleSlot,
  ];

  return (
    <nav className="bg-background/95 supports-backdrop-filter:bg-background/70 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(pathname, tab.url);
        return (
          <Link
            key={tab.title}
            href={tab.url}
            className={cn(
              // Large touch target (≥56px tall, full-width column).
              "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate">{tab.title}</span>
          </Link>
        );
      })}

      {/* Profile / account sheet */}
      <Sheet>
        <SheetTrigger
          className="text-muted-foreground hover:text-foreground flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium transition-colors"
          aria-label="Profile and account"
        >
          <User className="size-5" />
          <span>Profile</span>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{staff ? fullNameOf(staff) : "My account"}</SheetTitle>
          </SheetHeader>
          {staff && (
            <div className="px-1">
              <RolePill role={staff.primaryRole} />
            </div>
          )}
          <div className="mt-2 grid gap-1 pb-4">
            {ACCOUNT_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <SheetClose asChild key={link.url}>
                  <Link
                    href={link.url}
                    className="hover:bg-muted flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
                  >
                    <Icon className="text-muted-foreground size-5" />
                    {link.title}
                  </Link>
                </SheetClose>
              );
            })}
            <SheetClose asChild>
              <Link
                href="/employee/select"
                className="hover:bg-muted text-muted-foreground flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
              >
                <RefreshCw className="size-5" />
                Switch employee
              </Link>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
