"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  AlertTriangle,
  BedDouble,
  Scissors,
  Link2,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Moon,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import type { PricingRules } from "@/lib/settings/pricing";
import type {
  MultiPetDiscountRule,
  LatePickupFee,
  Exceed24HourFee,
  CustomFee,
  DiscountStackingMode,
  MultiNightDiscount,
  PeakSurcharge,
  RoomTypeAdjustment,
  GroomingConditionAdjustment,
  ServiceBundleRule,
} from "@/types/boarding";
import {
  normalizeApplicableServices,
  toggleServiceScope,
  ServiceScopeChips,
  latestYearFromIsoDates,
  buildHolidayDateList,
  fetchHolidayCatalog,
} from "@/components/facility/pricing-rules/shared";
import type {
  ServiceOption,
  HolidayCatalogItem,
} from "@/components/facility/pricing-rules/shared";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";
import { MultiPetModal } from "@/components/facility/pricing-rules/multi-pet-modal";
import { TimeFeeModal } from "@/components/facility/pricing-rules/time-fee-modal";
import { MultiNightModal } from "@/components/facility/pricing-rules/multi-night-modal";
import { RoomTypeAdjustmentModal } from "@/components/facility/pricing-rules/room-type-adjustment-modal";
import { GroomingConditionAdjustmentModal } from "@/components/facility/pricing-rules/grooming-condition-modal";
import { ServiceBundleModal } from "@/components/facility/pricing-rules/service-bundle-modal";
import { PeakSurchargeModal } from "@/components/facility/pricing-rules/peak-surcharge-modal";
import { CustomFeeModal } from "@/components/facility/pricing-rules/custom-fee-modal";

// ── Props ────────────────────────────────────────────────────────────

type PricingSection =
  | "stacking"
  | "multi_pet"
  | "multi_night"
  | "room_type"
  | "peak"
  | "time_fees"
  | "grooming_conditions"
  | "exceed_24h"
  | "custom_fees"
  | "service_bundles";

interface PricingRulesPanelProps {
  serviceType: string;
  /**
   * The facility's stored rules.
   *
   * A PROP, not a lookup. This used to call `getStoredPricingRules(facilityId)`
   * and write straight back to localStorage, which is why a late-pickup fee
   * configured at the front desk did not exist on any other device. The parent
   * now loads them from `facility_settings` and persists them there.
   */
  rules: PricingRules;
  /** Called with the whole domain whenever any rule changes. */
  onChange: (next: PricingRules) => void;
  showSections?: PricingSection[];
  hideSectionHeader?: boolean;
}

// ── Main component ───────────────────────────────────────────────────

const ALL_SECTIONS: PricingSection[] = [
  "stacking",
  "multi_pet",
  "multi_night",
  "room_type",
  "peak",
  "time_fees",
  "grooming_conditions",
  "exceed_24h",
  "custom_fees",
  "service_bundles",
];

