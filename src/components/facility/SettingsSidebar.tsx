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
  Bed,
  Sun,
  Scissors,
  GraduationCap,
  Puzzle,
  ChevronDown,
} from "lucide-react";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SettingsGroup {
  label: string;
  sections: SettingsSection[];
}

const STATIC_GROUPS: SettingsGroup[] = [
  {
    label: "General",
    sections: [
      { id: "business", label: "Business", icon: Building2 },
      { id: "notifications", label: "Notifications", icon: Bell },
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
    ],
  },
  {
    label: "Forms & Intake",
    sections: [
      { id: "form-requirements", label: "Form Requirements", icon: FileText },
      { id: "form-permissions", label: "Form Permissions", icon: Shield },
      { id: "form-notifications", label: "Form Notifications", icon: Bell },
    ],
  },
  {
    label: "Pets",
    sections: [{ id: "pet-breeds", label: "Pet Breeds", icon: PawPrint }],
  },
  {
    label: "Financial",
    sections: [
      { id: "financial", label: "Payments & Billing", icon: DollarSign },
      { id: "subscription", label: "Subscription", icon: CreditCard },
    ],
  },
  {
    label: "Advanced",
    sections: [
      { id: "tags-notes", label: "Tags & Notes", icon: Tag },
      { id: "yipyygo", label: "YipyyGo", icon: FileText },
      { id: "audit", label: "Audit Log", icon: History },
    ],
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
  const { modules } = useCustomServices();
  const activeModules = modules.filter((m) => m.status === "active");

  // Build groups with dynamic custom modules
  const groups: SettingsGroup[] = STATIC_GROUPS.map((group) => {
    if (group.label === "Services" && activeModules.length > 0) {
      return {
        ...group,
        sections: [
          ...group.sections,
          ...activeModules.map((m) => ({
            id: `custom-${m.slug}`,
            label: m.name,
            icon: Puzzle,
          })),
        ],
      };
    }
    return group;
  });

  return (
    <nav className="w-full space-y-1 lg:w-56">
      {groups.map((group) => (
        <Collapsible key={group.label} defaultOpen>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold tracking-wider uppercase">
            {group.label}
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
                    {section.label}
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
