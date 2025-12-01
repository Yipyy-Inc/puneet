"use client";

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
} from "lucide-react";
import { useTranslations } from "next-intl";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";

export function FacilitySidebar() {
  const t = useTranslations("navigation");
  const tServices = useTranslations("services");
  const tCommon = useTranslations("common");

  const menuSections: MenuSection[] = [
    {
      label: t("overview"),
      items: [
        {
          title: t("dashboard"),
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
          title: t("clients"),
          url: "/facility/dashboard/clients",
          icon: Users,
          disabled: false,
        },
        {
          title: tCommon("pets"),
          url: "/facility/dashboard/pets",
          icon: PawPrint,
          disabled: false,
        },
      ],
    },
    {
      label: t("operations"),
      items: [
        {
          title: tCommon("bookings"),
          url: "/facility/dashboard/bookings",
          icon: Calendar,
          disabled: false,
        },
        {
          title: t("staff"),
          url: "/facility/staff",
          icon: UserCheck,
          disabled: false,
        },
        {
          title: t("scheduling"),
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
      ],
    },
    {
      label: "Modules",
      items: [
        {
          title: tServices("daycare"),
          url: "/facility/dashboard/services/daycare",
          icon: PawPrint,
          disabled: false,
        },
        {
          title: tServices("boarding"),
          url: "/facility/dashboard/services/boarding",
          icon: Bed,
          disabled: false,
        },
        {
          title: tServices("grooming"),
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
          title: t("inventory"),
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
          title: "Marketing",
          url: "/facility/dashboard/marketing",
          icon: Megaphone,
          disabled: false,
        },
        {
          title: t("customerReach"),
          url: "/facility/customer-reach",
          icon: MessageSquare,
          disabled: false,
        },
      ],
    },
    {
      label: t("management"),
      items: [
        {
          title: t("incidents"),
          url: "/facility/dashboard/incidents",
          icon: AlertTriangle,
          disabled: true,
        },
        {
          title: tCommon("settings"),
          url: "/facility/dashboard/settings",
          icon: Settings,
          disabled: true,
        },
      ],
    },
  ];

  const handleLogout = () => {
    // TODO: Implement logout logic
  };

  return (
    <GenericSidebar
      header={
        <h2 className="text-lg font-semibold">{t("facilityDashboard")}</h2>
      }
      menuSections={menuSections}
      onLogout={handleLogout}
    />
  );
}