export function PricingRulesPanel({
  serviceType,
  rules,
  onChange,
  showSections,
  hideSectionHeader = false,
}: PricingRulesPanelProps) {
  const { t, money, percent, adjustment, plural, range, services, country } =
    usePricingLabels();
  const sections = showSections ?? ALL_SECTIONS;
  const { activeModules } = useCustomServices();
  // The extras this facility sells. Read from localStorage until 2026-09-05,
  // under a key thirteen files each carried their own copy of.
  const { addOns: serviceAddOns } = useServiceAddOns();

  const serviceOptions: ServiceOption[] = [
    ...services,
    ...activeModules.map((module) => ({
      value: module.slug,
      label: module.name,
    })),
  ];
  const serviceLabelMap = Object.fromEntries(
    serviceOptions.map((service) => [service.value, service.label]),
  ) as Record<string, string>;
  const allServiceValues = serviceOptions.map((service) => service.value);
  // Service add-ons are still a localStorage fixture and are NOT part of this
  // change. Unscoped deliberately: the scope key used to be the `facilityId={11}`
  // the settings page hardcoded, so every facility on the platform read and
  // wrote the demo facility's key. Dropping a scope that was the same wrong
  // value for everyone loses nothing and removes one more hardcoded 11.
  const addOnOptions = serviceAddOns.filter((addOn) => addOn.isActive);
  const serviceScopeLabel =
    serviceType === "all"
      ? "all services"
      : (serviceLabelMap[serviceType] ?? serviceType);

  const formatApplicableServices = (applicableServices?: string[]) => {
    const normalized = normalizeApplicableServices(applicableServices);
    if (normalized.includes("all")) return "All services";
    return normalized
      .map((service) => serviceLabelMap[service] ?? service)
      .join(", ");
  };

  const appliesToService = (applicableServices?: string[]) => {
    if (serviceType === "all") return true;
    const normalized = normalizeApplicableServices(applicableServices);
    return normalized.includes("all") || normalized.includes(serviceType);
  };

  // State for each rule type
  const [multiPet, setMultiPet] = useState<MultiPetDiscountRule[]>(
    (rules?.multiPetDiscounts ?? []) as MultiPetDiscountRule[],
  );
  const [timeFees, setTimeFees] = useState<LatePickupFee[]>(
    (rules?.latePickupFees ?? []) as LatePickupFee[],
  );
  const [exceed24h, setExceed24h] = useState<Exceed24HourFee>(
    (rules?.exceed24Hour ?? {
      id: "exceed-24h",
      name: "24-Hour Overflow",
      enabled: false,
      amount: 25,
      scope: "per_pet",
    }) as Exceed24HourFee,
  );
  const [customFees, setCustomFees] = useState<CustomFee[]>(
    (rules?.customFees ?? []) as CustomFee[],
  );
  const [stacking, setStacking] = useState<DiscountStackingMode>(
    (rules?.discountStacking as DiscountStackingMode) ?? "best_only",
  );
  const [multiNight, setMultiNight] = useState<MultiNightDiscount[]>(
    (rules?.multiNightDiscounts ?? []) as MultiNightDiscount[],
  );
  const [roomTypeAdjustments, setRoomTypeAdjustments] = useState<
    RoomTypeAdjustment[]
  >((rules?.roomTypeAdjustments ?? []) as RoomTypeAdjustment[]);
  const [peakSurcharges, setPeakSurcharges] = useState<PeakSurcharge[]>(
    (rules?.peakDateSurcharges ?? []) as PeakSurcharge[],
  );
  const [groomingConditionAdjustments, setGroomingConditionAdjustments] =
    useState<GroomingConditionAdjustment[]>(
      (rules?.groomingConditionAdjustments ??
        []) as GroomingConditionAdjustment[],
    );
  const [serviceBundles, setServiceBundles] = useState<ServiceBundleRule[]>(
    (rules?.serviceBundles ?? []) as ServiceBundleRule[],
  );
  const holidayRulesAutoSyncedRef = useRef(false);

  // The effect below runs once on mount with state that is merely a copy of the
  // props. Reporting that as a change would PATCH the settings the moment
  // somebody opened the screen — writing a row, and flipping `configured` from
  // "they have not set this up" to "they chose this", without anyone choosing
  // anything. That distinction is the whole reason `configured` exists.
  const settled = useRef(false);

  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    onChange({
      discountStacking: stacking,
      multiPetDiscounts: multiPet,
      latePickupFees: timeFees,
      exceed24Hour: exceed24h,
      customFees,
      multiNightDiscounts: multiNight,
      peakDateSurcharges: peakSurcharges,
      roomTypeAdjustments,
      groomingConditionAdjustments,
      serviceBundles,
    });
  }, [
    onChange,
    stacking,
    multiPet,
    timeFees,
    exceed24h,
    customFees,
    multiNight,
    peakSurcharges,
    roomTypeAdjustments,
    groomingConditionAdjustments,
    serviceBundles,
  ]);

  // Toggle a service in a rule's scope — state change auto-saves via the effect.
  const toggleMultiPetScope = (ruleId: string, service: string) =>
    setMultiPet((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              applicableServices: toggleServiceScope(
                r.applicableServices,
                allServiceValues,
                service,
              ),
            }
          : r,
      ),
    );

  const toggleMultiNightScope = (ruleId: string, service: string) =>
    setMultiNight((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              applicableServices: toggleServiceScope(
                r.applicableServices,
                allServiceValues,
                service,
              ),
            }
          : r,
      ),
    );

  const toggleRoomTypeScope = (ruleId: string, service: string) =>
    setRoomTypeAdjustments((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              applicableServices: toggleServiceScope(
                r.applicableServices,
                allServiceValues,
                service,
              ),
            }
          : r,
      ),
    );

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBase, setPreviewBase] = useState(50);
  const [previewPets, setPreviewPets] = useState(2);
  const [previewNights, setPreviewNights] = useState(3);

  // Modal state
  const [mpModal, setMpModal] = useState(false);
  const [editingMp, setEditingMp] = useState<MultiPetDiscountRule | null>(null);
  const [tfModal, setTfModal] = useState(false);
  const [editingTf, setEditingTf] = useState<LatePickupFee | null>(null);
  const [cfModal, setCfModal] = useState(false);
  const [editingCf, setEditingCf] = useState<CustomFee | null>(null);
  const [e24Modal, setE24Modal] = useState(false);
  const [mnModal, setMnModal] = useState(false);
  const [editingMn, setEditingMn] = useState<MultiNightDiscount | null>(null);
  const [rtaModal, setRtaModal] = useState(false);
  const [editingRta, setEditingRta] = useState<RoomTypeAdjustment | null>(null);
  const [pdModal, setPdModal] = useState(false);
  const [editingPd, setEditingPd] = useState<PeakSurcharge | null>(null);
  const [gcaModal, setGcaModal] = useState(false);
  const [editingGca, setEditingGca] =
    useState<GroomingConditionAdjustment | null>(null);
  const [bundleModal, setBundleModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ServiceBundleRule | null>(
    null,
  );

  // Filter rules by service
  const filteredMultiPet = multiPet.filter((r) =>
    appliesToService(r.applicableServices),
  );
  const filteredTimeFees = timeFees.filter((r) =>
    appliesToService(r.applicableServices),
  );
  const filteredCustomFees = customFees.filter((r) =>
    appliesToService(r.applicableServices),
  );
  const filteredMultiNight = multiNight.filter((r) =>
    appliesToService(r.applicableServices),
  );
  const filteredRoomTypeAdjustments = roomTypeAdjustments.filter((r) =>
    appliesToService(r.applicableServices),
  );
  const filteredPeakSurcharges = peakSurcharges.filter((r) =>
    appliesToService(r.applicableServices),
  );
  const filteredGroomingConditionAdjustments =
    groomingConditionAdjustments.filter((r) =>
      appliesToService(r.applicableServices),
    );
  const filteredServiceBundles = serviceBundles.filter((r) =>
    appliesToService(r.applicableServices),
  );

  useEffect(() => {
    if (holidayRulesAutoSyncedRef.current) return;
    holidayRulesAutoSyncedRef.current = true;

    let cancelled = false;

    const autoRefreshHolidayRules = async () => {
      const currentYear = new Date().getFullYear();
      const catalogCache = new Map<string, HolidayCatalogItem[]>();
      let changed = false;
      let hadErrors = false;

      const nextRules = await Promise.all(
        peakSurcharges.map(async (rule) => {
          if (rule.dateMode !== "holiday") return rule;

          const yearsAhead = Math.max(1, rule.holidayYearsAhead ?? 1);
          const expectedEndYear = currentYear + yearsAhead - 1;

          const referenceDates =
            rule.holidayDates && rule.holidayDates.length > 0
              ? rule.holidayDates
              : (rule.dateRanges?.map((range) => range.start) ??
                [rule.startDate, rule.endDate].filter(Boolean));

          const latestCoveredYear = latestYearFromIsoDates(referenceDates);
          if (latestCoveredYear >= expectedEndYear) {
            return rule;
          }

          if (!rule.holidayCountryCode || !rule.holidayNames?.length) {
            return rule;
          }

          try {
            const cacheKey = `${rule.holidayCountryCode}-${yearsAhead}`;
            let catalog = catalogCache.get(cacheKey);
            if (!catalog) {
              catalog = await fetchHolidayCatalog(
                rule.holidayCountryCode,
                yearsAhead,
              );
              catalogCache.set(cacheKey, catalog);
            }

            const holidayDates = buildHolidayDateList(
              rule.holidayNames,
              catalog,
              Math.max(0, rule.holidayExtensionDaysBefore ?? 0),
              Math.max(0, rule.holidayExtensionDaysAfter ?? 0),
            );

            if (holidayDates.length === 0) return rule;

            changed = true;
            return {
              ...rule,
              holidayDates,
              dateRanges: holidayDates.map((date) => ({
                start: date,
                end: date,
              })),
              startDate: holidayDates[0],
              endDate: holidayDates[holidayDates.length - 1],
            };
          } catch {
            hadErrors = true;
            return rule;
          }
        }),
      );

      if (cancelled) return;

      if (changed) {
        setPeakSurcharges(nextRules);
        toast.success(t("toastHolidayRefreshed"));
      }

      if (hadErrors) {
        toast.error(t("toastHolidayRefreshFailed"));
      }
    };

    void autoRefreshHolidayRules();

    return () => {
      cancelled = true;
    };
  }, [peakSurcharges, t]);

  return (
    <div className="space-y-5">
      {/* ── Section header. White with a hairline — §6 rule 2. ── */}
      {!hideSectionHeader && (
        <div className="bg-card rounded-xl border px-5 py-4">
          <h3 className="text-sm font-bold tracking-tight">
            {t("panelTitle")}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {serviceType === "all"
              ? t("panelIntroAll")
              : t("panelIntro").replace("{service}", serviceScopeLabel)}
          </p>
        </div>
      )}

      {/* ── Discount Stacking ── */}
      {sections.includes("stacking") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-slate-200">
                  <Settings2 className="size-4 text-slate-700" />
                </div>
                {t("stackTitle")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setPreviewOpen(!previewOpen)}
              >
                {t("estimateTitle")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-xs">{t("stackIntro")}</p>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "best_only" as const,
                    label: t("stackBest"),
                    desc: t("stackBestHelp"),
                  },
                  {
                    value: "apply_all_sequence" as const,
                    label: t("stackCombine"),
                    desc: t("stackCombineHelp"),
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStacking(opt.value)}
                  className={`w-full rounded-lg border p-3 text-left transition-all ${
                    stacking === opt.value
                      ? "border-primary ring-primary ring-2"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-muted-foreground text-xs">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Preview calculator */}
            {previewOpen && (
              <div className="bg-card space-y-3 rounded-xl border p-4">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t("estimateTitle")}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">
                      {t("estimateBaseRate")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={previewBase}
                      onChange={(e) =>
                        setPreviewBase(parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t("estimatePets")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={previewPets}
                      onChange={(e) =>
                        setPreviewPets(parseInt(e.target.value) || 1)
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t("estimateNights")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={previewNights}
                      onChange={(e) =>
                        setPreviewNights(parseInt(e.target.value) || 1)
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {(() => {
                  const activeMultiPet = filteredMultiPet.filter(
                    (r) => r.isActive,
                  );
                  const discounts: { name: string; amount: number }[] = [];
                  for (const rule of activeMultiPet) {
                    const matchingTier = [...rule.tiers]
                      .sort((a, b) => b.petCount - a.petCount)
                      .find((t) => previewPets >= t.petCount);
                    if (matchingTier) {
                      const count =
                        rule.discountType === "per_pet"
                          ? previewPets
                          : Math.max(0, previewPets - 1);
                      const unitDiscount =
                        rule.discountValueType === "percentage"
                          ? (previewBase * matchingTier.discountAmount) / 100
                          : matchingTier.discountAmount;
                      discounts.push({
                        name: rule.name,
                        amount: unitDiscount * count * previewNights,
                      });
                    }
                  }
                  const subtotal = previewBase * previewPets * previewNights;
                  let total: number;
                  let appliedDiscounts: typeof discounts;
                  if (stacking === "best_only" && discounts.length > 1) {
                    const best = discounts.reduce((a, b) =>
                      b.amount > a.amount ? b : a,
                    );
                    appliedDiscounts = [best];
                    total = subtotal - best.amount;
                  } else {
                    appliedDiscounts = discounts;
                    total =
                      subtotal - discounts.reduce((s, d) => s + d.amount, 0);
                  }
                  return (
                    <div className="space-y-1 border-t pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("estimateSubtotal")}
                        </span>
                        <span>{money(subtotal)}</span>
                      </div>
                      {appliedDiscounts.map((d, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs text-emerald-700"
                        >
                          <span>{d.name}</span>
                          <span>
                            {adjustment("discount", "flat", d.amount)}
                          </span>
                        </div>
                      ))}
                      {discounts.length > 0 &&
                        stacking === "best_only" &&
                        discounts.length > 1 && (
                          <p className="text-warning text-[10px]">
                            {plural(
                              discounts.length - 1,
                              "estimateSkippedOne",
                              "estimateSkippedOther",
                            )}
                          </p>
                        )}
                      <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                        <span>{t("estimateTotal")}</span>
                        <span>{money(Math.max(0, total))}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Multi-Pet Discounts ── */}
      {sections.includes("multi_pet") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Users className="size-4 text-emerald-700" />
                </div>
                {t("listMultiPet")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingMp(null);
                  setMpModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addRule")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredMultiPet.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listMultiPetEmpty")}
              </p>
            ) : (
              filteredMultiPet.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {rule.discountType === "per_pet"
                          ? t("perPet")
                          : t("rowAdditionalPet")}
                      </Badge>
                      {rule.sameLodging && (
                        <Badge variant="outline" className="text-[10px]">
                          {t("rowSameLodging")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {rule.tiers
                        .map(
                          (tier) =>
                            `${range(tier.petCount, null, "pets")}: ${adjustment(
                              "discount",
                              rule.discountValueType === "percentage"
                                ? "percentage"
                                : "flat",
                              tier.discountAmount,
                            )}`,
                        )
                        .join(" · ")}
                    </p>
                    <ServiceScopeChips
                      applicableServices={rule.applicableServices}
                      serviceOptions={serviceOptions}
                      onToggle={(service) =>
                        toggleMultiPetScope(rule.id, service)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(c) =>
                        setMultiPet((prev) =>
                          prev.map((r) =>
                            r.id === rule.id ? { ...r, isActive: c } : r,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingMp(rule);
                        setMpModal(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        setMultiPet((prev) =>
                          prev.filter((r) => r.id !== rule.id),
                        );
                        toast.success(`"${rule.name}" deleted`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Multi-Night Discounts ── */}
      {sections.includes("multi_night") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
                  <Moon className="size-4 text-blue-700" />
                </div>
                {t("listMultiNight")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingMn(null);
                  setMnModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addRule")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredMultiNight.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listMultiNightEmpty")}
              </p>
            ) : (
              filteredMultiNight.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("rowNightsRange")
                        .replace(
                          "{range}",
                          range(rule.minNights, rule.maxNights, "nights"),
                        )
                        .replace(
                          "{discount}",
                          rule.discountMode === "flat"
                            ? t("rowOffAmount").replace(
                                "{amount}",
                                money(rule.discountAmount ?? 0),
                              )
                            : rule.discountMode === "free_nights"
                              ? plural(
                                  rule.freeNights ?? 1,
                                  "rowFreeNightsOne",
                                  "rowFreeNightsOther",
                                )
                              : t("rowOffAmount").replace(
                                  "{amount}",
                                  percent(rule.discountPercent ?? 0),
                                ),
                        )}
                    </p>
                    <ServiceScopeChips
                      applicableServices={rule.applicableServices}
                      serviceOptions={serviceOptions}
                      onToggle={(service) =>
                        toggleMultiNightScope(rule.id, service)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(c) =>
                        setMultiNight((prev) =>
                          prev.map((r) =>
                            r.id === rule.id ? { ...r, isActive: c } : r,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingMn(rule);
                        setMnModal(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        setMultiNight((prev) =>
                          prev.filter((r) => r.id !== rule.id),
                        );
                        toast.success(`"${rule.name}" deleted`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Room-Type Pricing ── */}
      {sections.includes("room_type") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100">
                  <BedDouble className="size-4 text-indigo-700" />
                </div>
                {t("listRoomType")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingRta(null);
                  setRtaModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addRule")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredRoomTypeAdjustments.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listRoomTypeEmpty")}
              </p>
            ) : (
              filteredRoomTypeAdjustments.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {adjustment(
                          rule.adjustmentKind,
                          rule.adjustmentType,
                          rule.amount,
                        )}
                      </Badge>
                      {rule.sameRoomRequired && (
                        <Badge variant="outline" className="text-[10px]">
                          {t("rowSameRoom")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("rowRooms")} {rule.roomTypeIds.join(", ")} ·{" "}
                      {range(rule.minNights, rule.maxNights, "nights")}
                    </p>
                    <ServiceScopeChips
                      applicableServices={rule.applicableServices}
                      serviceOptions={serviceOptions}
                      onToggle={(service) =>
                        toggleRoomTypeScope(rule.id, service)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) =>
                        setRoomTypeAdjustments((prev) =>
                          prev.map((item) =>
                            item.id === rule.id
                              ? { ...item, isActive: checked }
                              : item,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingRta(rule);
                        setRtaModal(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        setRoomTypeAdjustments((prev) =>
                          prev.filter((item) => item.id !== rule.id),
                        );
                        toast.success(`"${rule.name}" deleted`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Peak Date Surcharges ── */}
      {sections.includes("peak") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                  <CalendarRange className="size-4 text-amber-700" />
                </div>
                {t("listPeak")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingPd(null);
                  setPdModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addSurcharge")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredPeakSurcharges.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listPeakEmpty")}
              </p>
            ) : (
              filteredPeakSurcharges.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {rule.surchargeType === "flat"
                          ? `+$${rule.surchargeAmount ?? rule.surchargePercent}`
                          : `+${rule.surchargePercent}%`}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {rule.scope === "first_pet_only"
                          ? t("rowFirstPet")
                          : t("perPet")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {rule.dateMode === "holiday"
                        ? t("rowHolidayDates")
                            .replace(
                              "{country}",
                              rule.holidayCountryCode
                                ? country(rule.holidayCountryCode)
                                : "—",
                            )
                            .replace(
                              "{n}",
                              String(
                                rule.holidayDates?.length ??
                                  rule.dateRanges?.length ??
                                  0,
                              ),
                            ) +
                          ((rule.holidayExtensionDaysBefore ?? 0) > 0 ||
                          (rule.holidayExtensionDaysAfter ?? 0) > 0
                            ? t("rowHolidayWindow")
                                .replace(
                                  "{before}",
                                  String(rule.holidayExtensionDaysBefore ?? 0),
                                )
                                .replace(
                                  "{after}",
                                  String(rule.holidayExtensionDaysAfter ?? 0),
                                )
                            : "")
                        : t("rowDateRange")
                            .replace("{from}", rule.startDate)
                            .replace("{to}", rule.endDate)}
                      {t("rowAppliesToSuffix").replace(
                        "{list}",
                        formatApplicableServices(rule.applicableServices),
                      )}
                    </p>
                    {rule.dateMode === "holiday" && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("rowActiveWindow")}{" "}
                        {t("rowDateRange")
                          .replace("{from}", rule.startDate)
                          .replace("{to}", rule.endDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(c) =>
                        setPeakSurcharges((prev) =>
                          prev.map((r) =>
                            r.id === rule.id ? { ...r, isActive: c } : r,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingPd(rule);
                        setPdModal(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        setPeakSurcharges((prev) =>
                          prev.filter((r) => r.id !== rule.id),
                        );
                        toast.success(`"${rule.name}" deleted`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Late Pickup / Early Drop-off ── */}
      {sections.includes("time_fees") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                  <Clock className="size-4 text-amber-700" />
                </div>
                {t("listTimeFees")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingTf(null);
                  setTfModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addFee")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredTimeFees.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listTimeFeesEmpty")}
              </p>
            ) : (
              filteredTimeFees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {fee.name ||
                          (fee.condition === "late_pickup"
                            ? t("rowLatePickup")
                            : t("rowEarlyDropoff"))}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.condition === "late_pickup"
                          ? t("rowLatePickup")
                          : t("rowEarlyDropoff")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.feeType === "extra_night"
                          ? t("rowExtraNight")
                          : t(
                              fee.feeType === "per_minute"
                                ? "rowPerMin"
                                : fee.feeType === "per_30min"
                                  ? "rowPer30"
                                  : fee.feeType === "per_hour"
                                    ? "rowPerHour"
                                    : "rowFlatAmount",
                            ).replace("{amount}", money(fee.amount))}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.scope === "per_pet"
                          ? t("perPet")
                          : t("perBooking")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("rowGraceBasedOn")
                        .replace("{n}", String(fee.graceMinutes))
                        .replace(
                          "{basis}",
                          fee.basedOn === "business_hours"
                            ? t("rowBasisHours")
                            : t("rowBasedOnCustom").replace(
                                "{time}",
                                fee.customTime ?? "",
                              ),
                        )}
                      {fee.maxFee
                        ? t("rowMaxFee").replace("{amount}", money(fee.maxFee))
                        : ""}
                      {(fee.applyFromTime || fee.applyUntilTime) &&
                        t("rowWindow")
                          .replace("{from}", fee.applyFromTime ?? "00:00")
                          .replace("{to}", fee.applyUntilTime ?? "23:59")}
                      {t("rowAppliesToSuffix").replace(
                        "{list}",
                        formatApplicableServices(fee.applicableServices),
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={fee.enabled}
                      onCheckedChange={(c) =>
                        setTimeFees((prev) =>
                          prev.map((f) =>
                            f.id === fee.id ? { ...f, enabled: c } : f,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingTf(fee);
                        setTfModal(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        setTimeFees((prev) =>
                          prev.filter((f) => f.id !== fee.id),
                        );
                        toast.success(t("toastFeeDeleted"));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Pet-Spec Condition Fees ── */}
      {sections.includes("grooming_conditions") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-pink-100">
                  <Scissors className="size-4 text-pink-700" />
                </div>
                {t("listConditions")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingGca(null);
                  setGcaModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addRule")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredGroomingConditionAdjustments.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listConditionsEmpty")}
              </p>
            ) : (
              filteredGroomingConditionAdjustments.map((rule) => {
                const conditions: string[] = [];
                if (rule.hairTypes?.length) {
                  conditions.push(
                    t("rowHairTypes").replace(
                      "{n}",
                      String(rule.hairTypes.length),
                    ),
                  );
                }
                if (rule.breeds?.length) {
                  conditions.push(
                    t("rowBreeds").replace("{n}", String(rule.breeds.length)),
                  );
                }
                if (rule.sexes?.length) {
                  conditions.push(`${t("rowSex")} ${rule.sexes.join(", ")}`);
                }
                if (rule.petStatuses?.length) {
                  conditions.push(
                    `${t("rowStatus")} ${rule.petStatuses.join(", ")}`,
                  );
                }
                if (rule.ageMinYears != null || rule.ageMaxYears != null) {
                  conditions.push(
                    t("rowAgeRange").replace(
                      "{range}",
                      range(rule.ageMinYears, rule.ageMaxYears, "years"),
                    ),
                  );
                }
                if (rule.weightMinKg != null || rule.weightMaxKg != null) {
                  conditions.push(
                    t("rowWeightRange").replace(
                      "{range}",
                      range(rule.weightMinKg, rule.weightMaxKg, "kg"),
                    ),
                  );
                }
                if (
                  rule.durationMinutesMin != null ||
                  rule.durationMinutesMax != null
                ) {
                  conditions.push(
                    t("rowDurationRange").replace(
                      "{range}",
                      range(
                        rule.durationMinutesMin,
                        rule.durationMinutesMax,
                        "minutes",
                      ),
                    ),
                  );
                }
                if (rule.appointmentWindowStart || rule.appointmentWindowEnd) {
                  conditions.push(
                    t("rowTimeWindow")
                      .replace("{from}", rule.appointmentWindowStart ?? "00:00")
                      .replace("{to}", rule.appointmentWindowEnd ?? "23:59"),
                  );
                }

                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{rule.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {adjustment(
                            rule.adjustmentKind,
                            rule.adjustmentType,
                            rule.amount,
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {rule.billingMode === "per_unit"
                            ? t("rowPerUnit").replace(
                                "{unit}",
                                t(
                                  rule.unitType === "days"
                                    ? "unitDays"
                                    : rule.unitType === "nights"
                                      ? "unitNights"
                                      : "unitSessions",
                                ),
                              )
                            : t("gcOneTime")}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {conditions.length > 0
                          ? conditions.join(" · ")
                          : t("rowNoConditions")}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("rowAppliesTo")}{" "}
                        {formatApplicableServices(rule.applicableServices)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) =>
                          setGroomingConditionAdjustments((prev) =>
                            prev.map((item) =>
                              item.id === rule.id
                                ? { ...item, isActive: checked }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          setEditingGca(rule);
                          setGcaModal(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-7"
                        onClick={() => {
                          setGroomingConditionAdjustments((prev) =>
                            prev.filter((item) => item.id !== rule.id),
                          );
                          toast.success(`"${rule.name}" deleted`);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Exceed 24-Hour Fee (boarding only) ── */}
      {sections.includes("exceed_24h") &&
        (serviceType === "boarding" || serviceType === "all") && (
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-slate-50/50 pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-rose-100">
                    <AlertTriangle className="size-4 text-rose-700" />
                  </div>
                  {t("listExceed24")}
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={exceed24h.enabled}
                    onCheckedChange={(c) =>
                      setExceed24h((prev) => ({ ...prev, enabled: c }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setE24Modal(true)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            {exceed24h.enabled && (
              <CardContent className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{money(exceed24h.amount)}</span>{" "}
                  <span className="text-muted-foreground">
                    {exceed24h.scope === "per_pet"
                      ? t("perPet")
                      : t("perBooking")}
                  </span>
                </p>
                {exceed24h.description && (
                  <p className="text-muted-foreground text-xs">
                    {exceed24h.description}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )}

      {/* ── Custom Fees ── */}
      {sections.includes("custom_fees") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100">
                  <DollarSign className="size-4 text-sky-700" />
                </div>
                {t("listCustomFees")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingCf(null);
                  setCfModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addFee")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredCustomFees.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listCustomFeesEmpty")}
              </p>
            ) : (
              filteredCustomFees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{fee.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {(fee.adjustmentKind ?? "fee") === "discount"
                          ? "-"
                          : "+"}
                        {fee.feeType === "flat"
                          ? money(fee.amount)
                          : percent(fee.amount)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.scope === "per_pet"
                          ? t("perPet")
                          : t("perBooking")}
                      </Badge>
                      {fee.autoApply !== "none" && (
                        <Badge className="bg-blue-100 text-[10px] text-blue-700">
                          {t(
                            fee.autoApply === "at_checkout"
                              ? "rowAutoCheckout"
                              : fee.autoApply === "by_care_type"
                                ? "rowAutoCareType"
                                : fee.autoApply === "new_customer"
                                  ? "rowAutoNewCustomer"
                                  : fee.autoApply === "new_pet"
                                    ? "rowAutoNewPet"
                                    : fee.autoApply === "customer_segment"
                                      ? "rowSegmentAuto"
                                      : "rowAddOnAuto",
                          )}
                        </Badge>
                      )}
                    </div>
                    {fee.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {fee.description}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("rowAppliesTo")}{" "}
                      {formatApplicableServices(fee.applicableServices)}
                    </p>
                    {fee.autoApply === "customer_segment" && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("rowSegment")}{" "}
                        {fee.customerStatuses?.length
                          ? t("rowSegmentStatus").replace(
                              "{list}",
                              fee.customerStatuses.join(", "),
                            )
                          : t("rowSegmentAnyStatus")}
                        {fee.membershipPlans?.length
                          ? t("rowSegmentPlans").replace(
                              "{list}",
                              fee.membershipPlans.join(", "),
                            )
                          : ""}
                        {fee.requireMembershipActive
                          ? t("rowSegmentMembership")
                          : ""}
                        {fee.requirePrepaidBalance
                          ? t("rowSegmentPrepaid")
                          : ""}
                      </p>
                    )}
                    {fee.autoApply === "addon_purchase" && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("rowTriggerWaived")
                          .replace(
                            "{trigger}",
                            String(fee.triggerAddOnIds?.length ?? 0),
                          )
                          .replace(
                            "{waived}",
                            String(fee.waivedAddOnIds?.length ?? 0),
                          )}
                        {fee.waivePercentage != null
                          ? t("rowWaivePercent").replace(
                              "{pct}",
                              percent(fee.waivePercentage),
                            )
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={fee.isActive}
                      onCheckedChange={(c) =>
                        setCustomFees((prev) =>
                          prev.map((f) =>
                            f.id === fee.id ? { ...f, isActive: c } : f,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingCf(fee);
                        setCfModal(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        setCustomFees((prev) =>
                          prev.filter((f) => f.id !== fee.id),
                        );
                        toast.success(`"${fee.name}" deleted`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Service Bundles ── */}
      {sections.includes("service_bundles") && (
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Link2 className="size-4 text-emerald-700" />
                </div>
                {t("listBundles")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setEditingBundle(null);
                  setBundleModal(true);
                }}
              >
                <Plus className="size-3" />
                {t("addBundle")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredServiceBundles.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("listBundlesEmpty")}
              </p>
            ) : (
              filteredServiceBundles.map((rule) => {
                const triggerLabel =
                  serviceLabelMap[rule.triggerService] ?? rule.triggerService;
                const bundledServiceLabel =
                  serviceLabelMap[rule.bundledService] ?? rule.bundledService;
                const pricingLabel =
                  rule.pricingMode === "included"
                    ? "Included"
                    : rule.pricingMode === "discount_percentage"
                      ? t("rowOffAmount").replace(
                          "{amount}",
                          percent(rule.pricingValue ?? 0),
                        )
                      : rule.pricingMode === "discount_flat"
                        ? t("rowOffAmount").replace(
                            "{amount}",
                            money(rule.pricingValue ?? 0),
                          )
                        : t("rowFixedPrice").replace(
                            "{amount}",
                            money(rule.pricingValue ?? 0),
                          );

                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{rule.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {rule.bundleMode === "mandatory"
                            ? t("rowMandatory")
                            : t("rowOptional")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {pricingLabel}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {triggerLabel}{" "}
                        {range(rule.minUnits, rule.maxUnits, rule.triggerUnit)}{" "}
                        to {rule.bundledServiceLabel} ({bundledServiceLabel})
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {rule.requireSamePet ? t("rowSamePet") : t("rowAnyPet")}
                        {rule.requireSameRoom ? t("rowSameRoomSuffix") : ""}
                        {t("rowAppliesToSuffix").replace(
                          "{list}",
                          formatApplicableServices(rule.applicableServices),
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) =>
                          setServiceBundles((prev) =>
                            prev.map((item) =>
                              item.id === rule.id
                                ? { ...item, isActive: checked }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          setEditingBundle(rule);
                          setBundleModal(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-7"
                        onClick={() => {
                          setServiceBundles((prev) =>
                            prev.filter((item) => item.id !== rule.id),
                          );
                          toast.success(`"${rule.name}" deleted`);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ MODALS ═══ */}

      {/* Multi-Pet Discount Modal */}
      <MultiPetModal
        open={mpModal}
        onOpenChange={setMpModal}
        editing={editingMp}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(rule) => {
          if (editingMp) {
            setMultiPet((prev) =>
              prev.map((r) => (r.id === editingMp.id ? rule : r)),
            );
          } else {
            setMultiPet((prev) => [...prev, rule]);
          }
          setMpModal(false);
          toast.success(
            editingMp ? t("toastRuleUpdated") : t("toastRuleCreated"),
          );
        }}
      />

      {/* Time Fee Modal (Late Pickup / Early Drop-off) */}
      <TimeFeeModal
        open={tfModal}
        onOpenChange={setTfModal}
        editing={editingTf}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(fee) => {
          if (editingTf) {
            setTimeFees((prev) =>
              prev.map((f) => (f.id === editingTf.id ? fee : f)),
            );
          } else {
            setTimeFees((prev) => [...prev, fee]);
          }
          setTfModal(false);
          toast.success(
            editingTf ? t("toastFeeUpdated") : t("toastFeeCreated"),
          );
        }}
      />

      {/* Exceed 24h Modal */}
      <Dialog open={e24Modal} onOpenChange={setE24Modal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("exceedDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("exceedFeeName")}</Label>
              <Input
                value={exceed24h.name ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("exceedNamePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("amount")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={exceed24h.amount}
                  onChange={(e) =>
                    setExceed24h((prev) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("scope")}</Label>
                <Select
                  value={exceed24h.scope}
                  onValueChange={(v) =>
                    setExceed24h((prev) => ({
                      ...prev,
                      scope: v as "per_booking" | "per_pet",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_pet">{t("perPet")}</SelectItem>
                    <SelectItem value="per_booking">
                      {t("perBooking")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("taxRate")}</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={exceed24h.taxRate ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({
                    ...prev,
                    taxRate: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
                placeholder={t("facilityDefault")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("exceedDescription")}</Label>
              <Textarea
                value={exceed24h.description ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setE24Modal(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                setE24Modal(false);
                toast.success(t("saved"));
              }}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Fee Modal */}
      <CustomFeeModal
        open={cfModal}
        onOpenChange={setCfModal}
        editing={editingCf}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        addOnOptions={addOnOptions}
        onSave={(fee) => {
          if (editingCf) {
            setCustomFees((prev) =>
              prev.map((f) => (f.id === editingCf.id ? fee : f)),
            );
          } else {
            setCustomFees((prev) => [...prev, fee]);
          }
          setCfModal(false);
          toast.success(
            editingCf ? t("toastFeeUpdated") : t("toastFeeCreated"),
          );
        }}
      />

      {/* Multi-Night Discount Modal */}
      <MultiNightModal
        open={mnModal}
        onOpenChange={setMnModal}
        editing={editingMn}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(rule) => {
          if (editingMn) {
            setMultiNight((prev) =>
              prev.map((r) => (r.id === editingMn.id ? rule : r)),
            );
          } else {
            setMultiNight((prev) => [...prev, rule]);
          }
          setMnModal(false);
          toast.success(
            editingMn ? t("toastRuleUpdated") : t("toastRuleCreated"),
          );
        }}
      />

      {/* Room-Type Adjustment Modal */}
      <RoomTypeAdjustmentModal
        open={rtaModal}
        onOpenChange={setRtaModal}
        editing={editingRta}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(rule) => {
          if (editingRta) {
            setRoomTypeAdjustments((prev) =>
              prev.map((r) => (r.id === editingRta.id ? rule : r)),
            );
          } else {
            setRoomTypeAdjustments((prev) => [...prev, rule]);
          }
          setRtaModal(false);
          toast.success(
            editingRta ? t("toastRuleUpdated") : t("toastRuleCreated"),
          );
        }}
      />

      {/* Peak Surcharge Modal */}
      <PeakSurchargeModal
        open={pdModal}
        onOpenChange={setPdModal}
        editing={editingPd}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(rule) => {
          if (editingPd) {
            setPeakSurcharges((prev) =>
              prev.map((r) => (r.id === editingPd.id ? rule : r)),
            );
          } else {
            setPeakSurcharges((prev) => [...prev, rule]);
          }
          setPdModal(false);
          toast.success(
            editingPd ? t("toastSurchargeUpdated") : t("toastSurchargeCreated"),
          );
        }}
      />

      {/* Grooming Condition Adjustment Modal */}
      <GroomingConditionAdjustmentModal
        open={gcaModal}
        onOpenChange={setGcaModal}
        editing={editingGca}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(rule) => {
          if (editingGca) {
            setGroomingConditionAdjustments((prev) =>
              prev.map((r) => (r.id === editingGca.id ? rule : r)),
            );
          } else {
            setGroomingConditionAdjustments((prev) => [...prev, rule]);
          }
          setGcaModal(false);
          toast.success(
            editingGca ? t("toastRuleUpdated") : t("toastRuleCreated"),
          );
        }}
      />

      {/* Service Bundle Modal */}
      <ServiceBundleModal
        open={bundleModal}
        onOpenChange={setBundleModal}
        editing={editingBundle}
        serviceType={serviceType}
        serviceOptions={serviceOptions}
        onSave={(rule) => {
          if (editingBundle) {
            setServiceBundles((prev) =>
              prev.map((r) => (r.id === editingBundle.id ? rule : r)),
            );
          } else {
            setServiceBundles((prev) => [...prev, rule]);
          }
          setBundleModal(false);
          toast.success(
            editingBundle ? t("toastBundleUpdated") : t("toastBundleCreated"),
          );
        }}
      />
    </div>
  );
}
