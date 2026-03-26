"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useHydrated } from "@/hooks/use-hydrated";
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
  Package,
  ClipboardCheck,
} from "lucide-react";
import {
  GenericSidebar,
  type MenuSection,
} from "@/components/ui/generic-sidebar";
import { petCams, mobileAppSettings } from "@/data/additional-features";
import { bookings } from "@/data/bookings";
import { useCustomServices } from "@/hooks/use-custom-services";
import { resolveIcon } from "@/lib/service-registry";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export function CustomerSidebar() {
  const { selectedFacility } = useCustomerFacility();
  const isMounted = useHydrated();
  const { activeModules } = useCustomServices();

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

  const menuSections: MenuSection[] = useMemo(() => {
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
            title: "YipyyGo",
            url: "/customer/yipyygo",
            icon: ClipboardCheck,
          },
          {
            title: "Packages & Memberships",
            url: "/customer/packages",
            icon: Package,
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

    // Add customer-visible custom service modules (only after mount to avoid hydration issues)
    if (isMounted) {
      const customModuleItems = activeModules
        .filter((m) => m.onlineBooking.enabled && m.showInSidebar)
        .sort((a, b) => a.sidebarPosition - b.sidebarPosition)
        .map((m) => ({
          title: m.name,
          url: `/customer/services/${m.slug}`,
          icon: resolveIcon(m.icon),
        }));

      if (customModuleItems.length > 0) {
        sections.push({
          label: "Additional Services",
          items: customModuleItems,
        });
      }
    }

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
  }, [camerasEnabled, isMounted, activeModules]);

  const header = (
    <div className="flex flex-col gap-0.5">
      <Link href="/customer/dashboard" className="text-sm font-semibold">
        {isMounted && selectedFacility ? selectedFacility.name : "Yipyy"}
      </Link>
      <span className="text-muted-foreground text-xs">Customer Portal</span>
    </div>
  );

  return <GenericSidebar header={header} menuSections={menuSections} />;
}
