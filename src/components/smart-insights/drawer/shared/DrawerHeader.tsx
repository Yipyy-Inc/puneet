"use client";

import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  INSIGHT_CATEGORY_LABELS,
  type Insight,
} from "@/types/smart-insights";

const CATEGORY_CLASSES: Record<Insight["category"], string> = {
  revenue: "bg-blue-100 text-blue-800 border-blue-200",
  operations: "bg-gray-100 text-gray-800 border-gray-200",
  customers: "bg-green-100 text-green-800 border-green-200",
  staff: "bg-purple-100 text-purple-800 border-purple-200",
  marketing: "bg-teal-100 text-teal-800 border-teal-200",
};

const PRIORITY_CLASSES: Record<Insight["priority"], string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

export function DrawerHeader({ insight }: { insight: Insight }) {
  return (
    <SheetHeader className="space-y-2 border-b pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={CATEGORY_CLASSES[insight.category]}>
          {INSIGHT_CATEGORY_LABELS[insight.category]}
        </Badge>
        <Badge variant="outline" className={PRIORITY_CLASSES[insight.priority]}>
          {insight.priority.charAt(0).toUpperCase() +
            insight.priority.slice(1)}{" "}
          Priority
        </Badge>
      </div>
      <SheetTitle className="text-left text-lg leading-tight">
        {insight.title}
      </SheetTitle>
      <p className="text-muted-foreground text-left text-sm">
        {insight.description}
      </p>
    </SheetHeader>
  );
}
