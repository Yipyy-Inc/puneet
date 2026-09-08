"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  usePricingRules,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { PricingRules } from "@/lib/settings/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  TriangleAlert,
  Users,
  Moon,
  BedDouble,
  Scissors,
  Link2,
  CalendarRange,
  Clock,
  Timer,
  Receipt,
  Search,
  ChevronRight,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomServices } from "@/hooks/use-custom-services";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";
import { PricingRulesPanel } from "./PricingRulesPanel";
import { type StoredPricingRules } from "@/lib/pricing-rules";

// ── Category definitions ─────────────────────────────────────────────────────

interface CategoryDef {
  id: string;
  /** Stable — it buckets and orders the rail. Never rendered directly. */
  group: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  section: string;
  countKey: keyof StoredPricingRules;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "stacking_mode",
    group: "grpDiscounts",
    titleKey: "catStackingTitle",
    descKey: "catStackingDesc",
    icon: Settings2,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    section: "stacking",
    countKey: "discountStacking",
  },
  {
    id: "multi_pet",
    group: "grpDiscounts",
    titleKey: "catMultiPetTitle",
    descKey: "catMultiPetDesc",
    icon: Users,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    section: "multi_pet",
    countKey: "multiPetDiscounts",
  },
  {
    id: "multi_night",
    group: "grpDiscounts",
    titleKey: "catMultiNightTitle",
    descKey: "catMultiNightDesc",
    icon: Moon,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    section: "multi_night",
    countKey: "multiNightDiscounts",
  },
  {
    id: "room_type",
    group: "grpDiscounts",
    titleKey: "catRoomTypeTitle",
    descKey: "catRoomTypeDesc",
    icon: BedDouble,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    section: "room_type",
    countKey: "roomTypeAdjustments",
  },
  {
    id: "peak",
    group: "grpDemand",
    titleKey: "catPeakTitle",
    descKey: "catPeakDesc",
    icon: CalendarRange,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    section: "peak",
    countKey: "peakDateSurcharges",
  },
  {
    id: "time_fees",
    group: "grpSurcharges",
    titleKey: "catTimeFeesTitle",
    descKey: "catTimeFeesDesc",
    icon: Clock,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    section: "time_fees",
    countKey: "latePickupFees",
  },
  {
    id: "grooming_conditions",
    group: "grpSurcharges",
    titleKey: "catConditionsTitle",
    descKey: "catConditionsDesc",
    icon: Scissors,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    section: "grooming_conditions",
    countKey: "groomingConditionAdjustments",
  },
  {
    id: "exceed_24h",
    group: "grpSurcharges",
    titleKey: "catExceed24Title",
    descKey: "catExceed24Desc",
    icon: Timer,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    section: "exceed_24h",
    countKey: "exceed24Hour",
  },
  {
    id: "custom_fees",
    group: "grpExtraFees",
    titleKey: "catCustomFeesTitle",
    descKey: "catCustomFeesDesc",
    icon: Receipt,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    section: "custom_fees",
    countKey: "customFees",
  },
  {
    id: "service_bundles",
    group: "grpBundles",
    titleKey: "catBundlesTitle",
    descKey: "catBundlesDesc",
    icon: Link2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    section: "service_bundles",
    countKey: "serviceBundles",
  },
];

type CategoryStatus = "active" | "inactive" | "warning";

interface CategoryStats {
  activeCount: number;
  warningCount: number;
  /** Concatenated, lowercased names/labels of every rule in the category, so
   *  the sidebar search can match individual rules — not just category titles. */
  searchText: string;
}

// Human-readable fields on a stored rule that should be searchable.
const RULE_NAME_KEYS = [
  "name",
  "label",
  "title",
  "description",
  "bundledServiceLabel",
  "note",
  "notes",
];

function collectRuleText(entry: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of RULE_NAME_KEYS) {
    const value = entry[key];
    if (typeof value === "string" && value.trim()) {
      parts.push(value.toLowerCase());
    }
  }
  return parts.join(" ");
}

// Active-rule count, a count of rules that warn (i.e. scoped to a service that
// no longer exists), and the searchable text of every rule for a category.
function getCategoryStats(
  countKey: keyof StoredPricingRules,
  serviceValues: string[],
  rules: PricingRules,
): CategoryStats {
  const data = rules[countKey];
  const serviceSet = new Set(serviceValues);

  const ruleActive = (entry: Record<string, unknown>): boolean => {
    if ("isActive" in entry) return entry.isActive !== false;
    if ("enabled" in entry) return entry.enabled !== false;
    return true;
  };
  const ruleWarns = (entry: Record<string, unknown>): boolean => {
    const svc = entry.applicableServices;
    if (!Array.isArray(svc) || svc.length === 0 || svc.includes("all")) {
      return false;
    }
    return svc.some((s) => s !== "all" && !serviceSet.has(s));
  };

  if (typeof data === "string") {
    return { activeCount: data ? 1 : 0, warningCount: 0, searchText: "" };
  }
  if (Array.isArray(data)) {
    let activeCount = 0;
    let warningCount = 0;
    const searchParts: string[] = [];
    for (const rule of data) {
      if (!rule || typeof rule !== "object") continue;
      const entry = rule as Record<string, unknown>;
      if (ruleActive(entry)) activeCount += 1;
      if (ruleWarns(entry)) warningCount += 1;
      searchParts.push(collectRuleText(entry));
    }
    return { activeCount, warningCount, searchText: searchParts.join(" ") };
  }
  if (
    data &&
    typeof data === "object" &&
    ("enabled" in (data as Record<string, unknown>) ||
      "isActive" in (data as Record<string, unknown>))
  ) {
    const entry = data as { enabled?: boolean; isActive?: boolean };
    return {
      activeCount: (entry.isActive ?? entry.enabled) ? 1 : 0,
      warningCount: 0,
      searchText: collectRuleText(data as Record<string, unknown>),
    };
  }
  return { activeCount: 0, warningCount: 0, searchText: "" };
}

