"use client";

import { resolveIcon } from "@/lib/service-registry";
import { CUSTOM_SERVICE_CATEGORIES_META } from "@/data/custom-services";
import type { CustomServiceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_COLOR_MAP: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-400",
    icon: "text-purple-600 dark:text-purple-400",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
    icon: "text-green-600 dark:text-green-400",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-400",
    icon: "text-orange-600 dark:text-orange-400",
  },
  gray: {
    bg: "bg-gray-50 dark:bg-gray-900/30",
    border: "border-gray-200 dark:border-gray-700",
    text: "text-gray-700 dark:text-gray-400",
    icon: "text-gray-600 dark:text-gray-400",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-700 dark:text-teal-400",
    icon: "text-teal-600 dark:text-teal-400",
  },
};

interface CategorySelectorProps {
  selected: CustomServiceCategory;
  onChange: (category: CustomServiceCategory) => void;
}

export function CategorySelector({
  selected,
  onChange,
}: CategorySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Service category"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {CUSTOM_SERVICE_CATEGORIES_META.map((cat) => {
        const Icon = resolveIcon(cat.icon);
        const isSelected = selected === cat.id;
        const colors = CATEGORY_COLOR_MAP[cat.color] ?? CATEGORY_COLOR_MAP.blue;

        return (
          <button
            key={cat.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(cat.id as CustomServiceCategory)}
            className={cn(
              `focus:ring-ring flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none`,
              isSelected
                ? cn(colors.bg, colors.border, "shadow-sm")
                : `border-border bg-card hover:border-border/80 hover:bg-accent/30`,
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isSelected ? colors.bg : "bg-muted",
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  isSelected ? colors.icon : "text-muted-foreground",
                )}
              />
            </div>
            <div>
              <p
                className={cn(
                  "text-sm/tight font-semibold",
                  isSelected ? colors.text : "text-foreground",
                )}
              >
                {cat.name}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs/snug">
                {cat.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
