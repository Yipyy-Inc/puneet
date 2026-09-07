"use client";

import { useState } from "react";
import type {
  ServiceAddOn,
  AddOnCategory,
  AddOnSchedulingType,
  AddOnPricingType,
  AddOnPetScope,
} from "@/types/facility";
import { cn } from "@/lib/utils";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddOnPetFilter } from "@/components/facility/add-ons/AddOnPetFilter";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import {
  Hash,
  Clock,
  Repeat,
  Scissors,
  UserCheck,
  UserX,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  Package,
  CalendarClock,
  Dog,
  Info,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

// A module-level table cannot know a locale, so it carries the KEY and the
// render site resolves it. The `value` is what travels — it is stored on the
// add-on and read back by the booking flow — so only the label moves.
const PRICING_OPTIONS: {
  value: AddOnPricingType;
  labelKey: string;
  descKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "flat",
    labelKey: "priceFlat",
    descKey: "priceFlatHelp",
    Icon: DollarSign,
  },
  {
    value: "per_item",
    labelKey: "pricePerItem",
    descKey: "pricePerItemHelp",
    Icon: Package,
  },
  {
    value: "per_day",
    labelKey: "pricePerDayLabel",
    descKey: "pricePerDayHelp",
    Icon: CalendarClock,
  },
  {
    value: "per_session",
    labelKey: "pricePerSession",
    descKey: "pricePerSessionHelp",
    Icon: Repeat,
  },
  {
    value: "per_hour",
    labelKey: "pricePerHour",
    descKey: "pricePerHourHelp",
    Icon: Clock,
  },
  {
    value: "percentage_of_booking",
    labelKey: "pricePercent",
    descKey: "pricePercentHelp",
    Icon: Percent,
  },
];

const SCHEDULING_OPTIONS: {
  value: AddOnSchedulingType;
  labelKey: string;
  descKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "quantity",
    labelKey: "schedQuantityLabel",
    descKey: "schedQuantityHelp",
    Icon: Hash,
  },
  {
    value: "time_slot",
    labelKey: "schedTimeSlotLabel",
    descKey: "schedTimeSlotHelp",
    Icon: Clock,
  },
  {
    value: "per_stay_night",
    labelKey: "schedPerNightLabel",
    descKey: "schedPerNightHelp",
    Icon: Repeat,
  },
  {
    value: "grooming_linked",
    labelKey: "schedGroomingLabel",
    descKey: "schedGroomingHelp",
    Icon: Scissors,
  },
];

const SIZE_KEYS = ["small", "medium", "large", "giant"] as const;
type SizeKey = (typeof SIZE_KEYS)[number];
const SIZE_LABEL_KEY: Record<SizeKey, string> = {
  small: "sizeSmall",
  medium: "sizeMedium",
  large: "sizeLarge",
  giant: "sizeGiant",
};

// ── Form state ─────────────────────────────────────────────────────────────────

export type AddOnFormValues = Omit<
  ServiceAddOn,
  "id" | "sortOrder" | "createdAt" | "updatedAt"
>;

