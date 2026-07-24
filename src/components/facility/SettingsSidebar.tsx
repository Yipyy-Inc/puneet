"use client";

import { cn } from "@/lib/utils";
import {
  Building2,
  DollarSign,
  Bell,
  Plug,
  Smartphone,
  CreditCard,
  History,
  FileText,
  Shield,
  Tag,
  PawPrint,
  UtensilsCrossed,
  CircleDot,
  Bed,
  Sun,
  Scissors,
  GraduationCap,
  Puzzle,
  Package,
  ChevronDown,
  CloudSun,
  Receipt,
  Sparkles,
  Globe,
  Siren,
  ClipboardList,
  LogOut,
  Briefcase,
  UserX,
  UserCog,
  SlidersHorizontal,
} from "lucide-react";
import { UserCircle } from "lucide-react";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUiText } from "@/hooks/use-ui-text";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import type { PermissionKey } from "@/types/facility-staff";

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  /**
   * Facility-admin sections carry the permission that gates them. Personal
   * sections (My Account) omit it and always render. The facility admin holds
   * every key, so it sees the full list; an employee sees only what's granted
   * (personal always, admin sections per key) — "same component, filtered".
   */
  permKey?: PermissionKey;
}

/** The controlling permission for each facility-admin settings section. The
 *  page reuses this to guard deep-links and pick a visible default. */
export const SETTINGS_SECTION_KEYS: Record<string, PermissionKey> = {
  business: "settings_general",
  notifications: "settings_manage_notifications",
  "smart-insights": "manage_facility_settings",
  "custom-email-domain": "manage_facility_settings",
  weather: "settings_general",
  integrations: "manage_integrations",
  "mobile-app": "manage_facility_settings",
  boarding: "manage_services",
  daycare: "manage_services",
  grooming: "manage_services",
  training: "manage_services",
  addons: "manage_services",
  "form-requirements": "settings_manage_forms",
  "form-notifications": "settings_manage_forms",
  "roles-permissions": "manage_roles",
  "pet-breeds": "manage_facility_settings",
  "care-tasks": "manage_facility_settings",
  evaluations: "manage_facility_settings",
  "booking-statuses": "manage_facility_settings",
  "checkin-requirements": "manage_facility_settings",
  "incident-reporting": "manage_facility_settings",
  retail: "manage_facility_settings",
  "pricing-rules": "manage_rates",
  "estimate-settings": "manage_rates",
  "deposit-rules": "manage_rates",
  "invoice-template": "manage_facility_settings",
  financial: "settings_billing",
  taxes: "settings_manage_taxes",
  subscription: "settings_subscription",
  "tags-notes": "manage_facility_settings",
  yipyygo: "manage_facility_settings",
  audit: "settings_audit_log",
  hq: "hq_manage_settings",
  // Staff & HR — Manager/Owner only.
  "onboarding-templates": "manage_onboarding",
  "offboarding-templates": "manage_onboarding",
  "employment-types": "manage_onboarding",
  "termination-reasons": "manage_onboarding",
  "staff-roles": "manage_onboarding",
  "hr-config": "manage_onboarding",
  "staff-notifications": "manage_onboarding",
};

/** True when the acting viewer may open a settings section. Personal sections
 *  (no key in the map) are always allowed. */
export function canAccessSettingsSection(
  id: string,
  permissions: Record<string, unknown>,
): boolean {
  const key = SETTINGS_SECTION_KEYS[id];
  return !key || permissions[key] !== false;
}

interface SettingsGroup {
  label: string;
  sections: SettingsSection[];
}

