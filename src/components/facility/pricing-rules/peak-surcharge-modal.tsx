"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Globe2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type {
  PeakDateRange,
  PeakRepeatPattern,
  PeakSurcharge,
} from "@/types/boarding";
import { PeakDateRanges } from "@/components/facility/pricing-rules/peak-date-ranges";
import { PeakRepeatFields } from "@/components/facility/pricing-rules/peak-repeat-fields";
import {
  makeId,
  HOLIDAY_SYNC_YEAR_OPTIONS,
  normalizeApplicableServices,
  buildHolidayDateList,
  fetchHolidayCatalog,
} from "@/components/facility/pricing-rules/shared";
import type {
  ServiceOption,
  HolidayCatalogItem,
} from "@/components/facility/pricing-rules/shared";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";

// ── Peak Surcharge Modal ─────────────────────────────────────────────

/** A pattern that matches nothing until the facility fills it in. */
const EMPTY_REPEAT_PATTERN: PeakRepeatPattern = {
  daysOfWeek: [],
  everyXWeeks: 1,
  windowStart: "",
  windowEnd: "",
};

export function PeakSurchargeModal({
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
  const { t, plural, countries } = usePricingLabels();
  const [form, setForm] = useState({
    name: "",
    dateMode: "specific" as "specific" | "repeat" | "holiday",
    startDate: "",
    endDate: "",
    dateRanges: [{ start: "", end: "" }] as PeakDateRange[],
    repeatPattern: EMPTY_REPEAT_PATTERN,
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
    chargePerLodging: false,
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
        // A rule saved before the editor could hold several spans has only
        // `startDate`/`endDate`; show that as the one range it is.
        dateRanges:
          editing.dateMode !== "holiday" && editing.dateRanges?.length
            ? editing.dateRanges
            : [{ start: editing.startDate, end: editing.endDate }],
        repeatPattern: editing.repeatPattern ?? EMPTY_REPEAT_PATTERN,
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
        chargePerLodging: editing.chargePerLodging === true,
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
        dateRanges: [{ start: "", end: "" }],
        repeatPattern: EMPTY_REPEAT_PATTERN,
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
        chargePerLodging: false,
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
          error instanceof Error ? error.message : t("psSyncFailed");
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
  }, [open, form.dateMode, form.holidayCountryCode, form.holidayYearsAhead, t]);

  const filteredHolidayCatalog = holidayCatalog.filter((holiday) =>
    holiday.name.toLowerCase().includes(holidaySearch.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("psEdit") : t("psAdd")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("psName")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("psNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("psDateSource")}</Label>
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
                <SelectItem value="specific">{t("psSpecificRange")}</SelectItem>
                <SelectItem value="repeat">{t("psRepeatDates")}</SelectItem>
                <SelectItem value="holiday">{t("psHolidaySync")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.dateMode === "specific" ? (
            <PeakDateRanges
              value={form.dateRanges}
              onChange={(dateRanges) => setForm((p) => ({ ...p, dateRanges }))}
            />
          ) : form.dateMode === "repeat" ? (
            <PeakRepeatFields
              value={form.repeatPattern}
              onChange={(repeatPattern) =>
                setForm((p) => ({ ...p, repeatPattern }))
              }
            />
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-2">
                {/* A solid disc with a white glyph, not a wash behind a
                    tinted icon — §6 rule 2. */}
                <div className="bg-violet text-violet-foreground flex size-7 items-center justify-center rounded-md">
                  <Globe2 className="size-4" />
                </div>
                <p className="text-sm font-semibold">
                  {t("psDynamicHolidays")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("psCountry")}</Label>
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
                      {countries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("psYearsToSync")}</Label>
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
                          {plural(years, "psNextYearsOne", "psNextYearsOther")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold">
                    {t("psWindowExpansion")}
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
                      {t("psWeekendPreset")}
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
                      {t("psNoExpansion")}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("psDaysBefore")}</Label>
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
                    <Label className="text-xs">{t("psDaysAfter")}</Label>
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
                  {t("psExpansionHelp")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={holidaySearch}
                  onChange={(e) => setHolidaySearch(e.target.value)}
                  placeholder={t("psSearchHolidays")}
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
                      toast.success(t("psSynced"));
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : t("psSyncFailed");
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
                  {t("psSync")}
                </Button>
              </div>

              {holidaySyncError && (
                <p className="text-destructive text-xs">{holidaySyncError}</p>
              )}

              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
                {holidaySyncLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 px-1 py-2 text-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("psSyncing")}
                  </div>
                ) : filteredHolidayCatalog.length === 0 ? (
                  <p className="text-muted-foreground px-1 py-2 text-xs">
                    {holidayCatalog.length === 0
                      ? t("psNoneLoaded")
                      : t("psNoneMatch")}
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
                          {plural(
                            holiday.dates.length,
                            "psDatesInWindowOne",
                            "psDatesInWindowOther",
                          )}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {form.holidayDates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    {t("psGeneratedDates").replace(
                      "{n}",
                      String(form.holidayDates.length),
                    )}
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
                        {t("psAndMore").replace(
                          "{n}",
                          String(form.holidayDates.length - 8),
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("psSurchargeType")}</Label>
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
                  <SelectItem value="percentage">{t("percent")}</SelectItem>
                  <SelectItem value="flat">{t("flat")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("amount")}</Label>
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
            <Label>{t("scope")}</Label>
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
                <SelectItem value="per_each_pet">
                  {t("psPerEachPet")}
                </SelectItem>
                <SelectItem value="first_pet_only">
                  {t("psFirstPetOnly")}
                </SelectItem>
              </SelectContent>
            </Select>
            {/* Only under "the first pet only", because that is the only
                place it means anything: it widens "the first pet" from one
                per booking to one per lodging. Under "each pet" every pet is
                already paying. */}
            {form.scope === "first_pet_only" ? (
              <label className="flex items-start gap-2 pt-1">
                <Checkbox
                  checked={form.chargePerLodging}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({
                      ...p,
                      chargePerLodging: checked === true,
                    }))
                  }
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">
                    {t("psChargePerLodging")}
                  </span>
                  <span className="text-meta text-ink-tertiary block">
                    {t("psChargePerLodgingHelp")}
                  </span>
                </span>
              </label>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>{t("whereApplies")}</Label>
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
                <span className="text-sm font-medium">{t("allServices")}</span>
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
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error(t("nameRequired"));
                return;
              }

              if (form.dateMode === "holiday") {
                if (!form.holidayCountryCode) {
                  toast.error(t("psCountryRequired"));
                  return;
                }
                if (form.holidayNames.length === 0) {
                  toast.error(t("psHolidayRequired"));
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
                  toast.error(t("psNoDates"));
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
                  chargePerLodging: form.chargePerLodging,
                  applicableServices: normalizeApplicableServices(
                    form.applicableServices,
                  ),
                });

                return;
              }

              if (form.dateMode === "repeat") {
                const pattern = form.repeatPattern;
                if (pattern.daysOfWeek.length === 0) {
                  toast.error(t("psDaysRequired"));
                  return;
                }
                if (!pattern.windowStart || !pattern.windowEnd) {
                  toast.error(t("psDatesRequired"));
                  return;
                }

                onSave({
                  id: editing?.id ?? makeId("pds"),
                  name: form.name,
                  // The span still has to be written: everything that reads a
                  // rule without knowing about patterns — the list row, the
                  // QuickBooks catalogue — reads these two.
                  startDate: pattern.windowStart,
                  endDate: pattern.windowEnd,
                  surchargePercent: form.surchargePercent,
                  isActive: form.isActive,
                  dateMode: "repeat",
                  repeatPattern: pattern,
                  surchargeType: form.surchargeType,
                  surchargeAmount:
                    form.surchargeType === "flat"
                      ? form.surchargeAmount
                      : undefined,
                  scope: form.scope,
                  chargePerLodging: form.chargePerLodging,
                  applicableServices: normalizeApplicableServices(
                    form.applicableServices,
                  ),
                });

                return;
              }

              const dateRanges = form.dateRanges.filter(
                (range) => range.start && range.end,
              );
              if (dateRanges.length === 0) {
                toast.error(t("psDatesRequired"));
                return;
              }

              // `startDate`/`endDate` bracket every span, so a reader that
              // knows nothing about `dateRanges` still sees the whole season
              // rather than only its first week.
              const starts = dateRanges.map((range) => range.start).sort();
              const ends = dateRanges.map((range) => range.end).sort();

              onSave({
                id: editing?.id ?? makeId("pds"),
                name: form.name,
                startDate: starts[0],
                endDate: ends[ends.length - 1],
                surchargePercent: form.surchargePercent,
                isActive: form.isActive,
                dateMode: "specific",
                dateRanges,
                surchargeType: form.surchargeType,
                surchargeAmount:
                  form.surchargeType === "flat"
                    ? form.surchargeAmount
                    : undefined,
                scope: form.scope,
                chargePerLodging: form.chargePerLodging,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
              });
            }}
          >
            {editing ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