function blank(): AddOnFormValues {
  return {
    name: "",
    description: "",
    image: "",
    category: "",
    colorCode: "#3b82f6",
    pricingType: "flat",
    price: 0,
    unitLabel: "",
    maxQuantity: undefined,
    duration: undefined,
    taxRate: undefined,
    taxable: true,
    taxEnabled: true,
    petScope: "per_booking",
    applicableServices: [],
    locationIds: [],
    requiresStaff: false,
    schedulingType: "quantity",
    requiresScheduling: false,
    scheduleConfig: undefined,
    generatesTask: true,
    taskCategory: "",
    isDefault: false,
    petTypeFilter: undefined,
    sizePricing: undefined,
    isActive: true,
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editing: ServiceAddOn | null;
  categories: AddOnCategory[];
  allServices: { id: string; name: string }[];
  onClose: () => void;
  onSave: (values: AddOnFormValues) => void;
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={cn(
          "bg-muted/30 flex w-full items-center justify-between border-b px-4 py-3 text-left",
          collapsible && "hover:bg-muted/50 cursor-pointer transition-colors",
        )}
      >
        <div>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {subtitle && (
            <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
          )}
        </div>
        {collapsible &&
          (open ? (
            <ChevronUp className="text-muted-foreground size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          ))}
      </button>
      {open && <div className="space-y-3 p-4">{children}</div>}
    </div>
  );
}

// ── Option card ────────────────────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  Icon,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary ring-primary bg-card shadow-sm ring-2"
          : "hover:border-foreground/15",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="text-xs font-semibold">{label}</span>
        {selected && <CheckCircle2 className="text-primary ml-auto size-3" />}
      </div>
      <span className="text-muted-foreground text-[10px] leading-tight">
        {desc}
      </span>
    </button>
  );
}

// ── Field row helper ───────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
      <div className="w-40 shrink-0">{children}</div>
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────────

export function AddOnFormDialog({
  open,
  editing,
  categories,
  allServices,
  onClose,
  onSave,
}: Props) {
  const t = useSettingsText().section("addons");
  const [form, setForm] = useState<AddOnFormValues>(() =>
    editing && editing.id !== ""
      ? {
          name: editing.name,
          description: editing.description,
          image: editing.image ?? "",
          category: editing.category ?? "",
          colorCode: editing.colorCode ?? "#3b82f6",
          pricingType: editing.pricingType,
          price: editing.price,
          unitLabel: editing.unitLabel ?? "",
          maxQuantity: editing.maxQuantity,
          duration: editing.duration,
          taxRate: editing.taxRate,
          taxable: editing.taxable ?? true,
          taxEnabled: editing.taxEnabled ?? true,
          petScope: editing.petScope ?? "per_booking",
          applicableServices: [...editing.applicableServices],
          locationIds: [...(editing.locationIds ?? [])],
          requiresStaff: editing.requiresStaff ?? false,
          schedulingType: editing.schedulingType ?? "quantity",
          requiresScheduling: editing.requiresScheduling,
          scheduleConfig: editing.scheduleConfig,
          generatesTask: editing.generatesTask,
          taskCategory: editing.taskCategory ?? "",
          isDefault: editing.isDefault ?? false,
          petTypeFilter: editing.petTypeFilter,
          sizePricing: editing.sizePricing,
          isActive: editing.isActive,
        }
      : blank(),
  );

  const [sizePricingOn, setSizePricingOn] = useState(
    !!(editing && editing.id !== "" && editing.sizePricing?.length),
  );
  const [sizeRows, setSizeRows] = useState<
    Array<{
      size: SizeKey;
      priceModifier: number;
      modifierType: "flat" | "percentage";
    }>
  >(
    editing?.sizePricing?.map((r) => ({ ...r, size: r.size as SizeKey })) ??
      SIZE_KEYS.map((s) => ({
        size: s,
        priceModifier: 0,
        modifierType: "flat",
      })),
  );

  function f<K extends keyof AddOnFormValues>(key: K, val: AddOnFormValues[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function sc<K extends keyof NonNullable<AddOnFormValues["scheduleConfig"]>>(
    key: K,
    val: NonNullable<AddOnFormValues["scheduleConfig"]>[K],
  ) {
    setForm((p) => ({
      ...p,
      scheduleConfig: {
        ...(p.scheduleConfig ?? { schedulableBy: "staff_only" }),
        [key]: val,
      },
    }));
  }

  function toggleService(id: string) {
    f(
      "applicableServices",
      form.applicableServices.includes(id)
        ? form.applicableServices.filter((s) => s !== id)
        : [...form.applicableServices, id],
    );
  }

  const needsScheduling =
    form.schedulingType === "time_slot" ||
    form.schedulingType === "grooming_linked";

  function handleSave() {
    onSave({
      ...form,
      image: form.image || undefined,
      category: form.category || undefined,
      sizePricing: sizePricingOn ? sizeRows : undefined,
      requiresScheduling: needsScheduling,
      scheduleConfig: needsScheduling ? form.scheduleConfig : undefined,
    } as AddOnFormValues);
  }

  const isValid = !!form.name.trim() && !!form.description.trim();
  const isPercentage = form.pricingType === "percentage_of_booking";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-linear-to-r from-slate-50 to-white px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editing && editing.id !== "" ? t("dialogEdit") : t("dialogCreate")}
          </DialogTitle>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t("dialogIntro")}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 px-6 py-5">
            {/* ── 1. Basic Info ── */}
            <Section title={t("secBasics")}>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  {t("fieldName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => f("name", e.target.value)}
                  placeholder={t("namePlaceholder")}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  {t("fieldDescription")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => f("description", e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {t("fieldCategory")}
                  </Label>
                  <Select
                    value={form.category ?? ""}
                    onValueChange={(v) => f("category", v)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={t("categoryPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: c.colorCode ?? "#64748b",
                              }}
                            />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {t("fieldImage")}
                  </Label>
                  <Input
                    value={form.image ?? ""}
                    onChange={(e) => f("image", e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
              </div>
              <RateColorPicker
                value={form.colorCode ?? "#3b82f6"}
                onChange={(hex) => f("colorCode", hex)}
              />
            </Section>

            {/* ── 2. Pricing ── */}
            <Section title={t("secPricing")} subtitle={t("secPricingHelp")}>
              {/* Pricing type tiles */}
              <div className="grid grid-cols-3 gap-2">
                {PRICING_OPTIONS.map(({ value, labelKey, descKey, Icon }) => (
                  <OptionCard
                    key={value}
                    selected={form.pricingType === value}
                    onClick={() => f("pricingType", value)}
                    Icon={Icon}
                    label={t(labelKey)}
                    desc={t(descKey)}
                  />
                ))}
              </div>

              {/* Price input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {isPercentage ? t("fieldPercentage") : t("fieldPrice")}
                  </Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      {isPercentage ? "%" : "$"}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={isPercentage ? 1 : 0.01}
                      max={isPercentage ? 100 : undefined}
                      value={form.price}
                      onChange={(e) =>
                        f("price", parseFloat(e.target.value) || 0)
                      }
                      className="pl-7 text-sm"
                    />
                  </div>
                  {isPercentage && (
                    <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <Info className="size-3" />
                      {t("percentHelp")}
                    </p>
                  )}
                </div>
                {(form.pricingType === "per_session" ||
                  form.pricingType === "per_hour" ||
                  form.pricingType === "per_item") && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {t("fieldUnitLabel")}
                    </Label>
                    <Input
                      value={form.unitLabel ?? ""}
                      onChange={(e) => f("unitLabel", e.target.value)}
                      placeholder={
                        form.pricingType === "per_hour"
                          ? t("unitHour")
                          : form.pricingType === "per_item"
                            ? t("unitItem")
                            : t("unitSession")
                      }
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {t("fieldDuration")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.duration ?? ""}
                    onChange={(e) =>
                      f(
                        "duration",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder={t("durationPlaceholder")}
                    className="text-sm"
                  />
                </div>
                {form.pricingType === "per_item" && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {t("fieldMaxQuantity")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.maxQuantity ?? ""}
                      onChange={(e) =>
                        f(
                          "maxQuantity",
                          e.target.value ? parseInt(e.target.value) : undefined,
                        )
                      }
                      placeholder={t("noLimit")}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Taxes */}
              <div className="space-y-2">
                <FieldRow
                  label={t("fieldTaxesApply")}
                  hint={t("fieldTaxesApplyHelp")}
                >
                  <Switch
                    checked={form.taxEnabled ?? true}
                    onCheckedChange={(v) => f("taxEnabled", v)}
                  />
                </FieldRow>
                {form.taxEnabled && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {t("fieldTaxRate")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.taxRate ?? ""}
                      onChange={(e) =>
                        f(
                          "taxRate",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                      placeholder={t("taxRatePlaceholder")}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Size-based pricing */}
              <div className="space-y-2">
                <FieldRow
                  label={t("fieldSizePricing")}
                  hint={t("fieldSizePricingHelp")}
                >
                  <Switch
                    checked={sizePricingOn}
                    onCheckedChange={setSizePricingOn}
                  />
                </FieldRow>
                {sizePricingOn && (
                  <div className="rounded-lg border">
                    {sizeRows.map((row, i) => (
                      <div
                        key={row.size}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2",
                          i > 0 && "border-t",
                        )}
                      >
                        <span className="text-muted-foreground min-w-14 text-xs font-medium">
                          {t(SIZE_LABEL_KEY[row.size])}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.priceModifier}
                          onChange={(e) =>
                            setSizeRows((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      priceModifier:
                                        parseFloat(e.target.value) || 0,
                                    }
                                  : r,
                              ),
                            )
                          }
                          className="min-h-7 flex-1 text-xs"
                        />
                        <Select
                          value={row.modifierType}
                          onValueChange={(v) =>
                            setSizeRows((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      modifierType: v as "flat" | "percentage",
                                    }
                                  : r,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="min-h-7 min-w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">
                              {t("modifierFlat")}
                            </SelectItem>
                            <SelectItem value="percentage">
                              {t("modifierPercent")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* ── 3. Pet Scope ── */}
            <Section title={t("secPetScope")} subtitle={t("secPetScopeHelp")}>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "per_booking" as AddOnPetScope,
                      label: t("scopePerBooking"),
                      desc: t("scopePerBookingHelp"),
                      Icon: Package,
                    },
                    {
                      value: "per_pet" as AddOnPetScope,
                      label: t("scopePerPet"),
                      desc: t("scopePerPetHelp"),
                      Icon: Dog,
                    },
                  ] as const
                ).map(({ value, label, desc, Icon }) => (
                  <OptionCard
                    key={value}
                    selected={(form.petScope ?? "per_booking") === value}
                    onClick={() => f("petScope", value)}
                    Icon={Icon}
                    label={label}
                    desc={desc}
                  />
                ))}
              </div>
            </Section>

            {/* ── 4. Scheduling ── */}
            <Section
              title={t("secScheduling")}
              subtitle={t("secSchedulingHelp")}
            >
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULING_OPTIONS.map(
                  ({ value, labelKey, descKey, Icon }) => (
                    <OptionCard
                      key={value}
                      selected={form.schedulingType === value}
                      onClick={() => f("schedulingType", value)}
                      Icon={Icon}
                      label={t(labelKey)}
                      desc={t(descKey)}
                    />
                  ),
                )}
              </div>

              {/* Quantity cap for quantity-only mode */}
              {form.schedulingType === "quantity" && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {t("fieldMaxPerBooking")}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxQuantity ?? ""}
                    onChange={(e) =>
                      f(
                        "maxQuantity",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder={t("noLimit")}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Extended scheduling options — only shown when time slot or
                  grooming-linked. A white panel with a hairline, not a blue wash:
                  §6 rule 2 leaves exactly two things tinted — a metric or filter
                  tile, and a status chip — and a group of fields is neither. */}
              {needsScheduling && (
                <div className="bg-card mt-1 space-y-3 rounded-xl border p-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CalendarClock className="text-muted-foreground size-3.5" />
                    <span className="text-xs font-semibold">
                      {t("schedulingOptions")}
                    </span>
                  </div>

                  {/* Who can schedule */}
                  <FieldRow
                    label={t("fieldSchedulableBy")}
                    hint={t("fieldSchedulableByHelp")}
                  >
                    <Select
                      value={form.scheduleConfig?.schedulableBy ?? "staff_only"}
                      onValueChange={(v) =>
                        sc(
                          "schedulableBy",
                          v as "staff_only" | "customer_and_staff",
                        )
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff_only">
                          {t("staffOnly")}
                        </SelectItem>
                        <SelectItem value="customer_and_staff">
                          {t("customerAndStaff")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  {/* Show staff on customer summary */}
                  <FieldRow
                    label={t("fieldShowStaff")}
                    hint={t("fieldShowStaffHelp")}
                  >
                    <Switch
                      checked={form.scheduleConfig?.showStaffOnSummary ?? false}
                      onCheckedChange={(v) => sc("showStaffOnSummary", v)}
                    />
                  </FieldRow>

                  {/* Show on dashboard */}
                  <FieldRow
                    label={t("fieldShowDashboard")}
                    hint={t("fieldShowDashboardHelp")}
                  >
                    <Switch
                      checked={form.scheduleConfig?.showOnDashboard ?? false}
                      onCheckedChange={(v) => sc("showOnDashboard", v)}
                    />
                  </FieldRow>

                  {/* Schedule category */}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {t("fieldScheduleCategory")}
                    </Label>
                    <Input
                      value={form.scheduleConfig?.scheduleCategory ?? ""}
                      onChange={(e) => sc("scheduleCategory", e.target.value)}
                      placeholder={t("scheduleCategoryPlaceholder")}
                      className="text-xs"
                    />
                  </div>

                  {/* Max per day */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {t("fieldMaxPerDay")}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.scheduleConfig?.maxPerDay ?? ""}
                        onChange={(e) =>
                          sc(
                            "maxPerDay",
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        placeholder={t("unlimited")}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {t("fieldBuffer")}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.scheduleConfig?.bufferMinutes ?? ""}
                        onChange={(e) =>
                          sc(
                            "bufferMinutes",
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        placeholder="0"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Slots per unit */}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      {t("fieldSlotsPerUnit")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.scheduleConfig?.slotsPerUnit ?? ""}
                      onChange={(e) =>
                        sc(
                          "slotsPerUnit",
                          e.target.value ? parseInt(e.target.value) : undefined,
                        )
                      }
                      placeholder="1"
                      className="text-xs"
                    />
                    <p className="text-muted-foreground text-[11px]">
                      {t("fieldSlotsPerUnitHelp")}
                    </p>
                  </div>
                </div>
              )}
            </Section>

            {/* ── 5. Staff ── */}
            <Section title={t("secStaff")}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    val: false,
                    label: t("staffNone"),
                    desc: t("staffNoneHelp"),
                    Icon: UserX,
                  },
                  {
                    val: true,
                    label: t("staffAssigned"),
                    desc: t("staffAssignedHelp"),
                    Icon: UserCheck,
                  },
                ].map(({ val, label, desc, Icon }) => (
                  <OptionCard
                    key={String(val)}
                    selected={form.requiresStaff === val}
                    onClick={() => f("requiresStaff", val)}
                    Icon={Icon}
                    label={label}
                    desc={desc}
                  />
                ))}
              </div>
            </Section>

            {/* ── 6. Applicable Services ── */}
            <Section title={t("secServices")} subtitle={t("secServicesHelp")}>
              <div className="mb-3 flex gap-2">
                {(
                  [
                    { key: "all" as const, label: t("scopeAllServices") },
                    {
                      key: "specific" as const,
                      label: t("scopeSpecificServices"),
                    },
                  ] as const
                ).map(({ key, label }) => {
                  const isAll = form.applicableServices.length === 0;
                  const active = key === "all" ? isAll : !isAll;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key === "all") f("applicableServices", []);
                      }}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-xs font-medium transition-all",
                        active
                          ? "border-primary ring-primary text-primary ring-2"
                          : "text-muted-foreground hover:border-foreground/15",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {allServices.map((svc) => {
                  const selected = form.applicableServices.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        selected
                          ? "border-primary ring-primary text-primary ring-2"
                          : "hover:border-foreground/15",
                      )}
                    >
                      {selected && <CheckCircle2 className="size-3" />}
                      {svc.name}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ── 7. Pet Eligibility ── */}
            <Section
              title={t("secEligibility")}
              subtitle={t("secEligibilityHelp")}
              collapsible
              defaultOpen={false}
            >
              <p className="text-muted-foreground -mt-1 text-xs">
                {t("eligibilityBlank")}
              </p>
              <AddOnPetFilter
                value={form.petTypeFilter}
                onChange={(v) => f("petTypeFilter", v)}
              />
            </Section>

            {/* ── 8. Auto-Task ── */}
            <Section
              title={t("secAutoTask")}
              subtitle={t("secAutoTaskHelp")}
              collapsible
              defaultOpen={false}
            >
              <FieldRow
                label={t("fieldGenerateTask")}
                hint={t("fieldGenerateTaskHelp")}
              >
                <Switch
                  checked={form.generatesTask}
                  onCheckedChange={(v) => f("generatesTask", v)}
                />
              </FieldRow>
              {form.generatesTask && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {t("fieldTaskCategory")}
                  </Label>
                  <Input
                    value={form.taskCategory ?? ""}
                    onChange={(e) => f("taskCategory", e.target.value)}
                    placeholder={t("taskCategoryPlaceholder")}
                    className="text-sm"
                  />
                </div>
              )}
            </Section>

            {/* ── 9. Status ── */}
            <Section title={t("secStatus")}>
              <FieldRow label={t("fieldActive")} hint={t("fieldActiveHelp")}>
                <div className="flex items-center justify-end gap-2">
                  <Badge
                    variant={form.isActive ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {form.isActive ? t("statusActive") : t("statusInactive")}
                  </Badge>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => f("isActive", v)}
                  />
                </div>
              </FieldRow>
            </Section>
          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="bg-slate-50/60 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!isValid} onClick={handleSave}>
            {editing && editing.id !== "" ? t("saveChanges") : t("createAddOn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
