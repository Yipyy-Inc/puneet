"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Users,
  Briefcase,
  Building2,
  Clock,
  ArrowLeftRight,
  CalendarOff,
  FileText,
  BookOpen,
  Shield,
  FolderOpen,
  Settings,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const navItems = [
  {
    label: "Schedule",
    href: "/facility/dashboard/services/scheduling",
    icon: Calendar,
    exact: true,
  },
  {
    label: "Employees",
    href: "/facility/dashboard/services/scheduling/employees",
    icon: Users,
  },
  {
    label: "Departments",
    href: "/facility/dashboard/services/scheduling/departments",
    icon: Building2,
  },
  {
    label: "Positions",
    href: "/facility/dashboard/services/scheduling/positions",
    icon: Briefcase,
  },
  {
    label: "Time Off",
    href: "/facility/dashboard/services/scheduling/time-off",
    icon: CalendarOff,
  },
  {
    label: "Shift Swaps",
    href: "/facility/dashboard/services/scheduling/shift-swaps",
    icon: ArrowLeftRight,
  },
  {
    label: "Templates",
    href: "/facility/dashboard/services/scheduling/templates",
    icon: FileText,
  },
  {
    label: "Onboarding",
    href: "/facility/dashboard/services/scheduling/onboarding",
    icon: BookOpen,
  },
  {
    label: "Documents",
    href: "/facility/dashboard/services/scheduling/documents",
    icon: FolderOpen,
  },
  {
    label: "Warnings",
    href: "/facility/dashboard/services/scheduling/warnings",
    icon: Shield,
  },
  {
    label: "Settings",
    href: "/facility/dashboard/services/scheduling/settings",
    icon: Settings,
  },
];

export default function SchedulingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                <Clock className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Staff Scheduling
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage schedules, shifts, departments & workforce
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 px-6 pb-0">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-all",
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
