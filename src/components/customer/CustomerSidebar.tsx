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
  Gift,
  UserPlus,
  Package,
  Wallet,
  Ticket,
} from "lucide-react";
import {
  GenericSidebar,
  type MenuSection,
} from "@/components/ui/generic-sidebar";
import { petCams, mobileAppSettings } from "@/data/additional-features";
import { bookings } from "@/data/bookings";
import { estimates } from "@/data/estimates";
import { reportCards } from "@/data/pet-data";
import { clients } from "@/data/clients";
import {
  cameraIntegrationConfig,
  petCamAccessConfigs,
} from "@/data/camera-integration";
import { memberships, customerPackagePurchases } from "@/data/services-pricing";
import type {
  CameraRuleSet,
  CameraServiceType,
} from "@/types/camera-integration";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

// Estimates awaiting the customer's response (sent, not yet accepted/declined).
const awaitingEstimateCount = estimates.filter(
  (e) => e.clientId === MOCK_CUSTOMER_ID && e.status === "sent",
).length;

// Unread report cards for this customer's pets (viewedByCustomer === false).
const customerPetIds = new Set(
  clients.find((c) => c.id === MOCK_CUSTOMER_ID)?.pets.map((p) => p.id) ?? [],
);
const unreadReportCardCount = reportCards.filter(
  (rc) => customerPetIds.has(rc.petId) && rc.viewedByCustomer === false,
).length;

export function CustomerSidebar() {
  const { selectedFacility } = useCustomerFacility();
  const isMounted = useHydrated();

  // Build access context for rule evaluation (only on client after mount)
  const accessContext = useMemo(() => {
    if (!isMounted || !selectedFacility) return null;

    const today = new Date().toISOString().split("T")[0];
    const serviceMap: Record<string, CameraServiceType> = {
      boarding: "boarding",
      daycare: "daycare",
      grooming: "grooming",
      training: "training",
    };

    const activeStayServices: CameraServiceType[] = bookings
      .filter(
        (b) =>
          b.clientId === MOCK_CUSTOMER_ID &&
          b.facilityId === selectedFacility.id &&
          b.status === "confirmed" &&
          b.startDate <= today &&
          b.endDate >= today,
      )
      .map((b) => serviceMap[b.service])
      .filter((s): s is CameraServiceType => Boolean(s));

    const membershipPlanIds = memberships
      .filter(
        (m) =>
          m.customerId === String(MOCK_CUSTOMER_ID) && m.status === "active",
      )
      .map((m) => m.planId);

    const purchasedPackageIds = customerPackagePurchases
      .filter(
        (p) =>
          p.customerId === String(MOCK_CUSTOMER_ID) &&
          new Date(p.expiresAt) > new Date(),
      )
      .map((p) => p.packageId);

    const customerServiceTypes: CameraServiceType[] = [
      ...new Set(
        bookings
          .filter(
            (b) =>
              b.clientId === MOCK_CUSTOMER_ID &&
              b.facilityId === selectedFacility.id &&
              b.status === "confirmed",
          )
          .map((b) => serviceMap[b.service])
          .filter((s): s is CameraServiceType => Boolean(s)),
      ),
    ];

    // Operating hours check is intentionally permissive in sidebar — just show the nav item
    const isWithinOperatingHours = true;

    return {
      activeStayServices,
      membershipPlanIds,
      purchasedPackageIds,
      customerServiceTypes,
      isWithinOperatingHours,
    };
  }, [isMounted, selectedFacility]);

  function passesRuleSet(ruleSet: CameraRuleSet): boolean {
    if (!accessContext || !ruleSet.enabled || ruleSet.rules.length === 0)
      return false;
    const results = ruleSet.rules.map((rule) => {
      if (rule.type === "active_stay") {
        return rule.services.some((s) =>
          accessContext.activeStayServices.includes(s),
        );
      }
      if (rule.type === "operation_hours")
        return accessContext.isWithinOperatingHours;
      if (rule.type === "membership") {
        return rule.membershipPlanIds.some((id) =>
          accessContext.membershipPlanIds.includes(id),
        );
      }
      if (rule.type === "package") {
        return rule.packageIds.some((id) =>
          accessContext.purchasedPackageIds.includes(id),
        );
      }
      if (rule.type === "service_customer") {
        return rule.services.some((s) =>
          accessContext.customerServiceTypes.includes(s),
        );
      }
      return false;
    });
    return ruleSet.logic === "any"
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  // Check if cameras are enabled for customers (only on client)
  const camerasEnabled = useMemo(() => {
    if (!isMounted || !accessContext) return false;
    if (!mobileAppSettings.enableLiveCamera) return false;
    if (!cameraIntegrationConfig.isEnabled) return false;

    return petCams.some((cam) => {
      const cfg = petCamAccessConfigs[cam.id];
      if (!cfg?.isCustomerVisible || !cam.isOnline) return false;
      const ruleSet = cfg.useGlobalRules
        ? cameraIntegrationConfig.globalRuleSet
        : cfg.customRuleSet;
      return ruleSet ? passesRuleSet(ruleSet) : false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, accessContext]);

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
            title: "Estimates",
            url: "/customer/estimates",
            icon: FileText,
            count: awaitingEstimateCount,
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
            title: "Report Cards",
            url: "/customer/report-cards",
            icon: FileText,
            count: unreadReportCardCount,
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
          title: "My Wallet",
          url: "/customer/wallet",
          icon: Wallet,
        },
        {
          title: "Gift Cards",
          url: "/customer/gift-cards",
          icon: Gift,
        },
        {
          title: "Loyalty & Rewards",
          url: "/customer/rewards",
          icon: Ticket,
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
          title: "Settings",
          url: "/customer/settings",
          icon: Settings,
        },
      ],
    });

    return sections;
  }, [camerasEnabled, isMounted]);

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
