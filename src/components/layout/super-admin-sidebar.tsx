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
  TrendingDown,
  FileText,
  BarChart2,
  Database,
  Settings,
  CheckSquare,
  AlertTriangle,
  Globe,
  Ticket,
  Puzzle,
  Sparkles,
  Layers,
  Receipt,
  BellRing,
  Hourglass,
  Repeat,
  Gift,
  Flag,
  Upload,
  MessagesSquare,
  PhoneCall,
  Plug,
  LineChart,
} from "lucide-react";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";
import Image from "next/image";

function SidebarLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center">
        <Image
          src="/yipyy-transparent.png"
          alt="Yipyy Logo"
          width={80}
          height={80}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-foreground text-base font-bold tracking-tight">
          Puneet
        </span>
        <span className="text-muted-foreground -mt-0.5 text-[11px] font-medium">
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
        {
          title: "Churn & Retention",
          url: "/dashboard/reports/churn",
          icon: TrendingDown,
          disabled: false,
        },
        {
          title: "Financial Report",
          url: "/dashboard/reports/financial",
          icon: DollarSign,
          disabled: false,
        },
        {
          title: "Business Report",
          url: "/dashboard/reports/business",
          icon: LineChart,
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
          title: "Custom Modules",
          url: "/dashboard/services/custom-modules",
          icon: Puzzle,
          disabled: false,
        },
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
        {
          title: "Data Import",
          url: "/dashboard/platform/import",
          icon: Upload,
          disabled: false,
        },
        {
          title: "Feature Flags",
          url: "/dashboard/platform/flags",
          icon: Flag,
          disabled: false,
        },
      ],
    },
    {
      label: "Commercial",
      items: [
        {
          title: "Tiers & Pricing",
          url: "/dashboard/commercial/tiers",
          icon: Layers,
          disabled: false,
        },
        {
          title: "Subscriptions",
          url: "/dashboard/commercial/subscriptions",
          icon: Repeat,
          disabled: false,
        },
        {
          title: "Invoices",
          url: "/dashboard/commercial/invoices",
          icon: Receipt,
          disabled: false,
        },
        {
          title: "Credits",
          url: "/dashboard/commercial/credits",
          icon: Gift,
          disabled: false,
        },
        {
          title: "Trials",
          url: "/dashboard/commercial/trials",
          icon: Hourglass,
          disabled: false,
        },
        {
          title: "Dunning",
          url: "/dashboard/commercial/dunning",
          icon: BellRing,
          disabled: false,
        },
      ],
    },
    {
      label: "Communication & Support",
      items: [
        {
          title: "Support Chat",
          url: "/dashboard/support/chat",
          icon: MessagesSquare,
          disabled: false,
        },
        {
          title: "Support Calls",
          url: "/dashboard/support/calling",
          icon: PhoneCall,
          disabled: false,
        },
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
        {
          title: "AI Integration",
          url: "/dashboard/system-admin/ai-settings",
          icon: Sparkles,
          disabled: false,
        },
        {
          title: "Integrations",
          url: "/dashboard/system-admin/integrations",
          icon: Plug,
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
