"use client";

import { useSignOutEverywhere } from "@/lib/auth/sign-out-client";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  BellRing,
  ClipboardCheck,
  BookOpen,
  Building,
  Building2,
  CheckSquare,
  Database,
  DollarSign,
  FileSignature,
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
import { useShellText } from "@/lib/shell/use-shell-text";
import { useNavText } from "@/lib/nav/use-nav-text";

function SidebarLogo() {
  const t = useShellText("admin");
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
        {/* french-ok: the platform account name */}
        <span className="text-foreground text-base font-bold tracking-tight">
          Puneet
        </span>
        <span className="text-muted-foreground -mt-0.5 text-[11px] font-medium">
          {t("platformAdmin")}
        </span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const signOutEverywhere = useSignOutEverywhere();
  const navText = useNavText();
  // 8-section platform-admin architecture. Canonical routes only — the legacy
  // /analytics, /subscriptions, /financial, /communication, /facility-config
  // duplicates are intentionally consolidated into the sections below.
  const menuSections: MenuSection[] = [
    {
      label: navText.section("admin-home", "Home Dashboard"),
      items: [
        {
          title: navText.item("/dashboard", "Dashboard"),
          url: "/dashboard",
          icon: Home,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-tenants", "Tenant Management"),
      items: [
        {
          title: navText.item("/dashboard/facilities", "Facilities"),
          url: "/dashboard/facilities",
          icon: Building,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/facilities/requests",
            "Facility Requests",
          ),
          url: "/dashboard/facilities/requests",
          icon: Inbox,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-commercial", "Commercial & Billing"),
      items: [
        {
          title: navText.item(
            "/dashboard/commercial/subscriptions",
            "Subscriptions",
          ),
          url: "/dashboard/commercial/subscriptions",
          icon: Repeat,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/commercial/tiers", "Tiers & Pricing"),
          url: "/dashboard/commercial/tiers",
          icon: Layers,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/commercial/invoices", "Invoices"),
          url: "/dashboard/commercial/invoices",
          icon: Receipt,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/commercial/credits", "Credits"),
          url: "/dashboard/commercial/credits",
          icon: Gift,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/commercial/trials", "Trials"),
          url: "/dashboard/commercial/trials",
          icon: Hourglass,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/commercial/dunning", "Dunning"),
          url: "/dashboard/commercial/dunning",
          icon: BellRing,
          disabled: false,
        },
        {
          // Facilities applying for a Yipyy Pay merchant account. It sits under
          // Commercial rather than Platform Control because it is somebody's
          // daily work with a queue and a wait time, not a switch.
          // "Merchant Applications" truncated to "Merchant Applicatio…" once
          // the active-item chevron appeared beside it. Shorter, and it names
          // the product a facility is applying for rather than the paperwork.
          title: navText.item(
            "/dashboard/commercial/merchant-applications",
            "Pay Applications",
          ),
          url: "/dashboard/commercial/merchant-applications",
          icon: ClipboardCheck,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-platform", "Platform Control"),
      items: [
        {
          title: navText.item("/dashboard/platform/flags", "Feature Flags"),
          url: "/dashboard/platform/flags",
          icon: Flag,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/platform/import", "Data Import"),
          url: "/dashboard/platform/import",
          icon: Upload,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-support", "Support Operations"),
      items: [
        {
          title: navText.item("/dashboard/support/tickets", "Tickets"),
          url: "/dashboard/support/tickets",
          icon: Ticket,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/support/chat", "Chat"),
          url: "/dashboard/support/chat",
          icon: MessagesSquare,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/support/calling", "Calling"),
          url: "/dashboard/support/calling",
          icon: PhoneCall,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/support/announcements",
            "Announcements",
          ),
          url: "/dashboard/support/announcements",
          icon: Megaphone,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/support/email-templates",
            "Email Templates",
          ),
          url: "/dashboard/support/email-templates",
          icon: Mail,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/support/agreements",
            "Agreements & Waivers",
          ),
          url: "/dashboard/support/agreements",
          icon: FileSignature,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/support/knowledge-base",
            "Knowledge Base",
          ),
          url: "/dashboard/support/knowledge-base",
          icon: BookOpen,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-team", "Team & Access"),
      items: [
        {
          title: navText.item("/dashboard/user-management", "Platform team"),
          url: "/dashboard/user-management",
          icon: UserCog,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/user-management/roles",
            "Platform roles",
          ),
          url: "/dashboard/user-management/roles",
          icon: KeyRound,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/user-management/activity",
            "Audit trail",
          ),
          url: "/dashboard/user-management/activity",
          icon: Activity,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-reports", "Reports & Analytics"),
      items: [
        {
          title: navText.item("/dashboard/reports/business", "Business Report"),
          url: "/dashboard/reports/business",
          icon: LineChart,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/reports/financial",
            "Financial Report",
          ),
          url: "/dashboard/reports/financial",
          icon: DollarSign,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/reports/churn", "Churn & Retention"),
          url: "/dashboard/reports/churn",
          icon: BarChart2,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/reports/usage", "Usage Report"),
          url: "/dashboard/reports/usage",
          icon: Activity,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/reports/support", "Support Report"),
          url: "/dashboard/reports/support",
          icon: Headphones,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/reports/facilities",
            "Facilities Report",
          ),
          url: "/dashboard/reports/facilities",
          icon: Building2,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/reports/agreements",
            "Agreements Report",
          ),
          url: "/dashboard/reports/agreements",
          icon: FileSignature,
          disabled: false,
        },
        {
          title: navText.item("/dashboard/reports/custom", "Custom Reports"),
          url: "/dashboard/reports/custom",
          icon: FileText,
          disabled: false,
        },
      ],
    },
    {
      label: navText.section("admin-system", "System & Security"),
      items: [
        {
          title: navText.item(
            "/dashboard/system-admin/global-settings",
            "Global Settings",
          ),
          url: "/dashboard/system-admin/global-settings",
          icon: Globe,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-admin/ai-settings",
            "AI Settings",
          ),
          url: "/dashboard/system-admin/ai-settings",
          icon: Sparkles,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-admin/system-config",
            "System Configuration",
          ),
          url: "/dashboard/system-admin/system-config",
          icon: Settings,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-admin/integrations",
            "Integrations",
          ),
          url: "/dashboard/system-admin/integrations",
          icon: Plug,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-admin/data-management",
            "Data Management",
          ),
          url: "/dashboard/system-admin/data-management",
          icon: Database,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-admin/audit-logs",
            "Audit Logs",
          ),
          url: "/dashboard/system-admin/audit-logs",
          icon: Shield,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-health/system-status",
            "System Status",
          ),
          url: "/dashboard/system-health/system-status",
          icon: Gauge,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/system-health/alerts-notifications",
            "Alerts & Notifications",
          ),
          url: "/dashboard/system-health/alerts-notifications",
          icon: AlertTriangle,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/security-compliance/security-management",
            "Security Management",
          ),
          url: "/dashboard/security-compliance/security-management",
          icon: ShieldCheck,
          disabled: false,
        },
        {
          title: navText.item(
            "/dashboard/security-compliance/compliance-tools",
            "Compliance Tools",
          ),
          url: "/dashboard/security-compliance/compliance-tools",
          icon: CheckSquare,
          disabled: false,
        },
      ],
    },
  ];

  const handleLogout = () => {
    void signOutEverywhere();
  };

  return (
    <GenericSidebar
      header={<SidebarLogo />}
      menuSections={menuSections}
      onLogout={handleLogout}
    />
  );
}
