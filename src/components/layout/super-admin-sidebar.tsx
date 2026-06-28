"use client";

import {
  Activity,
  AlertTriangle,
  BarChart2,
  BellRing,
  BookOpen,
  Building,
  Building2,
  CheckSquare,
  Database,
  DollarSign,
  FileText,
  Flag,
  Gauge,
  Gift,
  Globe,
  Headphones,
  Home,
  Hourglass,
  Inbox,
  KeyRound,
  Layers,
  LineChart,
  Mail,
  Megaphone,
  MessagesSquare,
  PhoneCall,
  Plug,
  Puzzle,
  Receipt,
  Repeat,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
  UserCog,
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
  // 8-section platform-admin architecture. Canonical routes only — the legacy
  // /analytics, /subscriptions, /financial, /communication, /facility-config
  // duplicates are intentionally consolidated into the sections below.
  const menuSections: MenuSection[] = [
    {
      label: "Home Dashboard",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: Home, disabled: false },
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
          title: "Facility Requests",
          url: "/dashboard/facilities/requests",
          icon: Inbox,
          disabled: false,
        },
      ],
    },
    {
      label: "Commercial & Billing",
      items: [
        {
          title: "Subscriptions",
          url: "/dashboard/commercial/subscriptions",
          icon: Repeat,
          disabled: false,
        },
        {
          title: "Tiers & Pricing",
          url: "/dashboard/commercial/tiers",
          icon: Layers,
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
      label: "Platform Control",
      items: [
        {
          title: "Feature Flags",
          url: "/dashboard/platform/flags",
          icon: Flag,
          disabled: false,
        },
        {
          title: "Custom Modules",
          url: "/dashboard/services/custom-modules",
          icon: Puzzle,
          disabled: false,
        },
        {
          title: "Data Import",
          url: "/dashboard/platform/import",
          icon: Upload,
          disabled: false,
        },
      ],
    },
    {
      label: "Support Operations",
      items: [
        {
          title: "Tickets",
          url: "/dashboard/support/tickets",
          icon: Ticket,
          disabled: false,
        },
        {
          title: "Chat",
          url: "/dashboard/support/chat",
          icon: MessagesSquare,
          disabled: false,
        },
        {
          title: "Calling",
          url: "/dashboard/support/calling",
          icon: PhoneCall,
          disabled: false,
        },
        {
          title: "Announcements",
          url: "/dashboard/support/announcements",
          icon: Megaphone,
          disabled: false,
        },
        {
          title: "Email Templates",
          url: "/dashboard/support/email-templates",
          icon: Mail,
          disabled: false,
        },
        {
          title: "Knowledge Base",
          url: "/dashboard/support/knowledge-base",
          icon: BookOpen,
          disabled: false,
        },
      ],
    },
    {
      label: "Team & Access",
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
          title: "Activity Log",
          url: "/dashboard/user-management/activity",
          icon: Activity,
          disabled: false,
        },
      ],
    },
    {
      label: "Reports & Analytics",
      items: [
        {
          title: "Business Report",
          url: "/dashboard/reports/business",
          icon: LineChart,
          disabled: false,
        },
        {
          title: "Financial Report",
          url: "/dashboard/reports/financial",
          icon: DollarSign,
          disabled: false,
        },
        {
          title: "Churn & Retention",
          url: "/dashboard/reports/churn",
          icon: BarChart2,
          disabled: false,
        },
        {
          title: "Usage Report",
          url: "/dashboard/reports/usage",
          icon: Activity,
          disabled: false,
        },
        {
          title: "Support Report",
          url: "/dashboard/reports/support",
          icon: Headphones,
          disabled: false,
        },
        {
          title: "Facilities Report",
          url: "/dashboard/reports/facilities",
          icon: Building2,
          disabled: false,
        },
        {
          title: "Custom Reports",
          url: "/dashboard/reports/custom",
          icon: FileText,
          disabled: false,
        },
      ],
    },
    {
      label: "System & Security",
      items: [
        {
          title: "Global Settings",
          url: "/dashboard/system-admin/global-settings",
          icon: Globe,
          disabled: false,
        },
        {
          title: "AI Settings",
          url: "/dashboard/system-admin/ai-settings",
          icon: Sparkles,
          disabled: false,
        },
        {
          title: "System Configuration",
          url: "/dashboard/system-admin/system-config",
          icon: Settings,
          disabled: false,
        },
        {
          title: "Integrations",
          url: "/dashboard/system-admin/integrations",
          icon: Plug,
          disabled: false,
        },
        {
          title: "Data Management",
          url: "/dashboard/system-admin/data-management",
          icon: Database,
          disabled: false,
        },
        {
          title: "Audit Logs",
          url: "/dashboard/system-admin/audit-logs",
          icon: Shield,
          disabled: false,
        },
        {
          title: "System Status",
          url: "/dashboard/system-health/system-status",
          icon: Gauge,
          disabled: false,
        },
        {
          title: "Alerts & Notifications",
          url: "/dashboard/system-health/alerts-notifications",
          icon: AlertTriangle,
          disabled: false,
        },
        {
          title: "Security Management",
          url: "/dashboard/security-compliance/security-management",
          icon: ShieldCheck,
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
