"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Moon,
  BedDouble,
  Scissors,
  Link2,
  CalendarRange,
  Clock,
  Timer,
  Receipt,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomServices } from "@/hooks/use-custom-services";
import { PricingRulesPanel } from "./PricingRulesPanel";
import {
  getStoredPricingRules,
  type StoredPricingRules,
} from "@/lib/pricing-rules";

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
  countKey: keyof StoredPricingRules;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "stacking_mode",
    group: "Discounts",
    title: "How discounts combine",
    description:
      "Choose whether customers get the best single discount or all matching discounts",
    icon: Settings2,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    section: "stacking",
    countKey: "discountStacking",
  },
  {
    id: "multi_pet",
    group: "Discounts",
    title: "Multi-pet discounts",
    description:
      "Give a discount when two or more pets from one household are booked together",
    icon: Users,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    section: "multi_pet",
    countKey: "multiPetDiscounts",
  },
  {
    id: "multi_night",
    group: "Discounts",
    title: "Long-stay discounts",
    description:
      "Give a discount when a stay reaches your selected number of nights or days",
    icon: Moon,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    section: "multi_night",
    countKey: "multiNightDiscounts",
  },
  {
    id: "room_type",
    group: "Discounts",
    title: "Room-type pricing",
    description: "Add discounts or surcharges for specific boarding room types",
    icon: BedDouble,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    section: "room_type",
    countKey: "roomTypeAdjustments",
  },
  {
    id: "peak",
    group: "Demand pricing",
    title: "Busy-date surcharges",
    description: "Add a surcharge during high-demand dates such as holidays",
    icon: CalendarRange,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    section: "peak",
    countKey: "peakDateSurcharges",
  },
  {
    id: "time_fees",
    group: "Surcharges",
    title: "Late pickup / early drop-off fees",
    description:
      "Add a fee for pickups or drop-offs outside your normal operating hours",
    icon: Clock,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    section: "time_fees",
    countKey: "latePickupFees",
  },
  {
    id: "grooming_conditions",
    group: "Surcharges",
    title: "Pet-spec condition fees",
    description:
      "Adjust pricing by pet age, breed, sex, status, coat, weight, duration, and appointment window",
    icon: Scissors,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    section: "grooming_conditions",
    countKey: "groomingConditionAdjustments",
  },
  {
    id: "exceed_24h",
    group: "Surcharges",
    title: "Over 24-hour stay fee",
    description: "Add a fee when a stay goes beyond a full 24-hour period",
    icon: Timer,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    section: "exceed_24h",
    countKey: "exceed24Hour",
  },
  {
    id: "custom_fees",
    group: "Extra fees",
    title: "Custom fees",
    description: "Create your own fee rules for special situations",
    icon: Receipt,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    section: "custom_fees",
    countKey: "customFees",
  },
  {
    id: "service_bundles",
    group: "Bundles",
    title: "Service bundles",
    description:
      "Auto-add combined services with mandatory or discounted bundle pricing",
    icon: Link2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    section: "service_bundles",
    countKey: "serviceBundles",
  },
];

