"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";
import { facilities } from "@/data/facilities";

export function FacilitySidebar() {
  const [isMounted, setIsMounted] = useState(false);
  // Show all menu items since permission system is removed
  const filteredMenuSections = useMemo((): MenuSection[] => {
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
            title: "Communications",
            url: "/facility/dashboard/communications",
            icon: MessageSquare,
            disabled: false,
            count: 5,
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
            title: "Grooming",
            url: "/facility/dashboard/services/grooming",
            icon: Scissors,
            disabled: false,
          },
          {
            title: "Retail / POS",
            url: "/facility/dashboard/services/retail",
            icon: ShoppingCart,
            disabled: false,
          },
          {
            title: "Scheduling",
            url: "/facility/dashboard/services/scheduling",
            icon: Clock,
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
            title: "Online Booking",
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
        items: [
          {
            title: "Marketing",
            url: "/facility/dashboard/marketing",
            icon: Megaphone,
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
          {
            title: "Settings",
            url: "/facility/dashboard/settings",
            icon: Settings,
            disabled: false,
          },
        ],
      },
    ];

    // Since permission system is removed, always show all items
    return allMenuSections;
  }, []);

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <GenericSidebar
      header={
        <div>
          <h2 className="text-lg font-semibold">
            {facility?.name || "Facility Dashboard"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {dateLabel}
          </p>
        </div>
      }
      menuSections={filteredMenuSections}
      onLogout={handleLogout}
    />
  );
}
