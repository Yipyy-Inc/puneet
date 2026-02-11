"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  Home,
  Dog,
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  Settings,
  Camera,
} from "lucide-react";
import {
  GenericSidebar,
  type MenuSection,
} from "@/components/ui/generic-sidebar";
import { petCams } from "@/data/additional-features";

export function CustomerSidebar() {
  const { selectedFacility } = useCustomerFacility();

  // Check if cameras are enabled for customers
  const camerasEnabled = useMemo(() => {
    const customerAccessibleCameras = petCams.filter(
      (cam) =>
        cam.accessLevel === "public" || cam.accessLevel === "customers_only"
    );
    return customerAccessibleCameras.length > 0;
  }, []);

  const menuSections: MenuSection[] = useMemo(
    () => {
      const sections: MenuSection[] = [
      {
        label: "Overview",
        items: [
          {
            title: "Dashboard",
            url: "/customer/dashboard",
            icon: Home,
          },
        ],
      },
      {
        label: "Pets & Stays",
        items: [
          {
            title: "My Pets",
            url: "/customer/pets",
            icon: Dog,
          },
          {
            title: "Bookings",
            url: "/customer/bookings",
            icon: Calendar,
          },
          {
            title: "Report Cards",
            url: "/customer/report-cards",
            icon: FileText,
          },
        ],
      },
      {
        label: "Communication",
        items: [
          {
            title: "Messages",
            url: "/customer/messages",
            icon: MessageSquare,
          },
        ],
      },
      ];

      // Only add cameras section if enabled
      if (camerasEnabled) {
        sections.push({
          label: "Live View",
          items: [
            {
              title: "Live Cameras",
              url: "/customer/cameras",
              icon: Camera,
            },
          ],
        });
      }

      sections.push({
        label: "Account",
        items: [
          {
            title: "Billing & Payments",
            url: "/customer/billing",
            icon: CreditCard,
          },
          {
            title: "Settings",
            url: "/customer/settings",
            icon: Settings,
          },
        ],
      });

      return sections;
      },
    [camerasEnabled],
  );

  const header = (
    <div className="flex flex-col gap-0.5">
      <Link href="/customer/dashboard" className="font-semibold text-sm">
        {selectedFacility?.name ?? "Yipyy"}
      </Link>
      <span className="text-xs text-muted-foreground">Customer Portal</span>
    </div>
  );

  return (
    <GenericSidebar
      header={header}
      menuSections={menuSections}
    />
  );
}

