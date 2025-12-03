"use client";

import {
  Building,
  Shield,
  Home,
  Wrench,
  UserCog,
  Activity,
  KeyRound,
  Package,
  Megaphone,
  Headphones,
  DollarSign,
  TrendingUp,
  FileText,
  BarChart2,
  Database,
  Tag,
  Users,
  Target,
  UserPlus,
  ClipboardList,
  Trophy,
  Settings,
  CheckSquare,
  AlertTriangle,
  Globe,
  Ticket,
  ToggleRight,
} from "lucide-react";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";
import Image from "next/image";

function SidebarLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10">
        <Image
          src="/transparent-logo.svg"
          alt="Yipyy Logo"
          width={40}
          height={40}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold text-foreground tracking-tight">
          Puneet
        </span>
        <span className="text-[11px] font-medium text-muted-foreground -mt-0.5">
          Platform Admin
        </span>
      </div>
    </div>
  );
}

export function AppSidebar() {

  const menuSections: MenuSection[] = [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: Home,
          disabled: false,
        },
      ],
    },
    {
      label: "Analytics & Reporting",
      items: [
        {
          title: "Overview",
          url: "/dashboard/analytics",
          icon: BarChart2,
          disabled: false,
        },
        {
          title: "Business Intelligence",
          url: "/dashboard/analytics/business-intelligence",
          icon: TrendingUp,
          disabled: false,
        },
        {
          title: "Performance Metrics",
          url: "/dashboard/analytics/performance",
          icon: Activity,
          disabled: false,
        },
        {
          title: "Custom Reports",
          url: "/dashboard/analytics/reports",
          icon: FileText,
          disabled: false,
        },
      ],
    },
    {
      label: "CRM",
      items: [
        {
          title: "Overview",
          url: "/dashboard/crm",
          icon: Target,
          disabled: false,
        },
        {
          title: "Leads",
          url: "/dashboard/crm/leads",
          icon: UserPlus,
          disabled: false,
        },
        {
          title: "Deals",
          url: "/dashboard/crm/deals",
          icon: DollarSign,
          disabled: false,
        },
        {
          title: "Contacts",
          url: "/dashboard/crm/contacts",
          icon: Users,
          disabled: false,
        },
        {
          title: "Activities",
          url: "/dashboard/crm/activities",
          icon: ClipboardList,
          disabled: false,
        },
        {
          title: "Onboarding",
          url: "/dashboard/crm/onboarding",
          icon: CheckSquare,
          disabled: false,
        },
        {
          title: "Reports",
          url: "/dashboard/crm/reports",
          icon: BarChart2,
          disabled: false,
        },
        {
          title: "Team",
          url: "/dashboard/crm/team",
          icon: Trophy,
          disabled: false,
        },
      ],
    },
    {
      label: "Tenant Management",
      items: [
        {
          title: "Facilities",
          url: "/dashboard/facilities",
          icon: Building,
          disabled: false,
        },
        {
          title: "Facility Configuration",
          url: "/dashboard/facility-config",
          icon: Wrench,
          disabled: false,
        },
      ],
    },
    {
      label: "User Management",
      items: [
        {
          title: "Admin Users",
          url: "/dashboard/user-management",
          icon: UserCog,
          disabled: false,
        },
        {
          title: "Roles & Permissions",
          url: "/dashboard/user-management/roles",
          icon: KeyRound,
          disabled: false,
        },
        {
          title: "Activity Tracking",
          url: "/dashboard/user-management/activity",
          icon: Activity,
          disabled: false,
        },
      ],
    },
    {
      label: "Platform Operations",
      items: [
        {
          title: "Subscription & Modules",
          url: "/dashboard/subscriptions",
          icon: Package,
          disabled: false,
        },
        {
          title: "Financial Management",
          url: "/dashboard/financial",
          icon: DollarSign,
          disabled: false,
        },
      ],
    },
    {
      label: "Communication & Support",
      items: [
        {
          title: "Live Support",
          url: "/dashboard/communication/live-support",
          icon: Headphones,
          disabled: false,
        },
        {
          title: "Announcements",
          url: "/dashboard/communication/announcements",
          icon: Megaphone,
          disabled: false,
        },
      ],
    },

    {
      label: "System Administration",
      items: [
        {
          title: "Global Settings",
          url: "/dashboard/system-admin/global-settings",
          icon: Globe,
          disabled: false,
        },
        {
          title: "Feature Toggles",
          url: "/dashboard/system-admin/feature-toggles",
          icon: ToggleRight,
          disabled: false,
        },
        {
          title: "Support & Ticketing",
          url: "/dashboard/system-admin/support-ticketing",
          icon: Ticket,
          disabled: false,
        },
        {
          title: "Audit & Logging",
          url: "/dashboard/system-admin/audit-logs",
          icon: Shield,
          disabled: false,
        },
        {
          title: "Data Management",
          url: "/dashboard/system-admin/data-management",
          icon: Database,
          disabled: false,
        },
        {
          title: "System Configuration",
          url: "/dashboard/system-admin/system-config",
          icon: Settings,
          disabled: false,
        },
      ],
    },
    {
      label: "Security & Compliance",
      items: [
        {
          title: "Security Management",
          url: "/dashboard/security-compliance/security-management",
          icon: Shield,
          disabled: false,
        },
        {
          title: "Compliance Tools",
          url: "/dashboard/security-compliance/compliance-tools",
          icon: CheckSquare,
          disabled: false,
        },
      ],
    },
    {
      label: "System Health & Monitoring",
      items: [
        {
          title: "System Status",
          url: "/dashboard/system-health/system-status",
          icon: Activity,
          disabled: false,
        },
        {
          title: "Alerts & Notifications",
          url: "/dashboard/system-health/alerts-notifications",
          icon: AlertTriangle,
          disabled: false,
        },
      ],
    },
    {
      label: "Promotions & Discounts",
      items: [
        {
          title: "Promo Code System",
          url: "/dashboard/promotions/promo-code-system",
          icon: Tag,
          disabled: false,
        },
        {
          title: "Performance Metrics",
          url: "/dashboard/promotions/performance-metrics",
          icon: TrendingUp,
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
      header={<SidebarLogo />}
      menuSections={menuSections}
      onLogout={handleLogout}
    />
  );
}
