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
import { Checkbox } from "@/components/ui/checkbox";
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
  Globe2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  getStoredServiceAddOns,
  getStoredPricingRules,
  saveStoredPricingRules,
} from "@/lib/pricing-rules";
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

// ── Helpers ──────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface ServiceOption {
  value: string;
  label: string;
}

interface HolidayCountryOption {
  code: string;
  label: string;
}

interface PublicHolidayApiItem {
  date: string;
  localName: string;
  name: string;
}

interface HolidayCatalogItem {
  name: string;
  dates: string[];
}

const HOLIDAY_COUNTRIES: HolidayCountryOption[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "CH", label: "Switzerland" },
  { code: "AT", label: "Austria" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "IE", label: "Ireland" },
  { code: "PL", label: "Poland" },
  { code: "CZ", label: "Czechia" },
  { code: "HU", label: "Hungary" },
  { code: "RO", label: "Romania" },
  { code: "GR", label: "Greece" },
  { code: "TR", label: "Turkey" },
  { code: "MX", label: "Mexico" },
  { code: "BR", label: "Brazil" },
  { code: "AR", label: "Argentina" },
  { code: "CL", label: "Chile" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "IN", label: "India" },
  { code: "SG", label: "Singapore" },
  { code: "ZA", label: "South Africa" },
];

const HOLIDAY_SYNC_YEAR_OPTIONS = [1, 2, 3, 5] as const;

const CORE_SERVICE_OPTIONS: ServiceOption[] = [
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
];

const BOARDING_ROOM_OPTIONS: ServiceOption[] = [
  { value: "standard", label: "Standard" },
  { value: "deluxe", label: "Deluxe" },
  { value: "vip", label: "VIP" },
  { value: "cat-suite", label: "Cat Suite" },
];

const GROOMING_HAIR_TYPE_OPTIONS: ServiceOption[] = [
  { value: "short", label: "Short coat" },
  { value: "medium", label: "Medium coat" },
  { value: "long", label: "Long coat" },
  { value: "double_coat", label: "Double coat" },
  { value: "curly", label: "Curly coat" },
  { value: "wire", label: "Wire coat" },
  { value: "matted", label: "Matted coat" },
];

function normalizeApplicableServices(applicableServices?: string[]) {
  if (!applicableServices || applicableServices.length === 0) return ["all"];
  return applicableServices.includes("all")
    ? ["all"]
    : Array.from(new Set(applicableServices));
}

function formatAdjustmentLabel(
  kind: "discount" | "surcharge",
  type: "flat" | "percentage",
  amount: number,
) {
  if (type === "percentage") {
    return kind === "discount" ? `-${amount}%` : `+${amount}%`;
  }
  return kind === "discount" ? `-$${amount}` : `+$${amount}`;
}

function formatRange(min?: number | null, max?: number | null, unit = "units") {
  const hasMin = min != null;
  const hasMax = max != null;
  if (hasMin && hasMax) return `${min}-${max} ${unit}`;
  if (hasMin) return `${min}+ ${unit}`;
  if (hasMax) return `Up to ${max} ${unit}`;
  return `Any ${unit}`;
}

function shiftIsoDate(dateIso: string, dayOffset: number) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function latestYearFromIsoDates(dates: string[]) {
  return dates.reduce((maxYear, dateIso) => {
    const year = Number(dateIso.slice(0, 4));
    if (!Number.isFinite(year)) return maxYear;
    return year > maxYear ? year : maxYear;
  }, 0);
}

function buildHolidayDateList(
  selectedNames: string[],
  catalog: HolidayCatalogItem[],
  extensionDaysBefore = 0,
  extensionDaysAfter = 0,
) {
  const dateSet = new Set<string>();
  for (const holiday of catalog) {
    if (!selectedNames.includes(holiday.name)) continue;
    for (const date of holiday.dates) {
      for (
        let offset = -extensionDaysBefore;
        offset <= extensionDaysAfter;
        offset += 1
      ) {
        dateSet.add(shiftIsoDate(date, offset));
      }
    }
  }
  return Array.from(dateSet).sort();
}

