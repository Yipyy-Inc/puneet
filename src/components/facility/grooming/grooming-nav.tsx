"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Users,
  Package,
  BoxesIcon,
  Settings,
  FileText,
  DollarSign,
  Building2,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { settingsHref } from "@/lib/settings/nav";

type Tab = {
  name: string;
  href: string;
  icon: typeof Calendar;
  exact?: boolean;
  matchPaths?: string[];
};

const tabs: Tab[] = [
  {
    name: "Check-In Board",
    href: "/facility/dashboard/services/grooming",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Calendar",
    href: "/facility/dashboard/services/grooming/calendar",
    icon: Calendar,
  },
  {
    name: "Stations",
    href: "/facility/dashboard/services/grooming/stations",
    icon: Building2,
  },
  {
    name: "Groomers",
    href: "/facility/dashboard/services/grooming/stylists",
    icon: Users,
  },
  {
    name: "Packages",
    href: "/facility/dashboard/services/grooming/packages",
    icon: Package,
  },
  {
    name: "Inventory",
    href: "/facility/dashboard/services/grooming/inventory",
    icon: BoxesIcon,
  },
  {
    name: "Rates",
    href: "/facility/dashboard/services/grooming/rates",
    icon: DollarSign,
  },
  {
    name: "Tasks",
    href: "/facility/dashboard/services/grooming/tasks",
    icon: ClipboardList,
  },
  {
    name: "Report Cards",
    href: "/facility/dashboard/services/grooming/report-cards",
    icon: FileText,
  },
  {
    name: "Settings",
    href: settingsHref("grooming"),
    icon: Settings,
  },
];

export function GroomingNav() {
  const pathname = usePathname();
  // Route Planner and Live Tracking are gone (2026-09-12). The planner drew
  // stops at coordinates invented from the address text, matched vans to
  // groomers by an id they never share, and its "Confirm & Notify Clients"
  // notified nobody; live tracking plotted generated van pings. There is no
  // GPS source and no route table, so neither could be made true.
  const visibleTabs = tabs;

  return (
    <nav className="flex gap-0.5 overflow-x-auto px-4">
      {visibleTabs.map((tab) => {
        const isActive = tab.matchPaths
          ? tab.matchPaths.some((p) => pathname.startsWith(p))
          : tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-2.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              "hover:bg-muted/50",
              isActive
                ? "border-primary bg-background text-primary border-b-2"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