type CategoryWithStats = CategoryDef & {
  activeCount: number;
  warningCount: number;
  status: CategoryStatus;
  searchText: string;
};

// ── Component ────────────────────────────────────────────────────────────────

// ============================================================================
// Pricing rules, read from and written to `facility_settings`.
//
// They lived in localStorage until 2026-08-20, keyed by a `facilityId` prop the
// settings page hardcoded to 11. So every facility wrote to the demo facility's
// key, in its own browser, and a late-pickup fee set at the front desk did not
// exist on the manager's laptop. See the banner in lib/settings/pricing.ts.
//
// The prop is gone rather than corrected: the facility now comes from the
// session, server-side, which is the rule `check:facility-from-session` exists
// to keep.
// ============================================================================

export function PricingRulesSettings() {
  const { t, plural, services } = usePricingLabels();
  const { rules, configured, isPending } = usePricingRules();
  const saveSetting = useSaveFacilitySetting();

  // Every keystroke in the panel reports the whole domain, and each report is a
  // PATCH. Debounced so typing an amount is one write rather than one per
  // digit; the ref survives re-renders, which a plain timeout would not.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (next: PricingRules) => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        saveSetting.mutate(
          { domain: "pricing_rules", value: next },
          {
            onError: (error) =>
              toast.error(
                error instanceof Error ? error.message : t("saveFailed"),
              ),
          },
        );
      }, 600);
    },
    [saveSetting, t],
  );

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

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
  const [searchQuery, setSearchQuery] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorCardRef = useRef<HTMLDivElement | null>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const { activeModules } = useCustomServices();

  const allServices = useMemo(
    () => [
      ...services,
      ...activeModules.map((m) => ({ value: m.slug, label: m.name })),
    ],
    [activeModules, services],
  );
  const serviceValues = useMemo(
    () => allServices.map((s) => s.value),
    [allServices],
  );

  const categoriesWithCounts = useMemo(
    () =>
      uniqueCategories.map((category): CategoryWithStats => {
        const { activeCount, warningCount, searchText } = getCategoryStats(
          category.countKey,
          serviceValues,
          rules,
        );
        const status: CategoryStatus =
          warningCount > 0
            ? "warning"
            : activeCount > 0
              ? "active"
              : "inactive";
        return { ...category, activeCount, warningCount, status, searchText };
      }),
    [uniqueCategories, rules, serviceValues],
  );

  const groups = categoriesWithCounts.reduce(
    (acc, cat) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push(cat);
      return acc;
    },
    {} as Record<string, CategoryWithStats[]>,
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return groups;

    return Object.entries(groups).reduce(
      (acc, [groupName, categories]) => {
        const nextCategories = categories.filter((category) => {
          return (
            t(category.titleKey).toLowerCase().includes(normalizedSearch) ||
            t(category.descKey).toLowerCase().includes(normalizedSearch) ||
            t(category.group).toLowerCase().includes(normalizedSearch) ||
            // Match individual rule names/labels across every category, so a
            // search for a specific rule surfaces the category that holds it.
            category.searchText.includes(normalizedSearch)
          );
        });

        if (nextCategories.length > 0) {
          acc[groupName] = nextCategories;
        }

        return acc;
      },
      {} as Record<string, CategoryWithStats[]>,
    );
  }, [groups, normalizedSearch, t]);

  const totalActiveRules = useMemo(() => {
    return categoriesWithCounts.reduce(
      (total, category) => total + category.activeCount,
      0,
    );
  }, [categoriesWithCounts]);

  const activeCategory =
    categoriesWithCounts.find((category) => category.id === activeCategoryId) ??
    categoriesWithCounts[0];

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

  // ── NOTHING RENDERS UNTIL THE RULES HAVE ARRIVED ────────────────────────
  //
  // Not cosmetic. `PricingRulesPanel` seeds ten `useState` calls from these
  // props, and a `useState` initialiser runs once — so mounting it against the
  // empty fallback and letting the query land afterwards would leave the screen
  // showing no rules whatever the facility had saved, and the first edit would
  // report that emptiness back as the new value. The facility's pricing would
  // be erased by opening the page.
  if (isPending) {
    return (
      <div className="w-full space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Skeleton className="h-[420px] w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* "No rules" and "not set up yet" look identical on screen, and one of
          them is a decision. The fallback is empty on purpose — inheriting the
          fixture's $10 late fee would charge customers a number nobody at this
          business agreed to. */}
      {/* A hairline of the warning ink rather than a wash, and no `dark:`
          in a product with no dark mode (§6 rule 2). */}
      {!configured && (
        <div className="border-warning/40 bg-card flex items-start gap-2 rounded-lg border p-3">
          <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-sm/relaxed">{t("notConfigured")}</p>
        </div>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-20">
          <Card className="border-slate-200/90 shadow-sm">
            <CardContent className="space-y-3 p-3.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-sm font-semibold">{t("title")}</p>
                <p className="text-muted-foreground mt-1 text-xs/relaxed">
                  {t("intro")}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white text-[10px]">
                    {plural(
                      uniqueCategories.length,
                      "countCategoriesOne",
                      "countCategoriesOther",
                    )}
                  </Badge>
                  <Badge variant="outline" className="bg-white text-[10px]">
                    {plural(
                      totalActiveRules,
                      "countActiveOne",
                      "countActiveOther",
                    )}
                  </Badge>
                  <Badge variant="outline" className="bg-white text-[10px]">
                    {plural(
                      allServices.length,
                      "countServicesOne",
                      "countServicesOther",
                    )}
                  </Badge>
                </div>

                <div className="relative mt-3">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-8 border-slate-200 bg-white pl-8 text-xs"
                    placeholder={t("searchPlaceholder")}
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-12rem)]">
                {Object.entries(filteredGroups).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-muted-foreground text-xs">
                      {t("noSearchMatch")}
                    </p>
                  </div>
                ) : (
                  Object.entries(filteredGroups).map(
                    ([groupName, categories]) => {
                      const groupWarnings = categories.reduce(
                        (n, c) => n + c.warningCount,
                        0,
                      );
                      return (
                        <div key={groupName}>
                          <div className="flex items-center gap-1.5 px-2 pb-1">
                            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                              {t(groupName)}
                            </p>
                            {groupWarnings > 0 && (
                              <Badge className="gap-0.5 border border-amber-200 bg-amber-50 text-[9px] text-amber-700">
                                <AlertTriangle className="size-2.5" />
                                {groupWarnings}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {categories.map((category) => {
                              const Icon = category.icon;
                              const isActive =
                                activeCategory?.id === category.id;
                              const dotClass =
                                category.status === "warning"
                                  ? "bg-amber-500"
                                  : category.status === "active"
                                    ? "bg-emerald-500"
                                    : "bg-slate-300";
                              const dotTitle =
                                category.status === "warning"
                                  ? t("statusWarning")
                                  : category.status === "active"
                                    ? t("statusActive")
                                    : t("statusInactive");

                              return (
                                <button
                                  key={category.id}
                                  ref={(element) => {
                                    categoryButtonRefs.current[category.id] =
                                      element;
                                  }}
                                  type="button"
                                  onClick={() =>
                                    handleCategorySelect(category.id)
                                  }
                                  className={cn(
                                    "group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                                    // §6 rule 1 and rule 2, both on this one
                                    // element: a 4px accent pinned to the left
                                    // edge of a rounded, filled card, over a
                                    // tint of the primary. The sanctioned
                                    // signal is a full 2px ring.
                                    isActive
                                      ? "border-primary ring-primary bg-card shadow-sm ring-2"
                                      : "bg-card hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-sm",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                                      category.iconBg,
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        "size-4",
                                        category.iconColor,
                                      )}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "size-2 shrink-0 rounded-full",
                                          dotClass,
                                        )}
                                        title={dotTitle}
                                      />
                                      <p className="text-sm font-medium">
                                        {t(category.titleKey)}
                                      </p>
                                      {category.activeCount > 0 && (
                                        <Badge className="bg-emerald-50 text-[10px] text-emerald-700">
                                          {category.activeCount}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground mt-0.5 text-[11px]/relaxed">
                                      {t(category.descKey)}
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
                      );
                    },
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div ref={editorRef} className="scroll-mt-24">
          <div
            ref={editorCardRef}
            className="w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                    {t(activeCategory.group)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    {t(activeCategory.titleKey)}
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                    {t(activeCategory.descKey)}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="border-slate-300 bg-white text-[11px]"
                >
                  {plural(
                    activeCategory.activeCount,
                    "ruleCountOne",
                    "ruleCountOther",
                  )}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  {t("availableFor")}
                </span>
                {allServices.slice(0, 8).map((service) => (
                  <Badge
                    key={service.value}
                    variant="outline"
                    className="bg-white text-[10px]"
                  >
                    {service.label}
                  </Badge>
                ))}
                {allServices.length > 8 && (
                  <Badge variant="outline" className="bg-white text-[10px]">
                    {t("andMore").replace(
                      "{n}",
                      String(allServices.length - 8),
                    )}
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.07),transparent_38%)] p-4 sm:p-5">
              <div
                key={activeCategory.id}
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <PricingRulesPanel
                  serviceType="all"
                  rules={rules}
                  onChange={persist}
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
