"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Moon,
  CalendarRange,
  Clock,
  Timer,
  Receipt,
  ChevronRight,
  Layers,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCustomServices } from "@/hooks/use-custom-services";
import { PricingRulesPanel } from "./PricingRulesPanel";
import { facilityConfig } from "@/data/facility-config";

// ── Category definitions ─────────────────────────────────────────────────────

interface CategoryDef {
  id: string;
  group: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  section: string;
  countKey: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "multi_pet",
    group: "Discount pricing",
    title: "Multiple pets",
    description:
      "Apply a price reduction when booking services for multiple pets from the same household",
    icon: Users,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    section: "multi_pet",
    countKey: "multiPetDiscounts",
  },
  {
    id: "stacking",
    group: "Discount pricing",
    title: "Multiple nights/days",
    description:
      "Apply a price reduction for pets staying over a certain number of consecutive nights/days",
    icon: Moon,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    section: "multi_night",
    countKey: "multiNightDiscounts",
  },
  {
    id: "peak",
    group: "Demand-based pricing",
    title: "Peak dates",
    description:
      "Apply a price increase/adjustment for bookings on high-demand dates, such as holidays",
    icon: CalendarRange,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    section: "peak",
    countKey: "peakDateSurcharges",
  },
  {
    id: "time_fees",
    group: "Surcharges",
    title: "Late pick-up / Early drop-off",
    description:
      "Apply extra charges for pickups or drop-offs outside standard operating hours",
    icon: Clock,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    section: "time_fees",
    countKey: "latePickupFees",
  },
  {
    id: "exceed_24h",
    group: "Surcharges",
    title: "Exceed 24-hour period",
    description:
      "Apply an additional fee when a pet's stay exceeds a full 24-hour period",
    icon: Timer,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    section: "exceed_24h",
    countKey: "exceed24Hour",
  },
  {
    id: "custom_fees",
    group: "Custom fees",
    title: "Custom fees",
    description: "Facility-defined fees for special circumstances and services",
    icon: Receipt,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    section: "custom_fees",
    countKey: "customFees",
  },
];

function getActiveCount(countKey: string): number {
  const rules = facilityConfig.pricingRules;
  if (!rules) return 0;
  const data = (rules as Record<string, unknown>)[countKey];
  if (Array.isArray(data))
    return data.filter((r: { enabled?: boolean }) => r.enabled !== false)
      .length;
  if (
    data &&
    typeof data === "object" &&
    "enabled" in (data as Record<string, unknown>)
  )
    return (data as { enabled: boolean }).enabled ? 1 : 0;
  return 0;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PricingRulesSettings() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [stackingMode, setStackingMode] = useState<"best" | "stack">("best");
  const { activeModules } = useCustomServices();

  const groups = CATEGORIES.reduce(
    (acc, cat) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push(cat);
      return acc;
    },
    {} as Record<string, CategoryDef[]>,
  );

  const allServices = [
    { value: "boarding", label: "Boarding" },
    { value: "daycare", label: "Daycare" },
    { value: "grooming", label: "Grooming" },
    { value: "training", label: "Training" },
    ...activeModules.map((m) => ({ value: m.slug, label: m.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Pricing Rules</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure discounts, surcharges, and custom fees across all
              services. For a service that matches multiple rules, all
              applicable rules will apply cumulatively.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setStackingMode((m) => (m === "best" ? "stack" : "best"));
              toast.success(
                `Discount stacking: ${stackingMode === "best" ? "Stack all" : "Best only"}`,
              );
            }}
          >
            <Settings2 className="size-3.5" />
            Discount pricing settings
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Layers className="size-3" />
            {stackingMode === "best"
              ? "Best discount only"
              : "Stack all discounts"}
          </Badge>
          <span className="text-muted-foreground mx-1 text-xs">|</span>
          <span className="text-muted-foreground text-xs">Applies to:</span>
          {allServices.map((s) => (
            <Badge key={s.value} variant="outline" className="text-[10px]">
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Category groups */}
      {Object.entries(groups).map(([groupName, cats]) => (
        <div key={groupName}>
          <h3 className="mb-3 text-sm font-bold text-slate-800">{groupName}</h3>
          <div
            className={cn(
              "grid gap-3",
              cats.length >= 2 ? "md:grid-cols-2" : "md:grid-cols-1",
            )}
          >
            {cats.map((cat) => {
              const Icon = cat.icon;
              const activeCount = getActiveCount(cat.countKey);
              const isExpanded = expandedCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  className={cn(
                    isExpanded && cats.length >= 2 && "md:col-span-2",
                  )}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isExpanded && "ring-primary/20 ring-2 ring-offset-2",
                    )}
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : cat.id)
                    }
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl",
                          cat.iconBg,
                        )}
                      >
                        <Icon className={cn("size-5", cat.iconColor)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{cat.title}</p>
                          {activeCount > 0 && (
                            <Badge className="bg-emerald-50 text-[10px] text-emerald-700">
                              {activeCount} Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {cat.description}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          "size-4 text-slate-300 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Expanded: render the actual PricingRulesPanel section */}
                  {isExpanded && (
                    <div
                      className="mt-2 rounded-xl border bg-slate-50/50 p-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PricingRulesPanel
                        serviceType="all"
                        showSections={[
                          cat.section as
                            | "stacking"
                            | "multi_pet"
                            | "multi_night"
                            | "peak"
                            | "time_fees"
                            | "exceed_24h"
                            | "custom_fees",
                        ]}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
