"use client";

import {
  Sparkles,
  TrendingUp,
  Settings2,
  Users,
  UserCog,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import {
  KpiTile,
  type KpiTone,
} from "@/components/facility/dashboard/kpi-tile";
import type { InsightCategory } from "@/types/smart-insights";

export type CategoryFilter = "all" | InsightCategory;

const TABS: {
  value: CategoryFilter;
  label: string;
  icon: LucideIcon;
  tone: KpiTone;
  hint: string;
}[] = [
  {
    value: "all",
    label: "All Insights",
    icon: Sparkles,
    tone: "slate",
    hint: "Across all categories",
  },
  {
    value: "revenue",
    label: "Revenue",
    icon: TrendingUp,
    tone: "emerald",
    hint: "Pricing & growth",
  },
  {
    value: "operations",
    label: "Operations",
    icon: Settings2,
    tone: "indigo",
    hint: "Schedule & capacity",
  },
  {
    value: "customers",
    label: "Customers",
    icon: Users,
    tone: "violet",
    hint: "Retention & churn",
  },
  {
    value: "staff",
    label: "Staff",
    icon: UserCog,
    tone: "amber",
    hint: "Team & scheduling",
  },
  {
    value: "marketing",
    label: "Marketing",
    icon: Megaphone,
    tone: "rose",
    hint: "Campaigns & outreach",
  },
];

interface Props {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
  counts: Record<CategoryFilter, number>;
}

export function CategoryFilterBar({ value, onChange, counts }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {TABS.map((tab) => (
        <KpiTile
          key={tab.value}
          label={tab.label}
          value={counts[tab.value]}
          hint={tab.hint}
          icon={tab.icon}
          tone={tab.tone}
          active={value === tab.value}
          onClick={() => onChange(tab.value)}
        />
      ))}
    </div>
  );
}
