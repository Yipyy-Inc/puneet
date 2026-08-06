"use client";

import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { bookingQueries } from "@/lib/api/booking";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useMemo } from "react";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSignOutEverywhere } from "@/lib/auth/sign-out-client";
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
import { estimates } from "@/data/estimates";
import { reportCards } from "@/data/pet-data";
import {
  cameraIntegrationConfig,
  petCamAccessConfigs,
} from "@/data/camera-integration";
import { memberships } from "@/data/services-pricing";
import type {
  CameraRuleSet,
  CameraServiceType,
} from "@/types/camera-integration";

// ============================================================================
// THE BADGES USED TO BE COMPUTED AT MODULE LEVEL, off MOCK_CUSTOMER_ID = 15.
//
// Two problems, and the second is the one that made it visible. They were
// Alice Johnson's counts shown to whoever signed in — and because they were
// evaluated at IMPORT time rather than in the component, they could not have
// responded to a session even if one had been consulted. Frozen at the value
// they had when the bundle loaded.
//
// It showed up as one screen disagreeing with itself: the sidebar said
// "Report Cards 1" while the dashboard tile beside it said 0, because the tile
// had been converted and the badge had not.
//
// They live inside the component now, keyed to the signed-in person.
// ============================================================================

export function CustomerSidebar() {
  const signOutEverywhere = useSignOutEverywhere();
  const { selectedFacility } = useCustomerFacility();
  const isMounted = useHydrated();

  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { data: ownedPackages = [] } = useQuery({
    ...groomingQueries.customerPackagesForClient(customerId ?? -1),
    enabled: customerId != null,
  });

  const { data: myBookings = [] } = useQuery({
    ...bookingQueries.byClient(customerId ?? -1),
    enabled: customerId != null,
  });

  // Estimates awaiting the customer's response (sent, not yet accepted/declined).
  // Still a fixture — estimates have no backend yet — but keyed off the real
  // person, so it now counts nothing rather than counting somebody else's.
  const awaitingEstimateCount = useMemo(
    () =>
      customerId == null
        ? 0
        : estimates.filter(
            (e) => e.clientId === customerId && e.status === "sent",
          ).length,
    [customerId],
  );

  // Unread report cards for this customer's pets (viewedByCustomer === false).
  const unreadReportCardCount = useMemo(() => {
    const petIds = new Set((customer?.pets ?? []).map((p) => p.id));
    return reportCards.filter(
      (rc) => petIds.has(rc.petId) && rc.viewedByCustomer === false,
    ).length;
  }, [customer]);

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

    const activeStayServices: CameraServiceType[] = myBookings
      .filter(
        (b) =>
          b.facilityId === selectedFacility.id &&
          b.status === "confirmed" &&
          b.startDate <= today &&
          b.endDate >= today,
      )
      .map((b) => serviceMap[b.service])
      .filter((s): s is CameraServiceType => Boolean(s));

    const membershipPlanIds = memberships
      .filter(
        (m) => m.customerId === String(customerId) && m.status === "active",
      )
      .map((m) => m.planId);

    // Which catalogue packages this customer still holds. `status` is derived
    // server-side from the ledger and the clock, so an expired pack is already
    // marked expired — the old client-side date comparison could disagree with
    // the till by a timezone.
    const purchasedPackageIds = ownedPackages
      .filter((p) => p.status === "active")
      .map((p) => p.packageId);

    const customerServiceTypes: CameraServiceType[] = [
      ...new Set(
        myBookings
          .filter(
            (b) =>
              b.facilityId === selectedFacility.id && b.status === "confirmed",
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
  }, [isMounted, selectedFacility, ownedPackages, myBookings, customerId]);

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
    // The two counts became component state when they stopped being module
    // constants, so they belong here. Without them the badges render once with
    // the loading value and never update when the customer resolves — the
    // conversion would have had no visible effect at all.
  }, [camerasEnabled, isMounted, awaitingEstimateCount, unreadReportCardCount]);

  const header = (
    <div className="flex flex-col gap-0.5">
      <Link href="/customer/dashboard" className="text-sm font-semibold">
        {isMounted && selectedFacility ? selectedFacility.name : "Yipyy"}
      </Link>
      <span className="text-muted-foreground text-xs">Customer Portal</span>
    </div>
  );

  return (
    <GenericSidebar
      header={header}
      menuSections={menuSections}
      // Without this the sidebar still renders a Logout button, but its
      // onClick is undefined and pressing it does nothing at all.
      onLogout={() => void signOutEverywhere()}
    />
  );
}
