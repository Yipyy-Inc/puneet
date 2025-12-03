"use client";

import { useMemo } from "react";
import {
  Home,
  Users,
  PawPrint,
  Calendar,
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
  GraduationCap,
  ShoppingCart,
  Bed,
  Tags,
  Camera,
  Lightbulb,
  FileText,
} from "lucide-react";

import {
  GenericSidebar,
  MenuSection,
  MenuItem,
} from "@/components/ui/generic-sidebar";
import { useFacilityRole } from "@/hooks/use-facility-role";

export function FacilitySidebar() {
  const { canAccess, isLoading } = useFacilityRole();

  // Filter menu items based on role permissions
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
        label: "Customers & Pets",
        items: [
          {
            title: "Clients",
            url: "/facility/dashboard/clients",
            icon: Users,
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
          },
          {
            title: "Staff",
            url: "/facility/staff",
            icon: UserCheck,
            disabled: false,
          },
          {
            title: "Scheduling",
            url: "/facility/scheduling",
            icon: Clock,
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
            title: "Training",
            url: "/facility/training",
            icon: GraduationCap,
            disabled: false,
          },
          {
            title: "Retail / POS",
            url: "/facility/retail",
            icon: ShoppingCart,
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
          {
            title: "Inventory",
            url: "/facility/inventory",
            icon: Package,
            disabled: false,
          },
        ],
      },
      {
        label: "Reports & Marketing",
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
          {
            title: "Marketing",
            url: "/facility/dashboard/marketing",
            icon: Megaphone,
            disabled: false,
          },
          {
            title: "Communications",
            url: "/facility/dashboard/communications",
            icon: MessageSquare,
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

    // During loading, show all items
    if (isLoading) {
      return allMenuSections;
    }

    // Filter items based on role permissions
    return allMenuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item: MenuItem) => canAccess(item.url)),
      }))
      .filter((section) => section.items.length > 0);
  }, [canAccess, isLoading]);

  const handleLogout = () => {
    // TODO: Implement logout logic
  };

  return (
    <GenericSidebar
      header={
        <h2 className="text-lg font-semibold">Facility Dashboard</h2>
      }
      menuSections={filteredMenuSections}
      onLogout={handleLogout}
    />
  );
}
