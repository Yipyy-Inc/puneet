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
  Route,
  Activity,
} from "lucide-react";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { useGroomingStations } from "@/hooks/use-grooming-stations";

type Tab = {
  name: string;
  href: string;
  icon: typeof Calendar;
  exact?: boolean;
  matchPaths?: string[];
};

const tabs: Tab[] = [
  {
    name: "Calendar",
    href: "/facility/dashboard/services/grooming",
    icon: Calendar,
    exact: true,
  },
  {
    name: "Route Planner",
    href: "/facility/dashboard/services/grooming/route-planner",
    icon: Route,
  },
  {
    name: "Live Tracking",
    href: "/facility/dashboard/services/grooming/live-tracking",
    icon: Activity,
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
    href: "/facility/dashboard/settings?section=grooming",
    icon: Settings,
  },
];

export function GroomingNav() {
  const pathname = usePathname();
  const { enabled: mobileEnabled, hasActiveVans } = useMobileGrooming();
  const { stations } = useGroomingStations();
  // Mobile-only tabs hide when the facility has the feature flag off OR
  // when there are zero active vans (solo-salon facility type) — there's
  // nothing for Route Planner or Live Tracking to show without a van.
  const showMobileTabs = mobileEnabled && hasActiveVans;
  // Mobile-only facility — has vans but no stations. Route Planner takes
  // over as the primary daily view, so it bumps to the front of the nav.
  const isMobileOnly = hasActiveVans && stations.length === 0;

  const filteredTabs = tabs.filter((tab) => {
    if (tab.name === "Route Planner") return showMobileTabs;
    if (tab.name === "Live Tracking") return showMobileTabs;
    return true;
  });
  // When mobile-only, lift Route Planner to position 0 and push Calendar
  // behind it. Order otherwise stays as authored.
  const visibleTabs = isMobileOnly
    ? (() => {
        const routeIdx = filteredTabs.findIndex(
          (t) => t.name === "Route Planner",
        );
        if (routeIdx <= 0) return filteredTabs;
        const next = [...filteredTabs];
        const [route] = next.splice(routeIdx, 1);
        next.unshift(route);
        return next;
      })()
    : filteredTabs;

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
