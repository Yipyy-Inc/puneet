"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Route,
  Activity,
  Building2,
  Users,
  Package,
  BoxesIcon,
  DollarSign,
  ClipboardList,
  FileText,
} from "lucide-react";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { CheckInBoard } from "@/components/facility/grooming/check-in-board";
import { GroomingCalendar } from "@/components/facility/grooming/grooming-calendar";
import { RoutePlannerPage } from "@/components/facility/grooming/route-planner-page";
import { LiveTrackingPage } from "@/components/facility/grooming/live-tracking-page";
import { GroomingStationsClient } from "@/components/rooms/GroomingStationsClient";
import GroomersPage from "@/app/facility/dashboard/services/grooming/stylists/page";
import { GroomingPrepaidPackages } from "@/components/facility/grooming/grooming-prepaid-packages";
import InventoryPage from "@/app/facility/dashboard/services/grooming/inventory/page";
import { GroomingRates } from "@/components/facility/grooming/grooming-rates";
import { ModuleTasksPage } from "@/components/tasks/ModuleTasksPage";
import { ReportCardsModule } from "@/components/facility/ReportCardsModule";

// ============================================================================
// Section 5A — the employee grooming module.
//
// Renders the SAME grooming UI as the admin module (src/app/facility/dashboard/
// services/grooming/*) — the identical tab components — inside the /employee
// shell (so the FacilityRbacProvider is active). Per-key gating lives INSIDE the
// reused components (perform_grooming, view_grooming_queue, view_booking_amounts,
// grooming_edit_pricing, grooming_manage_styles, create_bookings,
// grooming_upload_photos), so admin and employee share one implementation and
// admin — with the keys granted — sees everything.
//
// Admin uses per-route pages under a shared layout; here the tabs are local
// state so the whole module lives on the single /employee/grooming route.
// ============================================================================

type GroomingTab = {
  id: string;
  name: string;
  icon: typeof Calendar;
  render: () => ReactNode;
  /** Mobile-grooming-only tabs hide unless the facility runs vans. */
  mobileOnly?: boolean;
};

const TABS: GroomingTab[] = [
  {
    id: "board",
    name: "Check-In Board",
    icon: LayoutDashboard,
    render: () => <CheckInBoard />,
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    render: () => <GroomingCalendar />,
  },
  {
    id: "route-planner",
    name: "Route Planner",
    icon: Route,
    render: () => <RoutePlannerPage />,
    mobileOnly: true,
  },
  {
    id: "live-tracking",
    name: "Live Tracking",
    icon: Activity,
    render: () => <LiveTrackingPage />,
    mobileOnly: true,
  },
  {
    id: "stations",
    name: "Stations",
    icon: Building2,
    render: () => <GroomingStationsClient facilityId={11} />,
  },
  {
    id: "groomers",
    name: "Groomers",
    icon: Users,
    render: () => <GroomersPage />,
  },
  {
    id: "packages",
    name: "Packages",
    icon: Package,
    render: () => <GroomingPrepaidPackages />,
  },
  {
    id: "inventory",
    name: "Inventory",
    icon: BoxesIcon,
    render: () => <InventoryPage />,
  },
  {
    id: "rates",
    name: "Rates",
    icon: DollarSign,
    // Rates renders read-only without grooming_edit_pricing (gated in the
    // component itself — 3B), so the tab stays visible for everyone.
    render: () => <GroomingRates />,
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: ClipboardList,
    render: () => <ModuleTasksPage moduleId="grooming" moduleName="Grooming" />,
  },
  {
    id: "report-cards",
    name: "Report Cards",
    icon: FileText,
    render: () => <ReportCardsModule defaultServiceType="grooming" />,
  },
];

export function EmployeeGroomingModule() {
  const { enabled: mobileEnabled, hasActiveVans } = useMobileGrooming();
  const showMobileTabs = mobileEnabled && hasActiveVans;

  const tabs = TABS.filter((t) => (t.mobileOnly ? showMobileTabs : true));
  const [activeId, setActiveId] = useState("board");
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b">
        <nav
          className="flex gap-0.5 overflow-x-auto px-4"
          aria-label="Grooming tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active?.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
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
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 p-4">{active?.render()}</div>
    </div>
  );
}
