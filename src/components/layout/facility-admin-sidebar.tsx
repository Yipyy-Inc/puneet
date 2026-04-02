"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  Home,
  Users,
  PawPrint,
  Calendar,
  CalendarClock,
  UserCheck,
  Package,
  Clock,
  MessageSquare,
  Phone,
  Zap,
  DollarSign,
  BarChart3,
  Megaphone,
  AlertTriangle,
  Settings,
  Grid3X3,
  Scissors,
  ShoppingCart,
  Bed,
  Tags,
  Camera,
  Lightbulb,
  FileText,
  GraduationCap,
  ClipboardList,
  LayoutTemplate,
  Plus,
} from "lucide-react";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";
import { facilities } from "@/data/facilities";
import { useCustomServices } from "@/hooks/use-custom-services";
import { resolveIcon } from "@/lib/service-registry";

export function FacilitySidebar() {
  const isMounted = useHydrated();
  const { activeModules } = useCustomServices();

  // Show all menu items since permission system is removed
  const filteredMenuSections = useMemo((): MenuSection[] => {
    // Build custom service sidebar items from active modules that have showInSidebar
    const customServiceItems = activeModules
      .filter((m) => m.showInSidebar)
      .sort((a, b) => a.sidebarPosition - b.sidebarPosition)
      .map((m) => ({
        title: m.name,
        url: `/facility/dashboard/services/custom/${m.slug}`,
        icon: resolveIcon(m.icon),
        disabled: false,
      }));

    const allMenuSections: MenuSection[] = [
      {
        label: "Overview",
        items: [
          {
            title: "Dashboard",
            url: "/facility/dashboard",
            icon: Home,
            disabled: false,
          },
          {
            title: "Kennel View",
            url: "/facility/dashboard/kennel-view",
            icon: Grid3X3,
            disabled: false,
          },
        ],
      },
      {
        items: [
          {
            title: "Customer",
            url: "/facility/dashboard/clients",
            icon: Users,
            disabled: false,
            count: 3,
          },
        ],
      },
      {
        items: [
          {
            title: "Grooming",
            url: "/facility/dashboard/services/grooming",
            icon: Scissors,
            disabled: false,
          },
        ],
      },
      {
        items: [
          {
            title: "Scheduling",
            url: "/facility/dashboard/services/scheduling",
            icon: Clock,
            disabled: false,
          },
        ],
      },
      {
        items: [
          {
            title: "Calling",
            url: "/facility/dashboard/calling",
            icon: Phone,
            disabled: false,
          },
        ],
      },
      {
        items: [
          {
            title: "Messaging",
            url: "/facility/dashboard/messaging",
            icon: MessageSquare,
            disabled: false,
          },
        ],
      },
      {
        items: [
          {
            title: "Automations",
            url: "/facility/dashboard/automations",
            icon: Zap,
            disabled: false,
          },
        ],
      },
      {
        label: "Modules",
        items: [
          {
            title: "Daycare",
            url: "/facility/dashboard/services/daycare",
            icon: PawPrint,
            disabled: false,
          },
          {
            title: "Boarding",
            url: "/facility/dashboard/services/boarding",
            icon: Bed,
            disabled: false,
          },
          {
            title: "Training",
            url: "/facility/dashboard/services/training",
            icon: GraduationCap,
            disabled: false,
          },
          {
            title: "Retail / POS",
            url: "/facility/dashboard/services/retail",
            icon: ShoppingCart,
            disabled: false,
          },
          ...customServiceItems,
          {
            title: "+ Request Module",
            url: "/facility/dashboard/modules/request",
            icon: Plus,
            disabled: false,
          },
        ],
      },
      {
        label: "Operations",
        items: [
          {
            title: "Bookings",
            url: "/facility/dashboard/bookings",
            icon: Calendar,
            disabled: false,
            count: 8,
          },
          {
            title: "Tasks",
            url: "/facility/dashboard/tasks",
            icon: ClipboardList,
            disabled: false,
            count: 2,
          },
          {
            title: "Booking Requests",
            url: "/facility/dashboard/online-booking",
            icon: CalendarClock,
            disabled: false,
          },
          {
            title: "Users",
            url: "/facility/dashboard/staff",
            icon: UserCheck,
            disabled: false,
          },
          {
            title: "Inventory",
            url: "/facility/dashboard/inventory",
            icon: Package,
            disabled: false,
          },
          {
            title: "Services & Pricing",
            url: "/facility/services",
            icon: Tags,
            disabled: false,
          },
          {
            title: "Live Pet Cams",
            url: "/facility/dashboard/petcams",
            icon: Camera,
            disabled: false,
          },
        ],
      },
      {
        label: "Financial",
        items: [
          {
            title: "Payments & Billing",
            url: "/facility/dashboard/billing",
            icon: DollarSign,
            disabled: false,
          },
        ],
      },
      {
        label: "Reports",
        items: [
          {
            title: "Reports & Analytics",
            url: "/facility/dashboard/reports",
            icon: BarChart3,
            disabled: false,
          },
          {
            title: "Smart Insights",
            url: "/facility/dashboard/insights",
            icon: Lightbulb,
            disabled: false,
          },
        ],
      },
      {
        label: "Marketing",
        items: [
          {
            title: "Marketing",
            url: "/facility/dashboard/marketing",
            icon: Megaphone,
            disabled: false,
          },
          {
            title: "Loyalty Reports",
            url: "/facility/dashboard/marketing/loyalty-reports",
            icon: BarChart3,
            disabled: false,
          },
        ],
      },
      {
        label: "Management",
        items: [
          {
            title: "Incidents",
            url: "/facility/dashboard/incidents",
            icon: AlertTriangle,
            disabled: false,
            count: 2,
          },
          {
            title: "Digital Waivers",
            url: "/facility/dashboard/waivers",
            icon: FileText,
            disabled: false,
          },
        ],
      },
      {
        label: "Settings",
        items: [
          {
            title: "Settings",
            url: "/facility/dashboard/settings",
            icon: Settings,
            disabled: false,
          },
          {
            title: "Intake Forms",
            url: "/facility/dashboard/forms",
            icon: ClipboardList,
            disabled: false,
          },
          {
            title: "Templates",
            url: "/facility/dashboard/forms/templates",
            icon: LayoutTemplate,
            disabled: false,
          },
        ],
      },
    ];

    // Since permission system is removed, always show all items
    return allMenuSections;
  }, [activeModules]);

  const handleLogout = () => {
    // TODO: Implement logout logic
  };

  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const dateLabel = isMounted
    ? new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <GenericSidebar
      header={
        <div className="flex items-center gap-3">
          {facility?.logo ? (
            <Image
              src={facility.logo}
              alt={facility.name}
              width={40}
              height={40}
              className="size-8 rounded-lg object-contain md:size-10"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold md:size-10 md:text-sm">
              {(facility?.name || "F")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold md:text-base">
              {facility?.name || "Facility Dashboard"}
            </h2>
            <p className="text-muted-foreground text-xs">{dateLabel}</p>
          </div>
        </div>
      }
      menuSections={filteredMenuSections}
      onLogout={handleLogout}
    />
  );
}
