"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { insightQueries } from "@/lib/api/smart-insights";
import {
  Home,
  Users,
  Calendar,
  CalendarClock,
  UserCheck,
  Package,
  Clock,
  MessageSquare,
  Phone,
  Zap,
  DollarSign,
  CreditCard,
  BarChart3,
  Megaphone,
  AlertTriangle,
  Settings,
  Grid3X3,
  Scissors,
  ShoppingCart,
  Tags,
  Camera,
  Lightbulb,
  FileText,
  GraduationCap,
  ClipboardList,
  ClipboardCheck,
  HeartHandshake,
  Gift,
  ShieldCheck,
  Award,
} from "lucide-react";

import {
  GenericSidebar,
  MenuItem,
  MenuSection,
} from "@/components/ui/generic-sidebar";
import { facilities } from "@/data/facilities";
import { LocationContextSelector } from "@/components/hq/LocationContextSelector";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import type { PermissionKey } from "@/types/facility-staff";

/** A nav item plus the minimum permission (Table 18) needed to see it. */
type GatedItem = MenuItem & { require?: PermissionKey };
type GatedSection = { label?: string; items: GatedItem[] };

export function FacilitySidebar() {
  const isMounted = useHydrated();

  // The acting user's effective permissions (F0.2). Owner/Admin resolve to the
  // full set, so every section passes; lower roles see only what they hold.
  const permissions = useEffectivePermissions();

  // Static facility ID for now (would come from user token in production).
  const facilityId = 11;

  // Spec § 10.7: nav badge updates every 5 minutes via lightweight polling.
  const { data: highPriorityCount = 0 } = useQuery({
    ...insightQueries.highPriorityCount(facilityId),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Gate every section/item through the resolver — the sidebar makes no
  // independent permission decisions. Items with no `require` are always shown.
  const filteredMenuSections = useMemo((): MenuSection[] => {
    const allMenuSections: GatedSection[] = [
      {
        items: [
          {
            title: "Dashboard",
            url: "/facility/dashboard",
            icon: Home,
            disabled: false,
          },
        ],
      },
      {
        label: "Calendars",
        items: [
          {
            title: "Facility Calendar",
            url: "/facility/dashboard/calendar",
            icon: Calendar,
            disabled: false,
            require: "view_bookings",
          },
          {
            title: "Occupancy Calendar",
            url: "/facility/dashboard/kennel-view",
            icon: Grid3X3,
            disabled: false,
            require: "view_bookings",
          },
        ],
      },
      {
        label: "Communication",
        items: [
          {
            title: "Calling",
            url: "/facility/dashboard/calling",
            icon: Phone,
            disabled: false,
            require: "calling_view",
          },
          {
            title: "Inbox",
            url: "/facility/dashboard/messaging",
            icon: MessageSquare,
            disabled: false,
            require: "messages_view_inbox",
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
            require: "view_grooming_queue",
          },
        ],
      },
      {
        items: [
          {
            title: "Training",
            url: "/facility/dashboard/services/training",
            icon: GraduationCap,
            disabled: false,
            require: "view_training_queue",
          },
        ],
      },
      {
        items: [
          {
            title: "Retail / POS",
            url: "/facility/dashboard/services/retail",
            icon: ShoppingCart,
            disabled: false,
            require: "retail_pos_access",
          },
        ],
      },
      {
        label: "Intelligence",
        items: [
          {
            title: "Automations",
            url: "/facility/dashboard/automations",
            icon: Zap,
            disabled: false,
            require: "marketing_manage_automations",
          },
          {
            title: "Smart Insights",
            url: "/facility/dashboard/insights",
            icon: Lightbulb,
            disabled: false,
            count: highPriorityCount > 0 ? highPriorityCount : undefined,
            require: "ops_smart_insights",
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
            require: "view_client_list",
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
            require: "scheduling_view_all",
          },
        ],
      },
      {
        label: "Operations",
        items: [
          {
            title: "Daily Care",
            url: "/facility/dashboard/daily-care",
            icon: HeartHandshake,
            disabled: false,
            require: "boarding_daily_care_log",
          },
          {
            title: "Bookings",
            url: "/facility/dashboard/bookings",
            icon: Calendar,
            disabled: false,
            count: 8,
            require: "view_bookings",
          },
          {
            title: "Estimates",
            url: "/facility/dashboard/estimates",
            icon: FileText,
            disabled: false,
            require: "view_bookings",
          },
          {
            title: "Tasks",
            url: "/facility/dashboard/tasks",
            icon: ClipboardList,
            disabled: false,
            count: 2,
            require: "ops_manage_tasks",
          },
          {
            title: "Booking Requests",
            url: "/facility/dashboard/online-booking",
            icon: CalendarClock,
            disabled: false,
            require: "view_bookings",
          },
          {
            title: "Evaluations",
            url: "/facility/dashboard/evaluations",
            icon: ClipboardCheck,
            disabled: false,
            require: "view_bookings",
          },
          {
            title: "Staff",
            url: "/facility/dashboard/staff",
            icon: UserCheck,
            disabled: false,
            require: "view_staff",
          },
          {
            title: "Operational Inventory",
            url: "/facility/dashboard/inventory",
            icon: Package,
            disabled: false,
            require: "view_inventory",
          },
          {
            title: "Memberships",
            url: "/facility/services/memberships",
            icon: Tags,
            disabled: false,
            require: "view_services",
          },
          {
            title: "Live Pet Cams",
            url: "/facility/dashboard/petcams",
            icon: Camera,
            disabled: false,
            require: "view_bookings",
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
            require: "financial_take_payment",
          },
          {
            title: "Subscription & Billing",
            url: "/facility/settings/billing",
            icon: CreditCard,
            disabled: false,
            require: "settings_billing",
          },
          {
            title: "Gift Cards",
            url: "/facility/dashboard/gift-cards",
            icon: Gift,
            disabled: false,
            require: "financial_manage_gift_cards",
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
            require: "financial_reports",
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
            require: "marketing_view",
          },
          {
            title: "Loyalty Program",
            url: "/facility/dashboard/loyalty",
            icon: Award,
            disabled: false,
            require: "marketing_manage_loyalty",
          },
          {
            title: "Loyalty Reports",
            url: "/facility/dashboard/marketing/loyalty-reports",
            icon: BarChart3,
            disabled: false,
            require: "marketing_view_analytics",
          },
          {
            title: "Reputation Booster",
            url: "/facility/dashboard/marketing/reputation-booster",
            icon: ShieldCheck,
            disabled: false,
            require: "marketing_manage_reviews",
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
            require: "ops_incidents_view",
          },
          {
            title: "Digital Waivers",
            url: "/facility/dashboard/waivers",
            icon: FileText,
            disabled: false,
            require: "settings_manage_forms",
          },
          {
            title: "Intake Forms",
            url: "/facility/dashboard/forms",
            icon: ClipboardList,
            disabled: false,
            require: "settings_manage_forms",
          },
        ],
      },
      // Single Settings entry at the end. Daycare, Boarding and the HQ
      // controls now live inside the Settings page rather than the sidebar.
      {
        items: [
          {
            title: "Settings",
            url: "/facility/dashboard/settings",
            icon: Settings,
            disabled: false,
            require: "settings_general",
          },
        ],
      },
    ];

    // Filter through the resolver: keep an item when it has no `require` or the
    // acting user holds it; drop sections left with no visible items.
    const isAllowed = (item: GatedItem) =>
      item.require == null || permissions[item.require] !== false;

    return allMenuSections
      .map(({ label, items }) => ({ label, items: items.filter(isAllowed) }))
      .filter((section) => section.items.length > 0);
  }, [highPriorityCount, permissions]);

  const handleLogout = () => {
    // TODO: Implement logout logic
  };

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
      locationSelector={<LocationContextSelector />}
      menuSections={filteredMenuSections}
      onLogout={handleLogout}
    />
  );
}
