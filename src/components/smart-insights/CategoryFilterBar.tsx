"use client";

import { Button } from "@/components/ui/button";
import type { InsightCategory } from "@/types/smart-insights";

export type CategoryFilter = "all" | InsightCategory;

const TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All Insights" },
  { value: "revenue", label: "Revenue" },
  { value: "operations", label: "Operations" },
  { value: "customers", label: "Customers" },
  { value: "staff", label: "Staff" },
  { value: "marketing", label: "Marketing" },
];

interface Props {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
  counts: Record<CategoryFilter, number>;
}

export function CategoryFilterBar({ value, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = value === tab.value;
        const count = counts[tab.value];
        return (
          <Button
            key={tab.value}
            type="button"
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(tab.value)}
            className="gap-1.5"
          >
            {tab.label}
            <span
              data-active={isActive}
              className="rounded-full bg-black/10 px-1.5 text-[11px] data-[active=false]:bg-muted data-[active=false]:text-muted-foreground"
            >
              {count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