async function fetchHolidayCatalog(
  countryCode: string,
  yearsAhead: number,
): Promise<HolidayCatalogItem[]> {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(1, yearsAhead) },
    (_, index) => currentYear + index,
  );

  const responses = await Promise.all(
    years.map((year) =>
      fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      ),
    ),
  );

  const failed = responses.find((response) => !response.ok);
  if (failed) {
    throw new Error("Could not load holiday dates for this country");
  }

  const payloads = (await Promise.all(
    responses.map((response) => response.json()),
  )) as PublicHolidayApiItem[][];

  const holidaysByName = new Map<string, Set<string>>();

  for (const payload of payloads) {
    for (const holiday of payload) {
      const holidayName = holiday.name?.trim() || holiday.localName?.trim();
      if (!holidayName) continue;
      if (!holidaysByName.has(holidayName)) {
        holidaysByName.set(holidayName, new Set<string>());
      }
      holidaysByName.get(holidayName)?.add(holiday.date);
    }
  }

  return Array.from(holidaysByName.entries())
    .map(([name, dates]) => ({
      name,
      dates: Array.from(dates).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

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
  showSections,
  hideSectionHeader = false,
}: PricingRulesPanelProps) {
  const sections = showSections ?? ALL_SECTIONS;
  const rules = getStoredPricingRules();
  const { activeModules } = useCustomServices();

  const serviceOptions: ServiceOption[] = [
    ...CORE_SERVICE_OPTIONS,
    ...activeModules.map((module) => ({
      value: module.slug,
      label: module.name,
    })),
  ];
  const serviceLabelMap = Object.fromEntries(
    serviceOptions.map((service) => [service.value, service.label]),
  ) as Record<string, string>;
  const addOnOptions = getStoredServiceAddOns().filter(
    (addOn) => addOn.isActive,
  );
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

  useEffect(() => {
    saveStoredPricingRules({
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
        toast.success("Holiday surcharge dates auto-refreshed");
      }

      if (hadErrors) {
        toast.error("Some holiday rules could not be auto-refreshed");
      }
    };

    void autoRefreshHolidayRules();

    return () => {
      cancelled = true;
    };
  }, [peakSurcharges]);

  return (
    <div className="space-y-5">
      {/* ── Section header ── */}
      {!hideSectionHeader && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-sm font-bold tracking-tight text-slate-800">
            Pricing Rules
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Set up discounts and extra fees for {serviceScopeLabel} bookings
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
                How Discounts Combine
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setPreviewOpen(!previewOpen)}
              >
                Quick Estimate
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-xs">
              If more than one discount matches a booking, choose how they
              should apply.
            </p>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "best_only" as const,
                    label: "Apply best discount only",
                    desc: "Customer gets the single largest discount",
                  },
                  {
                    value: "apply_all_sequence" as const,
                    label: "Combine all matching discounts",
                    desc: "Every matching discount is applied",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStacking(opt.value)}
                  className={`w-full rounded-lg border p-3 text-left transition-all ${
                    stacking === opt.value
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
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
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                  Quick Estimate
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Base rate ($)</Label>
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
                    <Label className="text-[10px]">Pets</Label>
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
                    <Label className="text-[10px]">Nights</Label>
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
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {appliedDiscounts.map((d, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs text-emerald-700"
                        >
                          <span>{d.name}</span>
                          <span>-${d.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      {discounts.length > 0 &&
                        stacking === "best_only" &&
                        discounts.length > 1 && (
                          <p className="text-[10px] text-amber-600">
                            {discounts.length - 1} other discount
                            {discounts.length > 2 ? "s" : ""} skipped (best
                            only)
                          </p>
                        )}
                      <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                        <span>Total</span>
                        <span>${Math.max(0, total).toFixed(2)}</span>
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
                Multi-Pet Discounts
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
                Add Rule
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredMultiPet.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No multi-pet discount rules yet for these services
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
                          ? "Per pet"
                          : "Additional pet"}
                      </Badge>
                      {rule.sameLodging && (
                        <Badge variant="outline" className="text-[10px]">
                          Same lodging
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {rule.tiers
                        .map(
                          (t) =>
                            `${t.petCount}+ pets: -${
                              rule.discountValueType === "percentage"
                                ? `${t.discountAmount}%`
                                : `$${t.discountAmount}`
                            }`,
                        )
                        .join(" · ")}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Applies to:{" "}
                      {formatApplicableServices(rule.applicableServices)}
                    </p>
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
                Long-Stay Discounts
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
                Add Rule
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredMultiNight.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No long-stay discount rules yet
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
                      {rule.minNights}
                      {rule.maxNights ? `–${rule.maxNights}` : "+"} nights ·{" "}
                      {rule.discountMode === "flat"
                        ? `$${rule.discountAmount ?? 0} off`
                        : rule.discountMode === "free_nights"
                          ? `${rule.freeNights ?? 1} free night${
                              (rule.freeNights ?? 1) === 1 ? "" : "s"
                            }`
                          : `${rule.discountPercent}% off`}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Applies to:{" "}
                      {formatApplicableServices(rule.applicableServices)}
                    </p>
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
                Room-Type Pricing
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
                Add Rule
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredRoomTypeAdjustments.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No room-type pricing rules yet
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
                        {formatAdjustmentLabel(
                          rule.adjustmentKind,
                          rule.adjustmentType,
                          rule.amount,
                        )}
                      </Badge>
                      {rule.sameRoomRequired && (
                        <Badge variant="outline" className="text-[10px]">
                          Same room required
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Rooms: {rule.roomTypeIds.join(", ")} ·{" "}
                      {formatRange(rule.minNights, rule.maxNights, "nights")}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Applies to:{" "}
                      {formatApplicableServices(rule.applicableServices)}
                    </p>
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
                Busy-Date Surcharges
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
                Add Surcharge
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredPeakSurcharges.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No busy-date surcharges yet
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
                          ? "First pet"
                          : "Per pet"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {rule.dateMode === "holiday"
                        ? `Holiday auto-sync${rule.holidayCountryCode ? ` (${rule.holidayCountryCode})` : ""} · ${rule.holidayDates?.length ?? rule.dateRanges?.length ?? 0} dates${
                            (rule.holidayExtensionDaysBefore ?? 0) > 0 ||
                            (rule.holidayExtensionDaysAfter ?? 0) > 0
                              ? ` · window -${rule.holidayExtensionDaysBefore ?? 0}/+${rule.holidayExtensionDaysAfter ?? 0} days`
                              : ""
                          }`
                        : `${rule.startDate} → ${rule.endDate}`}
                      {` · Applies to ${formatApplicableServices(rule.applicableServices)}`}
                    </p>
                    {rule.dateMode === "holiday" && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Active window: {rule.startDate} → {rule.endDate}
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
                Late Pickup / Early Drop-off Fees
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
                Add Fee
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredTimeFees.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No late pickup or early drop-off fees yet
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
                            ? "Late Pickup"
                            : "Early Drop-off")}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.condition === "late_pickup"
                          ? "Late pickup"
                          : "Early drop-off"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.feeType === "extra_night"
                          ? "Extra night"
                          : `$${fee.amount}${
                              fee.feeType === "per_minute"
                                ? "/min"
                                : fee.feeType === "per_30min"
                                  ? "/30 min"
                                  : fee.feeType === "per_hour"
                                    ? "/hr"
                                    : " flat"
                            }`}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.scope === "per_pet" ? "Per pet" : "Per booking"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {fee.graceMinutes} min grace · Based on{" "}
                      {fee.basedOn === "business_hours"
                        ? "business hours"
                        : `custom time (${fee.customTime})`}
                      {fee.maxFee ? ` · Max $${fee.maxFee}` : ""}
                      {(fee.applyFromTime || fee.applyUntilTime) &&
                        ` · Window ${fee.applyFromTime ?? "00:00"} - ${fee.applyUntilTime ?? "23:59"}`}
                      {` · Applies to ${formatApplicableServices(fee.applicableServices)}`}
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
                        toast.success("Fee deleted");
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
                Pet-Spec Condition Fees
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
                Add Rule
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredGroomingConditionAdjustments.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No pet-spec condition adjustment rules yet
              </p>
            ) : (
              filteredGroomingConditionAdjustments.map((rule) => {
                const conditions: string[] = [];
                if (rule.hairTypes?.length) {
                  conditions.push(`${rule.hairTypes.length} hair type(s)`);
                }
                if (rule.breeds?.length) {
                  conditions.push(`${rule.breeds.length} breed(s)`);
                }
                if (rule.sexes?.length) {
                  conditions.push(`Sex: ${rule.sexes.join(", ")}`);
                }
                if (rule.petStatuses?.length) {
                  conditions.push(`Status: ${rule.petStatuses.join(", ")}`);
                }
                if (rule.ageMinYears != null || rule.ageMaxYears != null) {
                  conditions.push(
                    `Age ${formatRange(rule.ageMinYears, rule.ageMaxYears, "years")}`,
                  );
                }
                if (rule.weightMinKg != null || rule.weightMaxKg != null) {
                  conditions.push(
                    `Weight ${formatRange(rule.weightMinKg, rule.weightMaxKg, "kg")}`,
                  );
                }
                if (
                  rule.durationMinutesMin != null ||
                  rule.durationMinutesMax != null
                ) {
                  conditions.push(
                    `Duration ${formatRange(rule.durationMinutesMin, rule.durationMinutesMax, "min")}`,
                  );
                }
                if (rule.appointmentWindowStart || rule.appointmentWindowEnd) {
                  conditions.push(
                    `Time ${rule.appointmentWindowStart ?? "00:00"} - ${rule.appointmentWindowEnd ?? "23:59"}`,
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
                          {formatAdjustmentLabel(
                            rule.adjustmentKind,
                            rule.adjustmentType,
                            rule.amount,
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {rule.billingMode === "per_unit"
                            ? `Per ${rule.unitType ?? "sessions"}`
                            : "One-time"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {conditions.length > 0
                          ? conditions.join(" · ")
                          : "No conditions set"}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Applies to:{" "}
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
                  Over 24-Hour Stay Fee
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
                  <span className="font-medium">${exceed24h.amount}</span>{" "}
                  <span className="text-muted-foreground">
                    {exceed24h.scope === "per_pet" ? "per pet" : "per booking"}
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
                Custom Fees
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
                Add Fee
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredCustomFees.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No custom fees yet
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
                          ? `$${fee.amount}`
                          : `${fee.amount}%`}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {fee.scope === "per_pet" ? "Per pet" : "Per booking"}
                      </Badge>
                      {fee.autoApply !== "none" && (
                        <Badge className="bg-blue-100 text-[10px] text-blue-700">
                          {fee.autoApply === "at_checkout"
                            ? "Auto at checkout"
                            : fee.autoApply === "by_care_type"
                              ? "Auto by care type"
                              : fee.autoApply === "new_customer"
                                ? "Auto for new customer"
                                : fee.autoApply === "new_pet"
                                  ? "Auto for new pet"
                                  : fee.autoApply === "customer_segment"
                                    ? "Auto by customer segment"
                                    : "Auto by add-on purchase"}
                        </Badge>
                      )}
                    </div>
                    {fee.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {fee.description}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Applies to:{" "}
                      {formatApplicableServices(fee.applicableServices)}
                    </p>
                    {fee.autoApply === "customer_segment" && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Segment:{" "}
                        {fee.customerStatuses?.length
                          ? `status ${fee.customerStatuses.join(", ")}`
                          : "any status"}
                        {fee.membershipPlans?.length
                          ? ` · plans ${fee.membershipPlans.join(", ")}`
                          : ""}
                        {fee.requireMembershipActive
                          ? " · active membership"
                          : ""}
                        {fee.requirePrepaidBalance ? " · prepaid balance" : ""}
                      </p>
                    )}
                    {fee.autoApply === "addon_purchase" && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Trigger add-ons: {fee.triggerAddOnIds?.length ?? 0} ·
                        Waived add-ons: {fee.waivedAddOnIds?.length ?? 0}
                        {fee.waivePercentage != null
                          ? ` · Waive ${fee.waivePercentage}%`
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
                Service Bundles
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
                Add Bundle
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredServiceBundles.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No service bundle rules yet
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
                      ? `${rule.pricingValue ?? 0}% off`
                      : rule.pricingMode === "discount_flat"
                        ? `$${rule.pricingValue ?? 0} off`
                        : `Fixed $${rule.pricingValue ?? 0}`;

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
                            ? "Mandatory"
                            : "Optional"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {pricingLabel}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {triggerLabel}{" "}
                        {formatRange(
                          rule.minUnits,
                          rule.maxUnits,
                          rule.triggerUnit,
                        )}{" "}
                        to {rule.bundledServiceLabel} ({bundledServiceLabel})
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {rule.requireSamePet ? "Same pet" : "Any pet"}
                        {rule.requireSameRoom ? " · Same room" : ""}
                        {` · Applies to ${formatApplicableServices(rule.applicableServices)}`}
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
          toast.success(editingMp ? "Rule updated" : "Rule created");
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
          toast.success(editingTf ? "Fee updated" : "Fee created");
        }}
      />

      {/* Exceed 24h Modal */}
      <Dialog open={e24Modal} onOpenChange={setE24Modal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exceed 24-Hour Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fee Name</Label>
              <Input
                value={exceed24h.name ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. 24-Hour Overflow"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
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
                <Label>Scope</Label>
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
                    <SelectItem value="per_pet">Per pet</SelectItem>
                    <SelectItem value="per_booking">Per booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
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
                placeholder="Uses facility default"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
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
              Cancel
            </Button>
            <Button
              onClick={() => {
                setE24Modal(false);
                toast.success("Saved");
              }}
            >
              Save
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
          toast.success(editingCf ? "Fee updated" : "Fee created");
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
          toast.success(editingMn ? "Rule updated" : "Rule created");
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
          toast.success(editingRta ? "Rule updated" : "Rule created");
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
          toast.success(editingPd ? "Surcharge updated" : "Surcharge created");
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
          toast.success(editingGca ? "Rule updated" : "Rule created");
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
          toast.success(editingBundle ? "Bundle updated" : "Bundle created");
        }}
      />
    </div>
  );
}

// ── Multi-Pet Discount Modal ─────────────────────────────────────────

function MultiPetModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MultiPetDiscountRule | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: MultiPetDiscountRule) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    discountType: "additional_pet" as "per_pet" | "additional_pet",
    discountValueType: "flat" as "flat" | "percentage",
    sameLodging: false,
    tiers: [{ petCount: 2, discountAmount: 5 }],
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
    isActive: true,
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        discountType: editing.discountType,
        discountValueType: editing.discountValueType ?? "flat",
        sameLodging: editing.sameLodging,
        tiers: editing.tiers.map((t) => ({ ...t })),
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: "",
        discountType: "additional_pet",
        discountValueType: "flat",
        sameLodging: false,
        tiers: [{ petCount: 2, discountAmount: 5 }],
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
        isActive: true,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Multi-Pet Discount" : "Add Multi-Pet Discount"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Multi-Pet Boarding Discount"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Discount applies to</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    discountType: v as "per_pet" | "additional_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="additional_pet">
                    Additional pet only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount value type</Label>
              <Select
                value={form.discountValueType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    discountValueType: v as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.sameLodging}
                  onCheckedChange={(c) =>
                    setForm((p) => ({ ...p, sameLodging: c === true }))
                  }
                />
                <span className="text-sm">Same lodging required</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Discount Tiers</Label>
            <div className="space-y-2">
              {form.tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2}
                    value={tier.petCount}
                    onChange={(e) => {
                      const next = [...form.tiers];
                      next[i] = {
                        ...tier,
                        petCount: parseInt(e.target.value) || 2,
                      };
                      setForm((p) => ({ ...p, tiers: next }));
                    }}
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">
                    + pets →{" "}
                    {form.discountValueType === "percentage" ? "%" : "$"}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={tier.discountAmount}
                    onChange={(e) => {
                      const next = [...form.tiers];
                      next[i] = {
                        ...tier,
                        discountAmount: parseFloat(e.target.value) || 0,
                      };
                      setForm((p) => ({ ...p, tiers: next }));
                    }}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">off</span>
                  {form.tiers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          tiers: p.tiers.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    tiers: [
                      ...p.tiers,
                      {
                        petCount: (p.tiers.at(-1)?.petCount ?? 1) + 1,
                        discountAmount: 0,
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-3" />
                Add tier
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSave({
                id: editing?.id ?? makeId("mpd"),
                name: form.name,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: form.isActive,
                discountType: form.discountType,
                discountValueType: form.discountValueType,
                sameLodging: form.sameLodging,
                tiers: form.tiers,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Time Fee Modal (Late Pickup / Early Drop-off) ────────────────────

function TimeFeeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LatePickupFee | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (fee: LatePickupFee) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    condition: "late_pickup" as "late_pickup" | "early_dropoff",
    graceMinutes: 15,
    feeType: "per_30min" as
      | "flat"
      | "per_hour"
      | "per_30min"
      | "per_minute"
      | "extra_night",
    amount: 10,
    maxFee: undefined as number | undefined,
    scope: "per_pet" as "per_booking" | "per_pet",
    basedOn: "business_hours" as "business_hours" | "custom_time",
    customTime: "",
    applyFromTime: "",
    applyUntilTime: "",
    taxRate: undefined as number | undefined,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name ?? "",
        condition: editing.condition,
        graceMinutes: editing.graceMinutes,
        feeType: editing.feeType,
        amount: editing.amount,
        maxFee: editing.maxFee,
        scope: editing.scope,
        basedOn: editing.basedOn,
        customTime: editing.customTime ?? "",
        applyFromTime: editing.applyFromTime ?? "",
        applyUntilTime: editing.applyUntilTime ?? "",
        taxRate: editing.taxRate,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        condition: "late_pickup",
        graceMinutes: 15,
        feeType: "per_30min",
        amount: 10,
        maxFee: undefined,
        scope: "per_pet",
        basedOn: "business_hours",
        customTime: "",
        applyFromTime: "",
        applyUntilTime: "",
        taxRate: undefined,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Time Fee" : "Add Time Fee"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fee Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Late Pickup Fee"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    condition: v as "late_pickup" | "early_dropoff",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late_pickup">Late pickup</SelectItem>
                  <SelectItem value="early_dropoff">Early drop-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    scope: v as "per_booking" | "per_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="per_booking">Per booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Grace (min)</Label>
              <Input
                type="number"
                min={0}
                value={form.graceMinutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    graceMinutes: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                disabled={form.feeType === "extra_night"}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder={
                  form.feeType === "extra_night"
                    ? "Uses nightly base"
                    : undefined
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select
                value={form.feeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    feeType: v as
                      | "flat"
                      | "per_hour"
                      | "per_30min"
                      | "per_minute"
                      | "extra_night",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="per_minute">Per minute</SelectItem>
                  <SelectItem value="per_30min">Per 30 min</SelectItem>
                  <SelectItem value="per_hour">Per hour</SelectItem>
                  <SelectItem value="extra_night">
                    Charge extra night
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Fee ($)</Label>
              <Input
                type="number"
                min={0}
                value={form.maxFee ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    maxFee: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="No cap"
              />
            </div>
            <div className="space-y-2">
              <Label>Based On</Label>
              <Select
                value={form.basedOn}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    basedOn: v as "business_hours" | "custom_time",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_hours">Business hours</SelectItem>
                  <SelectItem value="custom_time">Custom time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.basedOn === "custom_time" && (
            <div className="space-y-2">
              <Label>Custom Time</Label>
              <Input
                type="time"
                value={form.customTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customTime: e.target.value }))
                }
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Apply from time</Label>
              <Input
                type="time"
                value={form.applyFromTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, applyFromTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Apply until time</Label>
              <Input
                type="time"
                value={form.applyUntilTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, applyUntilTime: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.taxRate ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  taxRate: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="Uses facility default"
            />
          </div>
          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed">
            If more than one time fee could apply, the most recent matching fee
            is used unless your facility enables fee stacking.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: editing?.id ?? makeId("tf"),
                name: form.name || undefined,
                enabled: true,
                condition: form.condition,
                graceMinutes: form.graceMinutes,
                feeType: form.feeType,
                amount: form.amount,
                maxFee: form.maxFee,
                scope: form.scope,
                basedOn: form.basedOn,
                customTime:
                  form.basedOn === "custom_time" ? form.customTime : undefined,
                applyFromTime: form.applyFromTime || undefined,
                applyUntilTime: form.applyUntilTime || undefined,
                taxRate: form.taxRate,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
              })
            }
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Multi-Night Discount Modal ───────────────────────────────────────

function MultiNightModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MultiNightDiscount | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: MultiNightDiscount) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    minNights: 3,
    maxNights: null as number | null,
    discountPercent: 10,
    discountMode: "percentage" as "percentage" | "flat" | "free_nights",
    discountAmount: 25,
    freeNights: 1,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
    isActive: true,
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        minNights: editing.minNights,
        maxNights: editing.maxNights,
        discountPercent: editing.discountPercent,
        discountMode: editing.discountMode ?? "percentage",
        discountAmount: editing.discountAmount ?? 25,
        freeNights: editing.freeNights ?? 1,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: "",
        minNights: 3,
        maxNights: null,
        discountPercent: 10,
        discountMode: "percentage",
        discountAmount: 25,
        freeNights: 1,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
        isActive: true,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Multi-Night Discount" : "Add Multi-Night Discount"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Extended Stay Discount"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min nights</Label>
              <Input
                type="number"
                min={2}
                value={form.minNights}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    minNights: parseInt(e.target.value) || 2,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max nights</Label>
              <Input
                type="number"
                min={form.minNights + 1}
                value={form.maxNights ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    maxNights: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="No limit"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Discount mode</Label>
              <Select
                value={form.discountMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    discountMode: value as
                      | "percentage"
                      | "flat"
                      | "free_nights",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percent off</SelectItem>
                  <SelectItem value="flat">Flat amount off</SelectItem>
                  <SelectItem value="free_nights">Free nights</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {form.discountMode === "percentage"
                  ? "Discount (%)"
                  : form.discountMode === "flat"
                    ? "Amount off ($)"
                    : "Free nights"}
              </Label>
              <Input
                type="number"
                min={0}
                max={form.discountMode === "percentage" ? 100 : undefined}
                value={
                  form.discountMode === "percentage"
                    ? form.discountPercent
                    : form.discountMode === "flat"
                      ? form.discountAmount
                      : form.freeNights
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setForm((prev) =>
                    prev.discountMode === "percentage"
                      ? { ...prev, discountPercent: value }
                      : prev.discountMode === "flat"
                        ? { ...prev, discountAmount: value }
                        : {
                            ...prev,
                            freeNights: Math.max(0, Math.round(value)),
                          },
                  );
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSave({
                id: editing?.id ?? makeId("mnd"),
                name: form.name,
                minNights: form.minNights,
                maxNights: form.maxNights,
                discountPercent:
                  form.discountMode === "percentage" ? form.discountPercent : 0,
                discountMode: form.discountMode,
                discountAmount:
                  form.discountMode === "flat"
                    ? form.discountAmount
                    : undefined,
                freeNights:
                  form.discountMode === "free_nights"
                    ? Math.max(1, form.freeNights)
                    : undefined,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: form.isActive,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Room-Type Adjustment Modal ──────────────────────────────────────

function RoomTypeAdjustmentModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoomTypeAdjustment | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: RoomTypeAdjustment) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    roomTypeIds: ["standard"],
    minNights: null as number | null,
    maxNights: null as number | null,
    sameRoomRequired: true,
    adjustmentKind: "discount" as "discount" | "surcharge",
    adjustmentType: "percentage" as "flat" | "percentage",
    amount: 10,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["boarding"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        roomTypeIds: editing.roomTypeIds,
        minNights: editing.minNights ?? null,
        maxNights: editing.maxNights ?? null,
        sameRoomRequired: editing.sameRoomRequired,
        adjustmentKind: editing.adjustmentKind,
        adjustmentType: editing.adjustmentType,
        amount: editing.amount,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        roomTypeIds: ["standard"],
        minNights: null,
        maxNights: null,
        sameRoomRequired: true,
        adjustmentKind: "discount",
        adjustmentType: "percentage",
        amount: 10,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["boarding"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Room-Type Rule" : "Add Room-Type Rule"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Deluxe room long-stay discount"
            />
          </div>

          <div className="space-y-2">
            <Label>Room Types</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              {BOARDING_ROOM_OPTIONS.map((roomType) => (
                <label key={roomType.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.roomTypeIds.includes(roomType.value)}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        roomTypeIds:
                          checked === true
                            ? prev.roomTypeIds.includes(roomType.value)
                              ? prev.roomTypeIds
                              : [...prev.roomTypeIds, roomType.value]
                            : prev.roomTypeIds.filter(
                                (value) => value !== roomType.value,
                              ),
                      }))
                    }
                  />
                  <span className="text-xs">{roomType.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min nights</Label>
              <Input
                type="number"
                min={1}
                value={form.minNights ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    minNights: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max nights</Label>
              <Input
                type="number"
                min={1}
                value={form.maxNights ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxNights: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="No cap"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.sameRoomRequired}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  sameRoomRequired: checked === true,
                }))
              }
            />
            <span className="text-sm">Require same room for all nights</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.adjustmentKind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentKind: value as "discount" | "surcharge",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="surcharge">Surcharge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={form.adjustmentType}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentType: value as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percent</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.adjustmentType === "percentage" ? "%" : "$"}</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              if (form.roomTypeIds.length === 0) {
                toast.error("Select at least one room type");
                return;
              }

              onSave({
                id: editing?.id ?? makeId("rta"),
                name: form.name,
                roomTypeIds: form.roomTypeIds,
                minNights: form.minNights,
                maxNights: form.maxNights,
                sameRoomRequired: form.sameRoomRequired,
                adjustmentKind: form.adjustmentKind,
                adjustmentType: form.adjustmentType,
                amount: form.amount,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Grooming Condition Adjustment Modal ─────────────────────────────

function GroomingConditionAdjustmentModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GroomingConditionAdjustment | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: GroomingConditionAdjustment) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    hairTypes: [] as string[],
    breeds: [] as string[],
    sexes: [] as Array<"male" | "female">,
    petStatuses: [] as Array<"active" | "inactive" | "deceased">,
    ageMinYears: null as number | null,
    ageMaxYears: null as number | null,
    weightMinKg: null as number | null,
    weightMaxKg: null as number | null,
    durationMinutesMin: null as number | null,
    durationMinutesMax: null as number | null,
    appointmentWindowStart: "",
    appointmentWindowEnd: "",
    adjustmentKind: "surcharge" as "discount" | "surcharge",
    adjustmentType: "flat" as "flat" | "percentage",
    billingMode: "one_time" as "one_time" | "per_unit",
    unitType: "sessions" as "nights" | "days" | "sessions",
    amount: 15,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["grooming"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        hairTypes: editing.hairTypes ?? [],
        breeds: editing.breeds ?? [],
        sexes: editing.sexes ?? [],
        petStatuses: editing.petStatuses ?? [],
        ageMinYears: editing.ageMinYears ?? null,
        ageMaxYears: editing.ageMaxYears ?? null,
        weightMinKg: editing.weightMinKg ?? null,
        weightMaxKg: editing.weightMaxKg ?? null,
        durationMinutesMin: editing.durationMinutesMin ?? null,
        durationMinutesMax: editing.durationMinutesMax ?? null,
        appointmentWindowStart: editing.appointmentWindowStart ?? "",
        appointmentWindowEnd: editing.appointmentWindowEnd ?? "",
        adjustmentKind: editing.adjustmentKind,
        adjustmentType: editing.adjustmentType,
        billingMode: editing.billingMode ?? "one_time",
        unitType: editing.unitType ?? "sessions",
        amount: editing.amount,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        hairTypes: [],
        breeds: [],
        sexes: [],
        petStatuses: [],
        ageMinYears: null,
        ageMaxYears: null,
        weightMinKg: null,
        weightMaxKg: null,
        durationMinutesMin: null,
        durationMinutesMax: null,
        appointmentWindowStart: "",
        appointmentWindowEnd: "",
        adjustmentKind: "surcharge",
        adjustmentType: "flat",
        billingMode: "one_time",
        unitType: "sessions",
        amount: 15,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["grooming"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Pet Condition Rule" : "Add Pet Condition Rule"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Senior large-breed handling surcharge"
            />
          </div>

          <div className="space-y-2">
            <Label>Hair type conditions</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              {GROOMING_HAIR_TYPE_OPTIONS.map((hairType) => (
                <label key={hairType.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.hairTypes.includes(hairType.value)}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        hairTypes:
                          checked === true
                            ? prev.hairTypes.includes(hairType.value)
                              ? prev.hairTypes
                              : [...prev.hairTypes, hairType.value]
                            : prev.hairTypes.filter(
                                (value) => value !== hairType.value,
                              ),
                      }))
                    }
                  />
                  <span className="text-xs">{hairType.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Breeds (comma separated)</Label>
            <Input
              value={form.breeds.join(", ")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  breeds: e.target.value
                    .split(",")
                    .map((value) => value.trim().toLowerCase())
                    .filter((value) => value.length > 0),
                }))
              }
              placeholder="golden retriever, poodle"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min age (years)</Label>
              <Input
                type="number"
                min={0}
                value={form.ageMinYears ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ageMinYears: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max age (years)</Label>
              <Input
                type="number"
                min={0}
                value={form.ageMaxYears ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ageMaxYears: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sex and pet status</Label>
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label className="text-xs">Sex</Label>
                {(
                  [
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ] as const
                ).map((sexOption) => (
                  <label
                    key={sexOption.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.sexes.includes(sexOption.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          sexes:
                            checked === true
                              ? prev.sexes.includes(sexOption.value)
                                ? prev.sexes
                                : [...prev.sexes, sexOption.value]
                              : prev.sexes.filter(
                                  (value) => value !== sexOption.value,
                                ),
                        }))
                      }
                    />
                    <span className="text-xs">{sexOption.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pet status</Label>
                {(
                  [
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "deceased", label: "Deceased" },
                  ] as const
                ).map((statusOption) => (
                  <label
                    key={statusOption.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.petStatuses.includes(statusOption.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          petStatuses:
                            checked === true
                              ? prev.petStatuses.includes(statusOption.value)
                                ? prev.petStatuses
                                : [...prev.petStatuses, statusOption.value]
                              : prev.petStatuses.filter(
                                  (value) => value !== statusOption.value,
                                ),
                        }))
                      }
                    />
                    <span className="text-xs">{statusOption.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min weight (kg)</Label>
              <Input
                type="number"
                min={0}
                value={form.weightMinKg ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    weightMinKg: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max weight (kg)</Label>
              <Input
                type="number"
                min={0}
                value={form.weightMaxKg ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    weightMaxKg: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min duration (min)</Label>
              <Input
                type="number"
                min={0}
                value={form.durationMinutesMin ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutesMin: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max duration (min)</Label>
              <Input
                type="number"
                min={0}
                value={form.durationMinutesMax ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutesMax: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Appointment window start</Label>
              <Input
                type="time"
                value={form.appointmentWindowStart}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    appointmentWindowStart: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Appointment window end</Label>
              <Input
                type="time"
                value={form.appointmentWindowEnd}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    appointmentWindowEnd: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.adjustmentKind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentKind: value as "discount" | "surcharge",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surcharge">Surcharge</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={form.adjustmentType}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentType: value as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.adjustmentType === "percentage" ? "%" : "$"}</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Billing mode</Label>
              <Select
                value={form.billingMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    billingMode: value as "one_time" | "per_unit",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="per_unit">Per unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit type</Label>
              <Select
                value={form.unitType}
                disabled={form.billingMode !== "per_unit"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    unitType: value as "nights" | "days" | "sessions",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="nights">Nights</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }

              const hasAnyCondition =
                form.hairTypes.length > 0 ||
                form.breeds.length > 0 ||
                form.sexes.length > 0 ||
                form.petStatuses.length > 0 ||
                form.ageMinYears !== null ||
                form.ageMaxYears !== null ||
                form.weightMinKg !== null ||
                form.weightMaxKg !== null ||
                form.durationMinutesMin !== null ||
                form.durationMinutesMax !== null ||
                Boolean(form.appointmentWindowStart) ||
                Boolean(form.appointmentWindowEnd);

              if (!hasAnyCondition) {
                toast.error(
                  "Add at least one pet condition (age, breed, sex, status, weight, duration, or time)",
                );
                return;
              }

              onSave({
                id: editing?.id ?? makeId("gca"),
                name: form.name,
                hairTypes: form.hairTypes,
                breeds: form.breeds,
                sexes: form.sexes,
                petStatuses: form.petStatuses,
                ageMinYears: form.ageMinYears,
                ageMaxYears: form.ageMaxYears,
                weightMinKg: form.weightMinKg,
                weightMaxKg: form.weightMaxKg,
                durationMinutesMin: form.durationMinutesMin,
                durationMinutesMax: form.durationMinutesMax,
                appointmentWindowStart:
                  form.appointmentWindowStart || undefined,
                appointmentWindowEnd: form.appointmentWindowEnd || undefined,
                adjustmentKind: form.adjustmentKind,
                adjustmentType: form.adjustmentType,
                billingMode: form.billingMode,
                unitType:
                  form.billingMode === "per_unit" ? form.unitType : undefined,
                amount: form.amount,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Service Bundle Modal ────────────────────────────────────────────

function ServiceBundleModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ServiceBundleRule | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: ServiceBundleRule) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    triggerService: serviceType === "all" ? "boarding" : serviceType,
    bundledService: "grooming",
    bundledServiceLabel: "Departure Bath",
    triggerUnit: "nights" as "nights" | "sessions" | "days",
    minUnits: 6,
    maxUnits: null as number | null,
    requireSamePet: true,
    requireSameRoom: true,
    bundleMode: "mandatory" as "mandatory" | "optional",
    pricingMode: "discount_percentage" as
      | "included"
      | "discount_flat"
      | "discount_percentage"
      | "fixed_price",
    pricingValue: 30,
    notes: "",
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["boarding", "grooming"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        triggerService: editing.triggerService,
        bundledService: editing.bundledService,
        bundledServiceLabel: editing.bundledServiceLabel,
        triggerUnit: editing.triggerUnit,
        minUnits: editing.minUnits,
        maxUnits: editing.maxUnits ?? null,
        requireSamePet: editing.requireSamePet,
        requireSameRoom: editing.requireSameRoom,
        bundleMode: editing.bundleMode,
        pricingMode: editing.pricingMode,
        pricingValue: editing.pricingValue ?? 0,
        notes: editing.notes ?? "",
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        triggerService: serviceType === "all" ? "boarding" : serviceType,
        bundledService: "grooming",
        bundledServiceLabel: "Departure Bath",
        triggerUnit: "nights",
        minUnits: 6,
        maxUnits: null,
        requireSamePet: true,
        requireSameRoom: true,
        bundleMode: "mandatory",
        pricingMode: "discount_percentage",
        pricingValue: 30,
        notes: "",
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["boarding", "grooming"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Service Bundle" : "Add Service Bundle"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Bundle Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. 6+ night departure bath bundle"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trigger service</Label>
              <Select
                value={form.triggerService}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, triggerService: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bundled service</Label>
              <Select
                value={form.bundledService}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, bundledService: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bundled item label</Label>
            <Input
              value={form.bundledServiceLabel}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  bundledServiceLabel: e.target.value,
                }))
              }
              placeholder="e.g. Departure Bath"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Min</Label>
              <Input
                type="number"
                min={1}
                value={form.minUnits}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    minUnits: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max</Label>
              <Input
                type="number"
                min={form.minUnits}
                value={form.maxUnits ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxUnits: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="No cap"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={form.triggerUnit}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    triggerUnit: value as "nights" | "sessions" | "days",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nights">Nights</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.requireSamePet}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    requireSamePet: checked === true,
                  }))
                }
              />
              <span className="text-sm">Require same pet</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.requireSameRoom}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    requireSameRoom: checked === true,
                  }))
                }
              />
              <span className="text-sm">Require same room</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bundle mode</Label>
              <Select
                value={form.bundleMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    bundleMode: value as "mandatory" | "optional",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mandatory">Mandatory add-on</SelectItem>
                  <SelectItem value="optional">Optional suggestion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bundle pricing</Label>
              <Select
                value={form.pricingMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    pricingMode: value as
                      | "included"
                      | "discount_flat"
                      | "discount_percentage"
                      | "fixed_price",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">Included (free)</SelectItem>
                  <SelectItem value="discount_percentage">
                    Discount percentage
                  </SelectItem>
                  <SelectItem value="discount_flat">Discount flat</SelectItem>
                  <SelectItem value="fixed_price">
                    Fixed bundle price
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.pricingMode !== "included" && (
            <div className="space-y-2">
              <Label>
                {form.pricingMode === "discount_percentage"
                  ? "Discount (%)"
                  : "$ Value"}
              </Label>
              <Input
                type="number"
                min={0}
                value={form.pricingValue}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pricingValue: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Optional internal notes"
            />
          </div>

          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              if (!form.bundledServiceLabel.trim()) {
                toast.error("Bundled item label is required");
                return;
              }
              if (form.pricingMode !== "included" && form.pricingValue <= 0) {
                toast.error("Enter a value greater than 0 for bundle pricing");
                return;
              }

              onSave({
                id: editing?.id ?? makeId("bundle"),
                name: form.name,
                triggerService: form.triggerService,
                bundledService: form.bundledService,
                bundledServiceLabel: form.bundledServiceLabel,
                triggerUnit: form.triggerUnit,
                minUnits: form.minUnits,
                maxUnits: form.maxUnits,
                requireSamePet: form.requireSamePet,
                requireSameRoom: form.requireSameRoom,
                bundleMode: form.bundleMode,
                pricingMode: form.pricingMode,
                pricingValue:
                  form.pricingMode === "included"
                    ? undefined
                    : form.pricingValue,
                notes: form.notes || undefined,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Peak Surcharge Modal ─────────────────────────────────────────────

function PeakSurchargeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PeakSurcharge | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: PeakSurcharge) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    dateMode: "specific" as "specific" | "repeat" | "holiday",
    startDate: "",
    endDate: "",
    holidayCountryCode: "US",
    holidayYearsAhead: 3,
    holidayNames: [] as string[],
    holidayDates: [] as string[],
    holidayExtensionDaysBefore: 0,
    holidayExtensionDaysAfter: 0,
    surchargeType: "percentage" as "percentage" | "flat",
    surchargePercent: 15,
    surchargeAmount: 0,
    scope: "per_each_pet" as "per_each_pet" | "first_pet_only",
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
    isActive: true,
  });

  const [holidayCatalog, setHolidayCatalog] = useState<HolidayCatalogItem[]>(
    [],
  );
  const [holidaySearch, setHolidaySearch] = useState("");
  const [holidaySyncLoading, setHolidaySyncLoading] = useState(false);
  const [holidaySyncError, setHolidaySyncError] = useState<string | null>(null);

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        dateMode: editing.dateMode ?? "specific",
        startDate: editing.startDate,
        endDate: editing.endDate,
        holidayCountryCode: editing.holidayCountryCode ?? "US",
        holidayYearsAhead: editing.holidayYearsAhead ?? 3,
        holidayNames: editing.holidayNames ?? [],
        holidayDates:
          editing.holidayDates ??
          editing.dateRanges?.map((range) => range.start) ??
          [],
        holidayExtensionDaysBefore: editing.holidayExtensionDaysBefore ?? 0,
        holidayExtensionDaysAfter: editing.holidayExtensionDaysAfter ?? 0,
        surchargeType: editing.surchargeType ?? "percentage",
        surchargePercent: editing.surchargePercent,
        surchargeAmount: editing.surchargeAmount ?? 0,
        scope: editing.scope ?? "per_each_pet",
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: "",
        dateMode: "specific",
        startDate: "",
        endDate: "",
        holidayCountryCode: "US",
        holidayYearsAhead: 3,
        holidayNames: [],
        holidayDates: [],
        holidayExtensionDaysBefore: 0,
        holidayExtensionDaysAfter: 0,
        surchargeType: "percentage",
        surchargePercent: 15,
        surchargeAmount: 0,
        scope: "per_each_pet",
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
        isActive: true,
      });
    }
  }

  useEffect(() => {
    if (!open || form.dateMode !== "holiday") return;

    let cancelled = false;

    const sync = async () => {
      setHolidaySyncLoading(true);
      setHolidaySyncError(null);
      try {
        const catalog = await fetchHolidayCatalog(
          form.holidayCountryCode,
          form.holidayYearsAhead,
        );
        if (cancelled) return;

        setHolidayCatalog(catalog);
        setForm((prev) => {
          const validNames = prev.holidayNames.filter((holidayName) =>
            catalog.some((holiday) => holiday.name === holidayName),
          );

          return {
            ...prev,
            holidayNames: validNames,
            holidayDates: buildHolidayDateList(
              validNames,
              catalog,
              prev.holidayExtensionDaysBefore,
              prev.holidayExtensionDaysAfter,
            ),
          };
        });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to sync holiday dates";
        setHolidaySyncError(message);
        setHolidayCatalog([]);
      } finally {
        if (!cancelled) setHolidaySyncLoading(false);
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [open, form.dateMode, form.holidayCountryCode, form.holidayYearsAhead]);

  const filteredHolidayCatalog = holidayCatalog.filter((holiday) =>
    holiday.name.toLowerCase().includes(holidaySearch.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Peak Surcharge" : "Add Peak Surcharge"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Surcharge Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Summer Peak"
            />
          </div>

          <div className="space-y-2">
            <Label>Date Source</Label>
            <Select
              value={form.dateMode}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  dateMode: value as "specific" | "repeat" | "holiday",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Specific date range</SelectItem>
                <SelectItem value="holiday">
                  Holiday auto-sync (changes yearly)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.dateMode !== "holiday" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-indigo-100">
                  <Globe2 className="size-4 text-indigo-700" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Dynamic Holidays
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={form.holidayCountryCode}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        holidayCountryCode: value,
                        holidayNames: [],
                        holidayDates: [],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Years to sync</Label>
                  <Select
                    value={String(form.holidayYearsAhead)}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        holidayYearsAhead: Number(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_SYNC_YEAR_OPTIONS.map((years) => (
                        <SelectItem key={years} value={String(years)}>
                          Next {years} year{years > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold">
                    Holiday window expansion
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          holidayExtensionDaysBefore: 0,
                          holidayExtensionDaysAfter: 3,
                          holidayDates: buildHolidayDateList(
                            prev.holidayNames,
                            holidayCatalog,
                            0,
                            3,
                          ),
                        }))
                      }
                    >
                      Thanksgiving weekend preset
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          holidayExtensionDaysBefore: 0,
                          holidayExtensionDaysAfter: 0,
                          holidayDates: buildHolidayDateList(
                            prev.holidayNames,
                            holidayCatalog,
                            0,
                            0,
                          ),
                        }))
                      }
                    >
                      No expansion
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Days before holiday</Label>
                    <Input
                      type="number"
                      min={0}
                      max={14}
                      value={form.holidayExtensionDaysBefore}
                      onChange={(e) => {
                        const value = Math.max(
                          0,
                          Math.min(14, Number(e.target.value) || 0),
                        );
                        setForm((prev) => ({
                          ...prev,
                          holidayExtensionDaysBefore: value,
                          holidayDates: buildHolidayDateList(
                            prev.holidayNames,
                            holidayCatalog,
                            value,
                            prev.holidayExtensionDaysAfter,
                          ),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Days after holiday</Label>
                    <Input
                      type="number"
                      min={0}
                      max={14}
                      value={form.holidayExtensionDaysAfter}
                      onChange={(e) => {
                        const value = Math.max(
                          0,
                          Math.min(14, Number(e.target.value) || 0),
                        );
                        setForm((prev) => ({
                          ...prev,
                          holidayExtensionDaysAfter: value,
                          holidayDates: buildHolidayDateList(
                            prev.holidayNames,
                            holidayCatalog,
                            prev.holidayExtensionDaysBefore,
                            value,
                          ),
                        }));
                      }}
                    />
                  </div>
                </div>

                <p className="text-muted-foreground text-[11px]">
                  Use this to include surrounding weekend days for moving
                  holidays without manually entering each year.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={holidaySearch}
                  onChange={(e) => setHolidaySearch(e.target.value)}
                  placeholder="Search holidays (e.g. Thanksgiving, Easter)"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  disabled={holidaySyncLoading}
                  onClick={async () => {
                    setHolidaySyncLoading(true);
                    setHolidaySyncError(null);

                    try {
                      const catalog = await fetchHolidayCatalog(
                        form.holidayCountryCode,
                        form.holidayYearsAhead,
                      );
                      setHolidayCatalog(catalog);
                      setForm((prev) => {
                        const validNames = prev.holidayNames.filter(
                          (holidayName) =>
                            catalog.some(
                              (holiday) => holiday.name === holidayName,
                            ),
                        );

                        return {
                          ...prev,
                          holidayNames: validNames,
                          holidayDates: buildHolidayDateList(
                            validNames,
                            catalog,
                            prev.holidayExtensionDaysBefore,
                            prev.holidayExtensionDaysAfter,
                          ),
                        };
                      });
                      toast.success("Holiday dates synced");
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Failed to sync holiday dates";
                      setHolidaySyncError(message);
                      toast.error(message);
                    } finally {
                      setHolidaySyncLoading(false);
                    }
                  }}
                >
                  {holidaySyncLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Sync
                </Button>
              </div>

              {holidaySyncError && (
                <p className="text-destructive text-xs">{holidaySyncError}</p>
              )}

              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
                {holidaySyncLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading holidays...
                  </div>
                ) : filteredHolidayCatalog.length === 0 ? (
                  <p className="text-muted-foreground px-1 py-2 text-xs">
                    {holidayCatalog.length === 0
                      ? "No holidays loaded yet"
                      : "No holidays match this search"}
                  </p>
                ) : (
                  filteredHolidayCatalog.map((holiday) => (
                    <label
                      key={holiday.name}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={form.holidayNames.includes(holiday.name)}
                        onCheckedChange={(checked) =>
                          setForm((prev) => {
                            const holidayNames =
                              checked === true
                                ? prev.holidayNames.includes(holiday.name)
                                  ? prev.holidayNames
                                  : [...prev.holidayNames, holiday.name]
                                : prev.holidayNames.filter(
                                    (name) => name !== holiday.name,
                                  );

                            return {
                              ...prev,
                              holidayNames,
                              holidayDates: buildHolidayDateList(
                                holidayNames,
                                holidayCatalog,
                                prev.holidayExtensionDaysBefore,
                                prev.holidayExtensionDaysAfter,
                              ),
                            };
                          })
                        }
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {holiday.name}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {holiday.dates.length} date
                          {holiday.dates.length !== 1 ? "s" : ""} in sync window
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {form.holidayDates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    Auto-generated fee dates ({form.holidayDates.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.holidayDates.slice(0, 8).map((date) => (
                      <Badge
                        key={date}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {date}
                      </Badge>
                    ))}
                    {form.holidayDates.length > 8 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{form.holidayDates.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Surcharge Type</Label>
              <Select
                value={form.surchargeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    surchargeType: v as "percentage" | "flat",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {form.surchargeType === "percentage"
                  ? "Percent (%)"
                  : "Amount ($)"}
              </Label>
              <Input
                type="number"
                min={0}
                value={
                  form.surchargeType === "percentage"
                    ? form.surchargePercent
                    : form.surchargeAmount
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setForm((p) =>
                    p.surchargeType === "percentage"
                      ? { ...p, surchargePercent: val }
                      : { ...p, surchargeAmount: val },
                  );
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={form.scope}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  scope: v as "per_each_pet" | "first_pet_only",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_each_pet">Per each pet</SelectItem>
                <SelectItem value="first_pet_only">First pet only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-1.5"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }

              if (form.dateMode === "holiday") {
                if (!form.holidayCountryCode) {
                  toast.error("Choose a country for holiday sync");
                  return;
                }
                if (form.holidayNames.length === 0) {
                  toast.error("Select at least one holiday");
                  return;
                }

                const holidayDates =
                  form.holidayDates.length > 0
                    ? [...form.holidayDates].sort()
                    : buildHolidayDateList(
                        form.holidayNames,
                        holidayCatalog,
                        form.holidayExtensionDaysBefore,
                        form.holidayExtensionDaysAfter,
                      );

                if (holidayDates.length === 0) {
                  toast.error("No holiday dates available. Please sync again.");
                  return;
                }

                onSave({
                  id: editing?.id ?? makeId("pds"),
                  name: form.name,
                  startDate: holidayDates[0],
                  endDate: holidayDates[holidayDates.length - 1],
                  surchargePercent: form.surchargePercent,
                  isActive: form.isActive,
                  dateMode: "holiday",
                  dateRanges: holidayDates.map((date) => ({
                    start: date,
                    end: date,
                  })),
                  holidayCountryCode: form.holidayCountryCode,
                  holidayNames: form.holidayNames,
                  holidayYearsAhead: form.holidayYearsAhead,
                  holidayDates,
                  holidayExtensionDaysBefore: form.holidayExtensionDaysBefore,
                  holidayExtensionDaysAfter: form.holidayExtensionDaysAfter,
                  surchargeType: form.surchargeType,
                  surchargeAmount:
                    form.surchargeType === "flat"
                      ? form.surchargeAmount
                      : undefined,
                  scope: form.scope,
                  applicableServices: normalizeApplicableServices(
                    form.applicableServices,
                  ),
                });

                return;
              }

              if (!form.startDate || !form.endDate) {
                toast.error("Start and end dates are required");
                return;
              }

              onSave({
                id: editing?.id ?? makeId("pds"),
                name: form.name,
                startDate: form.startDate,
                endDate: form.endDate,
                surchargePercent: form.surchargePercent,
                isActive: form.isActive,
                dateMode: "specific",
                surchargeType: form.surchargeType,
                surchargeAmount:
                  form.surchargeType === "flat"
                    ? form.surchargeAmount
                    : undefined,
                scope: form.scope,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Custom Fee Modal ─────────────────────────────────────────────────

function CustomFeeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  addOnOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CustomFee | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  addOnOptions: Array<{ id: string; name: string }>;
  onSave: (fee: CustomFee) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: 0,
    feeType: "flat" as "flat" | "percentage",
    adjustmentKind: "fee" as "fee" | "discount",
    taxRate: undefined as number | undefined,
    scope: "per_pet" as "per_booking" | "per_pet",
    autoApply: "none" as
      | "none"
      | "at_checkout"
      | "by_care_type"
      | "new_customer"
      | "new_pet"
      | "customer_segment"
      | "addon_purchase",
    autoApplyCareTypes: [] as string[],
    customerStatuses: [] as string[],
    membershipPlans: [] as string[],
    requireMembershipActive: false,
    requirePrepaidBalance: false,
    triggerAddOnIds: [] as string[],
    waivedAddOnIds: [] as string[],
    waivePercentage: 100,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["all"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        amount: editing.amount,
        feeType: editing.feeType,
        adjustmentKind: editing.adjustmentKind ?? "fee",
        taxRate: editing.taxRate,
        scope: editing.scope,
        autoApply: editing.autoApply,
        autoApplyCareTypes: editing.autoApplyCareTypes ?? [],
        customerStatuses: editing.customerStatuses ?? [],
        membershipPlans: editing.membershipPlans ?? [],
        requireMembershipActive: editing.requireMembershipActive ?? false,
        requirePrepaidBalance: editing.requirePrepaidBalance ?? false,
        triggerAddOnIds: editing.triggerAddOnIds ?? [],
        waivedAddOnIds: editing.waivedAddOnIds ?? [],
        waivePercentage: editing.waivePercentage ?? 100,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        description: "",
        amount: 0,
        feeType: "flat",
        adjustmentKind: "fee",
        taxRate: undefined,
        scope: "per_pet",
        autoApply: "none",
        autoApplyCareTypes: [],
        customerStatuses: [],
        membershipPlans: [],
        requireMembershipActive: false,
        requirePrepaidBalance: false,
        triggerAddOnIds: [],
        waivedAddOnIds: [],
        waivePercentage: 100,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["all"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Custom Fee" : "Add Custom Fee"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fee Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Medication Administration"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="When does this fee apply?"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.feeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    feeType: v as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat ($)</SelectItem>
                  <SelectItem value="percentage">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effect</Label>
              <Select
                value={form.adjustmentKind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentKind: value as "fee" | "discount",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fee">Add fee</SelectItem>
                  <SelectItem value="discount">Apply discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    scope: v as "per_booking" | "per_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="per_booking">Per booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.taxRate ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  taxRate: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="Uses facility default"
            />
          </div>
          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>When to apply automatically</Label>
            <div className="space-y-1.5">
              {(
                [
                  {
                    value: "none",
                    label: "Add manually at checkout",
                    desc: "Staff chooses when to add this fee",
                  },
                  {
                    value: "at_checkout",
                    label: "Always add at checkout",
                    desc: "Fee is automatically added every time",
                  },
                  {
                    value: "by_care_type",
                    label: "Add only for selected services",
                    desc: "Fee is added only when selected services are booked",
                  },
                  {
                    value: "new_customer",
                    label: "Add only for new customers",
                    desc: "Fee is added on the first booking for a customer",
                  },
                  {
                    value: "new_pet",
                    label: "Add for each new pet",
                    desc: "Fee is added for pets making their first booking",
                  },
                  {
                    value: "customer_segment",
                    label: "Apply for customer segments",
                    desc: "Trigger by customer status, membership plan, or prepaid balance",
                  },
                  {
                    value: "addon_purchase",
                    label: "Apply from add-on purchase",
                    desc: "Trigger when selected add-ons are in cart and optionally waive add-on fees",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, autoApply: opt.value }))
                  }
                  className={`w-full rounded-lg border p-2.5 text-left transition-all ${
                    form.autoApply === opt.value
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
            {form.autoApply === "by_care_type" && (
              <div className="space-y-1.5 rounded-lg border p-3">
                <Label className="text-xs">Select services</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map((service) => (
                    <label
                      key={service.value}
                      className="flex items-center gap-1.5"
                    >
                      <Checkbox
                        checked={form.autoApplyCareTypes.includes(
                          service.value,
                        )}
                        onCheckedChange={(checked) =>
                          setForm((p) => ({
                            ...p,
                            autoApplyCareTypes:
                              checked === true
                                ? p.autoApplyCareTypes.includes(service.value)
                                  ? p.autoApplyCareTypes
                                  : [...p.autoApplyCareTypes, service.value]
                                : p.autoApplyCareTypes.filter(
                                    (type) => type !== service.value,
                                  ),
                          }))
                        }
                      />
                      <span className="text-xs">{service.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {form.autoApply === "customer_segment" && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-xs">Customer segment filters</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Customer statuses (comma separated)
                    </Label>
                    <Input
                      value={form.customerStatuses.join(", ")}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customerStatuses: e.target.value
                            .split(",")
                            .map((value) => value.trim().toLowerCase())
                            .filter((value) => value.length > 0),
                        }))
                      }
                      placeholder="vip, military, active"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Membership plans (comma separated)
                    </Label>
                    <Input
                      value={form.membershipPlans.join(", ")}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: e.target.value
                            .split(",")
                            .map((value) => value.trim().toLowerCase())
                            .filter((value) => value.length > 0),
                        }))
                      }
                      placeholder="gold, vip, platinum"
                    />
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.requireMembershipActive}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          requireMembershipActive: checked === true,
                        }))
                      }
                    />
                    <span className="text-xs">Require active membership</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.requirePrepaidBalance}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          requirePrepaidBalance: checked === true,
                        }))
                      }
                    />
                    <span className="text-xs">
                      Require prepaid balance/package
                    </span>
                  </label>
                </div>
              </div>
            )}
            {form.autoApply === "addon_purchase" && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-xs">Add-on purchase trigger</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trigger add-ons</Label>
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                      {addOnOptions.map((addOn) => (
                        <label
                          key={addOn.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={form.triggerAddOnIds.includes(addOn.id)}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                triggerAddOnIds:
                                  checked === true
                                    ? prev.triggerAddOnIds.includes(addOn.id)
                                      ? prev.triggerAddOnIds
                                      : [...prev.triggerAddOnIds, addOn.id]
                                    : prev.triggerAddOnIds.filter(
                                        (value) => value !== addOn.id,
                                      ),
                              }))
                            }
                          />
                          <span className="text-xs">{addOn.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Waive these add-ons</Label>
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                      {addOnOptions.map((addOn) => (
                        <label
                          key={`${addOn.id}-waive`}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={form.waivedAddOnIds.includes(addOn.id)}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                waivedAddOnIds:
                                  checked === true
                                    ? prev.waivedAddOnIds.includes(addOn.id)
                                      ? prev.waivedAddOnIds
                                      : [...prev.waivedAddOnIds, addOn.id]
                                    : prev.waivedAddOnIds.filter(
                                        (value) => value !== addOn.id,
                                      ),
                              }))
                            }
                          />
                          <span className="text-xs">{addOn.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Waive percentage</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.waivePercentage}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        waivePercentage: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <p className="text-muted-foreground rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed">
            Rules can add fees or apply discounts. Add-on trigger rules can
            waive selected add-on charges automatically.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }

              if (
                form.autoApply === "customer_segment" &&
                form.customerStatuses.length === 0 &&
                form.membershipPlans.length === 0 &&
                !form.requireMembershipActive &&
                !form.requirePrepaidBalance
              ) {
                toast.error("Add at least one customer segment filter");
                return;
              }

              if (
                form.autoApply === "addon_purchase" &&
                form.triggerAddOnIds.length === 0
              ) {
                toast.error("Select at least one trigger add-on");
                return;
              }

              onSave({
                id: editing?.id ?? makeId("cf"),
                name: form.name,
                description: form.description || undefined,
                amount: form.amount,
                feeType: form.feeType,
                adjustmentKind: form.adjustmentKind,
                taxRate: form.taxRate,
                scope: form.scope,
                autoApply: form.autoApply,
                autoApplyCareTypes:
                  form.autoApply === "by_care_type"
                    ? form.autoApplyCareTypes
                    : undefined,
                customerStatuses:
                  form.autoApply === "customer_segment"
                    ? form.customerStatuses
                    : undefined,
                membershipPlans:
                  form.autoApply === "customer_segment"
                    ? form.membershipPlans
                    : undefined,
                requireMembershipActive:
                  form.autoApply === "customer_segment"
                    ? form.requireMembershipActive
                    : undefined,
                requirePrepaidBalance:
                  form.autoApply === "customer_segment"
                    ? form.requirePrepaidBalance
                    : undefined,
                triggerAddOnIds:
                  form.autoApply === "addon_purchase"
                    ? form.triggerAddOnIds
                    : undefined,
                waivedAddOnIds:
                  form.autoApply === "addon_purchase"
                    ? form.waivedAddOnIds
                    : undefined,
                waivePercentage:
                  form.autoApply === "addon_purchase"
                    ? form.waivePercentage
                    : undefined,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
