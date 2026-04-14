"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  Users,
  Briefcase,
  Building2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  CalendarOff,
  CalendarCheck,
  FileText,
  BookOpen,
  Shield,
  FolderOpen,
  Settings,
  Activity,
  ClipboardCheck,
  BarChart3,
  Bell,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CurrentUserProvider,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { ROLE_LABELS } from "@/lib/rbac";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Permission } from "@/lib/rbac";
import type { UserRole } from "@/types/scheduling";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Calendar;
  exact?: boolean;
  /** Permission required to see this nav item. Omit for visible-to-all. */
  requires?: Permission;
};

const navItems: NavItem[] = [
  {
    label: "Schedule",
    href: "/facility/dashboard/services/scheduling",
    icon: Calendar,
    exact: true,
    requires: "schedule.view",
  },
  {
    label: "Roster",
    href: "/facility/dashboard/services/scheduling/roster",
    icon: Activity,
    requires: "schedule.view",
  },
  {
    label: "Attendance",
    href: "/facility/dashboard/services/scheduling/attendance",
    icon: ClipboardCheck,
    requires: "attendance.view",
  },
  {
    label: "Employees",
    href: "/facility/dashboard/services/scheduling/employees",
    icon: Users,
    requires: "employee.view",
  },
  {
    label: "Departments",
    href: "/facility/dashboard/services/scheduling/departments",
    icon: Building2,
    requires: "department.manage",
  },
  {
    label: "Positions",
    href: "/facility/dashboard/services/scheduling/positions",
    icon: Briefcase,
    requires: "position.manage",
  },
  {
    label: "Time Off",
    href: "/facility/dashboard/services/scheduling/time-off",
    icon: CalendarOff,
    requires: "timeoff.approve",
  },
  {
    label: "Availability",
    href: "/facility/dashboard/services/scheduling/availability-changes",
    icon: CalendarCheck,
    requires: "availability.approve",
  },
  {
    label: "Shift Swaps",
    href: "/facility/dashboard/services/scheduling/shift-swaps",
    icon: ArrowLeftRight,
    requires: "shift.swap.approve",
  },
  {
    label: "Templates",
    href: "/facility/dashboard/services/scheduling/templates",
    icon: FileText,
    requires: "schedule.edit",
  },
  {
    label: "Onboarding",
    href: "/facility/dashboard/services/scheduling/onboarding",
    icon: BookOpen,
    requires: "employee.edit",
  },
  {
    label: "Documents",
    href: "/facility/dashboard/services/scheduling/documents",
    icon: FolderOpen,
    requires: "employee.view",
  },
  {
    label: "Warnings",
    href: "/facility/dashboard/services/scheduling/warnings",
    icon: Shield,
    requires: "employee.edit",
  },
  {
    label: "Reports",
    href: "/facility/dashboard/services/scheduling/reports",
    icon: BarChart3,
    requires: "report.view",
  },
  {
    label: "Notifications",
    href: "/facility/dashboard/services/scheduling/notifications",
    icon: Bell,
    requires: "messaging.send",
  },
  {
    label: "Company",
    href: "/facility/dashboard/services/scheduling/company",
    icon: Building,
    requires: "company.manage",
  },
  {
    label: "Settings",
    href: "/facility/dashboard/services/scheduling/settings",
    icon: Settings,
    requires: "settings.manage",
  },
];

const ROLES_FOR_SWITCH: UserRole[] = [
  "owner",
  "general_manager",
  "department_manager",
  "supervisor",
  "employee",
];

function NavTabs({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, items.length]);

  // Scroll the active tab into view on mount / pathname change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>("[data-active='true']");
    if (!active) return;
    const elRect = el.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (
      activeRect.left < elRect.left ||
      activeRect.right > elRect.right
    ) {
      active.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [pathname]);

  const scrollByDir = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = Math.max(el.clientWidth * 0.6, 160);
    el.scrollBy({
      left: dir === "left" ? -delta : delta,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll tabs left"
        onClick={() => scrollByDir("left")}
        className={cn(
          "absolute left-2 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground shadow-md transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-105",
          canLeft
            ? "translate-x-0 scale-100 opacity-100 pointer-events-auto"
            : "-translate-x-2 pointer-events-none scale-90 opacity-0",
        )}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll tabs right"
        onClick={() => scrollByDir("right")}
        className={cn(
          "absolute right-2 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground shadow-md transition-all duration-200 hover:bg-accent hover:text-foreground hover:scale-105",
          canRight
            ? "translate-x-0 scale-100 opacity-100 pointer-events-auto"
            : "translate-x-2 pointer-events-none scale-90 opacity-0",
        )}
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Fade edges */}
      <div
        aria-hidden
        className={cn(
          "from-background/95 pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8 bg-linear-to-r to-transparent transition-opacity",
          canLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "from-background/95 pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-linear-to-l to-transparent transition-opacity",
          canRight ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        ref={scrollRef}
        className={cn(
          "scrollbar-hidden flex items-center gap-1 overflow-x-auto scroll-smooth pb-0 transition-[padding] duration-200",
          canLeft ? "pl-12" : "pl-6",
          canRight ? "pr-12" : "pr-6",
        )}
      >
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/50",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SchedulingLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, setRole, can } = useCurrentUser();

  const visibleNav = navItems.filter(
    (item) => !item.requires || can(item.requires),
  );

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col overflow-x-hidden">
      {/* Header */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 w-full min-w-0 border-b backdrop-blur-sm">
        <div className="min-w-0 px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                <Clock className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight">
                  Staff Scheduling
                </h1>
                <p className="text-muted-foreground truncate text-sm">
                  Manage schedules, shifts, departments & workforce
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground hidden text-xs sm:inline">Viewing as</span>
              <Select
                value={user.role}
                onValueChange={(v) => setRole(v as UserRole)}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_FOR_SWITCH.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <NavTabs items={visibleNav} pathname={pathname} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
    </div>
  );
}

export default function SchedulingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrentUserProvider>
      <SchedulingLayoutInner>{children}</SchedulingLayoutInner>
    </CurrentUserProvider>
  );
}
