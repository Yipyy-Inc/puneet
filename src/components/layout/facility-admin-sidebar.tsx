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
          title: t("clients"),
          url: "/facility/dashboard/clients",
          icon: Users,
          disabled: false,
        },
        {
          title: t("customerReach"),
          url: "/facility/customer-reach",
          icon: MessageSquare,
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
      label: tCommon("services"),
      items: [
        {
          title: tServices("daycare"),
          url: "/facility/dashboard/services/daycare",
          icon: PawPrint,
          disabled: false,
        },
        {
          title: tServices("grooming"),
          url: "/facility/dashboard/services/grooming",
          icon: PawPrint,
          disabled: false,
        },
        {
          title: tServices("boarding"),
          url: "/facility/dashboard/services/boarding",
          icon: PawPrint,
          disabled: false,
        },
        {
          title: tServices("veterinary"),
          url: "/facility/dashboard/services/vet",
          icon: PawPrint,
          disabled: false,
        },
        {
          title: tServices("store"),
          url: "/facility/dashboard/services/store",
          icon: PawPrint,
          disabled: false,
        },
      ],
    },
    {
      label: t("management"),
      items: [
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
          title: t("inventory"),
          url: "/facility/inventory",
          icon: Package,
          disabled: false,
        },
        {
          title: "Billing",
          url: "/facility/dashboard/billing",
          icon: DollarSign,
          disabled: false,
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