const STATIC_GROUPS: SettingsGroup[] = [
  {
    // Personal — always visible, no permission required (spec: employees keep
    // the settings they DO have). Rendered first so it's the natural default.
    label: "My Account",
    sections: [
      { id: "my-profile", label: "My Profile", icon: UserCircle },
      { id: "my-notifications", label: "My Notifications", icon: Bell },
    ],
  },
  {
    label: "General",
    sections: [
      {
        id: "business",
        label: "Business",
        icon: Building2,
        permKey: "settings_general",
      },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "smart-insights", label: "Smart Insights", icon: Sparkles },
      { id: "custom-email-domain", label: "Custom Email Domain", icon: Bell },
      { id: "weather", label: "Yipyy Forecast", icon: CloudSun },
      { id: "integrations", label: "Integrations", icon: Plug },
      { id: "mobile-app", label: "Mobile App", icon: Smartphone },
    ],
  },
  {
    label: "Services",
    sections: [
      { id: "boarding", label: "Boarding", icon: Bed },
      { id: "daycare", label: "Daycare", icon: Sun },
      { id: "grooming", label: "Grooming", icon: Scissors },
      { id: "training", label: "Training", icon: GraduationCap },
      { id: "addons", label: "Add-Ons", icon: Package },
    ],
  },
  {
    label: "Forms & Intake",
    sections: [
      { id: "form-requirements", label: "Form Requirements", icon: FileText },
      { id: "form-notifications", label: "Form Notifications", icon: Bell },
    ],
  },
  {
    label: "Access Control",
    sections: [
      { id: "roles-permissions", label: "Roles & Permissions", icon: Shield },
    ],
  },
  {
    label: "Pets",
    sections: [
      { id: "pet-breeds", label: "Pet Breeds", icon: PawPrint },
      { id: "care-tasks", label: "Care Tasks", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Operations",
    sections: [
      { id: "evaluations", label: "Evaluations", icon: CircleDot },
      { id: "booking-statuses", label: "Booking Statuses", icon: CircleDot },
      {
        id: "checkin-requirements",
        label: "Express Check-in",
        icon: CircleDot,
      },
      { id: "incident-reporting", label: "Incident Reporting", icon: Siren },
      { id: "retail", label: "Retail / POS", icon: Puzzle },
    ],
  },
  {
    label: "Financial",
    sections: [
      { id: "pricing-rules", label: "Pricing Rules", icon: Receipt },
      {
        id: "estimate-settings",
        label: "Estimate Settings",
        icon: FileText,
      },
      { id: "deposit-rules", label: "Deposit Rules", icon: DollarSign },
      { id: "invoice-template", label: "Invoice Template", icon: FileText },
      { id: "financial", label: "Payments & Billing", icon: DollarSign },
      { id: "taxes", label: "Taxes", icon: DollarSign },
      { id: "subscription", label: "Subscription", icon: CreditCard },
    ],
  },
  {
    label: "Advanced",
    sections: [
      { id: "tags-notes", label: "Tags & Notes", icon: Tag },
      { id: "yipyygo", label: "Yipyy Express Check-in", icon: FileText },
      { id: "audit", label: "Audit Log", icon: History },
    ],
  },
  {
    // Staff & HR — Manager/Owner only (every section gated on manage_onboarding).
    label: "Staff & HR",
    sections: [
      {
        id: "onboarding-templates",
        label: "Onboarding Templates",
        icon: ClipboardList,
        permKey: "manage_onboarding",
      },
      {
        id: "offboarding-templates",
        label: "Offboarding Templates",
        icon: LogOut,
        permKey: "manage_onboarding",
      },
      {
        id: "employment-types",
        label: "Employment Types",
        icon: Briefcase,
        permKey: "manage_onboarding",
      },
      {
        id: "termination-reasons",
        label: "Termination Reasons",
        icon: UserX,
        permKey: "manage_onboarding",
      },
      {
        id: "staff-roles",
        label: "Roles",
        icon: UserCog,
        permKey: "manage_onboarding",
      },
      {
        id: "hr-config",
        label: "Onboarding & HR",
        icon: SlidersHorizontal,
        permKey: "manage_onboarding",
      },
      {
        id: "staff-notifications",
        label: "Notifications",
        icon: Bell,
        permKey: "manage_onboarding",
      },
    ],
  },
  {
    label: "Multi-Location",
    sections: [{ id: "hq", label: "HQ", icon: Globe }],
  },
];

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  const { t } = useUiText();
  const { modules } = useCustomServices();
  const permissions = useEffectivePermissions();
  const activeModules = modules.filter((m) => m.status === "active");

  // Build groups with dynamic custom modules, then filter each section by the
  // acting viewer's permissions: personal sections always show; facility-admin
  // sections show only when granted. Custom module config follows manage_services.
  const groups: SettingsGroup[] = STATIC_GROUPS.map((group) => {
    const base =
      group.label === "Services" && activeModules.length > 0
        ? {
            ...group,
            sections: [
              ...group.sections,
              ...activeModules.map((m) => ({
                id: `custom-${m.slug}`,
                label: m.name,
                icon: Puzzle,
                permKey: "manage_services" as PermissionKey,
              })),
            ],
          }
        : group;
    return {
      ...base,
      sections: base.sections.filter(
        (s) =>
          canAccessSettingsSection(s.id, permissions) &&
          (!s.permKey || permissions[s.permKey] !== false),
      ),
    };
  }).filter((group) => group.sections.length > 0);

  return (
    <nav className="w-full space-y-1 lg:w-56">
      {groups.map((group) => (
        <Collapsible key={group.label} defaultOpen>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold tracking-wider uppercase">
            {t(group.label)}
            <ChevronDown className="size-3" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-0.5">
              {group.sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => onSectionChange(section.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {t(section.label)}
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </nav>
  );
}
