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
  ArrowLeftRight,
  FileText,
  DollarSign,
  Building2,
  ClipboardList,
  Puzzle,
} from "lucide-react";

const tabs = [
  {
    name: "Calendar",
    href: "/facility/dashboard/services/grooming",
    icon: Calendar,
    exact: true,
  },
  {
    name: "Stations",
    href: "/facility/dashboard/services/grooming/stations",
    icon: Building2,
  },
  {
    name: "Check-In / Out",
    href: "/facility/dashboard/services/grooming/check-in",
    icon: ArrowLeftRight,
    matchPaths: [
      "/facility/dashboard/services/grooming/check-in",
      "/facility/dashboard/services/grooming/check-out",
    ],
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
    name: "Add-Ons",
    href: "/facility/dashboard/services/grooming/add-ons",
    icon: Puzzle,
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
    href: "/facility/dashboard/settings?section=grooming",
    icon: Settings,
  },
];

export function GroomingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-6">
      {tabs.map((tab) => {
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
              "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
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