function getActiveCount(countKey: keyof StoredPricingRules): number {
  const rules = getStoredPricingRules();
  const data = rules[countKey];
  if (typeof data === "string") return data ? 1 : 0;
  if (Array.isArray(data))
    return data.filter((rule) => {
      if (!rule || typeof rule !== "object") return false;
      const entry = rule as Record<string, unknown>;
      if ("isActive" in entry) return entry.isActive !== false;
      if ("enabled" in entry) return entry.enabled !== false;
      return true;
    }).length;
  if (
    data &&
    typeof data === "object" &&
    ("enabled" in (data as Record<string, unknown>) ||
      "isActive" in (data as Record<string, unknown>))
  )
    return ((data as { enabled?: boolean; isActive?: boolean }).isActive ??
      (data as { enabled?: boolean; isActive?: boolean }).enabled)
      ? 1
      : 0;
  return 0;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PricingRulesSettings() {
  const uniqueCategories = useMemo(() => {
    const seenIds = new Set<string>();
    const seenSections = new Set<string>();
    return CATEGORIES.filter((category) => {
      if (seenIds.has(category.id) || seenSections.has(category.section)) {
        return false;
      }
      seenIds.add(category.id);
      seenSections.add(category.section);
      return true;
    });
  }, []);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    uniqueCategories[0]?.id ?? "",
  );
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorCardRef = useRef<HTMLDivElement | null>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const { activeModules } = useCustomServices();

  const groups = uniqueCategories.reduce(
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

  const activeCategory =
    uniqueCategories.find((category) => category.id === activeCategoryId) ??
    uniqueCategories[0];

  const centerEditorCardInViewport = () => {
    const editorElement = editorCardRef.current ?? editorRef.current;
    if (!editorElement) return;

    const rect = editorElement.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const viewportHeight = window.innerHeight;

    const desiredTopOffset =
      rect.height < viewportHeight
        ? (viewportHeight - rect.height) / 2
        : Math.max(88, viewportHeight * 0.12);

    window.scrollTo({
      top: Math.max(0, absoluteTop - desiredTopOffset),
      behavior: "smooth",
    });
  };

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategoryId(categoryId);

    requestAnimationFrame(() => {
      categoryButtonRefs.current[categoryId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      requestAnimationFrame(() => {
        centerEditorCardInViewport();
      });
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pricing Rules</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Set up discounts and extra fees by category. Changes appear
              instantly in the editor panel.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/80 text-xs">
            {uniqueCategories.length} categories
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Available for:</span>
          {allServices.map((s) => (
            <Badge
              key={s.value}
              variant="outline"
              className="bg-white text-[10px]"
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
          <Card className="h-full border-slate-200 shadow-sm">
            <CardContent className="flex h-full flex-col gap-3 p-2 sm:p-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Categories
                </p>
                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                  {uniqueCategories.length}
                </Badge>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1">
                {Object.entries(groups).map(([groupName, cats]) => (
                  <div key={groupName}>
                    <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                      {groupName}
                    </p>
                    <div className="space-y-1.5">
                      {cats.map((cat) => {
                        const Icon = cat.icon;
                        const activeCount = getActiveCount(cat.countKey);
                        const isActive = activeCategory?.id === cat.id;

                        return (
                          <button
                            key={cat.id}
                            ref={(el) => {
                              categoryButtonRefs.current[cat.id] = el;
                            }}
                            type="button"
                            onClick={() => handleCategorySelect(cat.id)}
                            className={cn(
                              "group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                              isActive
                                ? "border-primary/45 bg-primary/[0.08] shadow-sm"
                                : "border-slate-200/70 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm",
                            )}
                          >
                            <div
                              className={cn(
                                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                                cat.iconBg,
                              )}
                            >
                              <Icon className={cn("size-4", cat.iconColor)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {cat.title}
                                </p>
                                {activeCount > 0 && (
                                  <Badge className="bg-emerald-50 text-[10px] text-emerald-700">
                                    {activeCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                                {cat.description}
                              </p>
                            </div>
                            <ChevronRight
                              className={cn(
                                "mt-0.5 size-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5",
                                isActive && "text-primary rotate-90",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div
          ref={editorRef}
          className="scroll-mt-24 lg:flex lg:min-h-[calc(100vh-8rem)] lg:items-center"
        >
          <div
            ref={editorCardRef}
            className="w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)]"
          >
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_40%)] p-4 sm:p-5">
              <div
                key={activeCategory.id}
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <PricingRulesPanel
                  serviceType="all"
                  hideSectionHeader
                  showSections={[
                    (activeCategory?.section ?? "stacking") as
                      | "stacking"
                      | "multi_pet"
                      | "multi_night"
                      | "room_type"
                      | "peak"
                      | "time_fees"
                      | "grooming_conditions"
                      | "exceed_24h"
                      | "custom_fees"
                      | "service_bundles",
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
