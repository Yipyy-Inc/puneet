"use client";

import {
  Building,
  CreditCard,
  Shield,
  BarChart3,
  CheckSquare,
  Bot,
  Home,
  Wrench,
  Globe,
  AlertTriangle,
  Layers,
  UserCog,
  Activity,
  KeyRound,
  Package,
  Megaphone,
  Headphones,
  DollarSign,
  TrendingUp,
  FileText,
  Users,
  Calendar,
  PieChart,
  BarChart2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";

function SidebarLogo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl shadow-sm"
        style={{
          background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
        }}
      >
        <Layers className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold text-foreground tracking-tight">
          PetCare
        </span>
        <span className="text-[11px] font-medium text-muted-foreground -mt-0.5">
          Platform Admin
        </span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const t = useTranslations("navigation");

  const menuSections: MenuSection[] = [
    {
      label: t("overview"),
      items: [
        {
          title: t("dashboard"),
          url: "/dashboard",
          icon: Home,
          disabled: false,
        },
      ],
    },
    {
      label: t("analyticsReporting"),
      items: [
        {
          title: t("overview"),
          url: "/dashboard/analytics",
          icon: BarChart2,
          disabled: false,
        },
        {
          title: t("businessIntelligence"),
          url: "/dashboard/analytics/business-intelligence",
          icon: TrendingUp,
          disabled: false,
        },
        {
          title: t("performanceMetrics"),
          url: "/dashboard/analytics/performance",
          icon: Activity,
          disabled: false,
        },
        {
          title: t("customReports"),
          url: "/dashboard/analytics/reports",
          icon: FileText,
          disabled: false,
        },
      ],
    },
    {
      label: t("tenantManagement"),
      items: [
        {
          title: t("facilities"),
          url: "/dashboard/facilities",
          icon: Building,
          disabled: false,
        },
        {
          title: t("facilityConfiguration"),
          url: "/dashboard/facility-config",
          icon: Wrench,
          disabled: false,
        },
      ],
    },
    {
      label: t("userManagement"),
      items: [
        {
          title: t("adminUsers"),
          url: "/dashboard/user-management",
          icon: UserCog,
          disabled: false,
        },
        {
          title: t("rolesPermissions"),
          url: "/dashboard/user-management/roles",
          icon: KeyRound,
          disabled: false,
        },
        {
          title: t("activityTracking"),
          url: "/dashboard/user-management/activity",
          icon: Activity,
          disabled: false,
        },
      ],
    },
    {
      label: t("platformOperations"),
      items: [
        {
          title: t("subscriptionBilling"),
          url: "/dashboard/billing",
          icon: CreditCard,
          disabled: true,
        },
        {
          title: t("subscriptionManagement"),
          url: "/dashboard/subscriptions",
          icon: Package,
          disabled: false,
        },
        {
          title: t("financialManagement"),
          url: "/dashboard/financial",
          icon: DollarSign,
          disabled: false,
        },
        {
          title: t("globalSettings"),
          url: "/dashboard/settings",
          icon: Globe,
          disabled: true,
        },
        {
          title: t("complianceData"),
          url: "/dashboard/compliance",
          icon: Shield,
          disabled: true,
        },
      ],
    },
    {
      label: t("communicationSupport"),
      items: [
        {
          title: t("liveSupport"),
          url: "/dashboard/communication/live-support",
          icon: Headphones,
          disabled: false,
        },
        {
          title: t("announcements"),
          url: "/dashboard/communication/announcements",
          icon: Megaphone,
          disabled: false,
        },
      ],
    },
    {
      label: t("supportFeatures"),
      items: [
        {
          title: t("incidents"),
          url: "/dashboard/incidents",
          icon: AlertTriangle,
          disabled: false,
        },
        {
          title: t("taskOperations"),
          url: "/dashboard/tasks",
          icon: CheckSquare,
          disabled: true,
        },
        {
          title: t("aiPersonalization"),
          url: "/dashboard/ai",
          icon: Bot,
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
      header={<SidebarLogo />}
      menuSections={menuSections}
      onLogout={handleLogout}
    />
  );
}
