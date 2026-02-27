"use client";

import { useMemo, useState, useEffect } from "react";
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
  GraduationCap,
  Users,
  Gift,
  UserPlus,
} from "lucide-react";
import {
  GenericSidebar,
  type MenuSection,
} from "@/components/ui/generic-sidebar";
import { petCams, mobileAppSettings } from "@/data/additional-features";
import { bookings } from "@/data/bookings";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export function CustomerSidebar() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if customer has an active stay at the selected facility
  const hasActiveStay = useMemo(() => {
    if (!isMounted || !selectedFacility) return false;
    const today = new Date().toISOString().split("T")[0];
    return bookings.some(
      (b) =>
        b.clientId === MOCK_CUSTOMER_ID &&
        b.facilityId === selectedFacility.id &&
        b.status === "confirmed" &&
        b.startDate <= today &&
        b.endDate >= today,
    );
  }, [isMounted, selectedFacility]);

  // TODO: Replace with real membership logic when membership data is available
  const hasCameraMembership = false;

  // Check if cameras are enabled for customers (only on client)
  const camerasEnabled = useMemo(() => {
    if (!isMounted) return false; // Safe default during SSR
    if (!mobileAppSettings.enableLiveCamera) return false;

    const hasCameraAccess = hasActiveStay || hasCameraMembership;
    if (!hasCameraAccess) return false;

    const customerAccessibleCameras = petCams.filter(
      (cam) =>
        cam.accessLevel === "public" || cam.accessLevel === "customers_only",
    );
    return customerAccessibleCameras.length > 0;
  }, [isMounted, hasActiveStay, hasCameraMembership]);

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
            title: "Training",
            url: "/customer/training",
            icon: GraduationCap,
          },
          {
            title: "Makeup Sessions",
            url: "/customer/training/makeup",
            icon: GraduationCap,
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

      // Only add cameras section if enabled (only after mount to avoid hydration issues)
      if (isMounted && camerasEnabled) {
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
            title: "Loyalty & Rewards",
            url: "/customer/rewards",
            icon: Gift,
          },
          {
            title: "Refer a Friend",
            url: "/customer/refer",
            icon: UserPlus,
          },
          {
            title: "Documents & Agreements",
            url: "/customer/documents",
            icon: FileText,
          },
          {
            title: "Household & Contacts",
            url: "/customer/household",
            icon: Users,
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
    [camerasEnabled, isMounted],
  );

  const header = (
    <div className="flex flex-col gap-0.5">
      <Link href="/customer/dashboard" className="font-semibold text-sm">
        {isMounted && selectedFacility ? selectedFacility.name : "Yipyy"}
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

