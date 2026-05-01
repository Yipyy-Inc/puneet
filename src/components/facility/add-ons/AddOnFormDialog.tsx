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
  Users,
  Info,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const PRICING_OPTIONS: {
  value: AddOnPricingType;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "flat",
    label: "Fixed Price",
    desc: "One flat charge regardless of duration or quantity",
    Icon: DollarSign,
  },
  {
    value: "per_item",
    label: "Per Item",
    desc: "Price multiplied by the quantity selected",
    Icon: Package,
  },
  {
    value: "per_day",
    label: "Per Day",
    desc: "Charged once for each day of the booking",
    Icon: CalendarClock,
  },
  {
    value: "per_session",
    label: "Per Session",
    desc: "Charged per session or occurrence",
    Icon: Repeat,
  },
  {
    value: "per_hour",
    label: "Per Hour",
    desc: "Charged based on duration in hours",
    Icon: Clock,
  },
  {
    value: "percentage_of_booking",
    label: "% of Booking",
    desc: "A percentage of the base service price",
    Icon: Percent,
  },
];

const SCHEDULING_OPTIONS: {
  value: AddOnSchedulingType;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "quantity",
    label: "Quantity Only",
    desc: "Client picks how many — no time slot needed",
    Icon: Hash,
  },
  {
    value: "time_slot",
    label: "Time Slot",
    desc: "A specific time slot must be booked by staff or customer",
    Icon: Clock,
  },
  {
    value: "per_stay_night",
    label: "Per Night",
    desc: "Auto-applied once per night of a boarding stay",
    Icon: Repeat,
  },
  {
    value: "grooming_linked",
    label: "Grooming-linked",
    desc: "Occurs alongside a grooming session in the same booking",
    Icon: Scissors,
  },
];

const SIZE_KEYS = ["small", "medium", "large", "giant"] as const;
type SizeKey = (typeof SIZE_KEYS)[number];
const SIZE_LABELS: Record<SizeKey, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  giant: "Giant",
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
          ? "border-primary bg-primary/6 ring-primary/20 shadow-sm ring-2"
          : "hover:border-slate-300 hover:bg-slate-50/50",
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
      SIZE_KEYS.map((s) => ({ size: s, priceModifier: 0, modifierType: "flat" })),
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
      scheduleConfig: { ...(p.scheduleConfig ?? { schedulableBy: "staff_only" }), [key]: val },
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
    form.schedulingType === "time_slot" || form.schedulingType === "grooming_linked";

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-linear-to-r from-slate-50 to-white px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editing && editing.id !== "" ? "Edit Add-On" : "Create Add-On"}
          </DialogTitle>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Configure pricing, scheduling, and eligibility for this add-on.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 px-6 py-5">

            {/* ── 1. Basic Info ── */}
            <Section title="Basic Information">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => f("name", e.target.value)}
                  placeholder="e.g. Welcome Treat, Daily Walk"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => f("description", e.target.value)}
                  placeholder="What does this add-on include? What will the pet experience?"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <Select
                    value={form.category ?? ""}
                    onValueChange={(v) => f("category", v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: c.colorCode ?? "#64748b" }}
                            />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Image URL</Label>
                  <Input
                    value={form.image ?? ""}
                    onChange={(e) => f("image", e.target.value)}
                    placeholder="https://..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <RateColorPicker
                value={form.colorCode ?? "#3b82f6"}
                onChange={(hex) => f("colorCode", hex)}
              />
            </Section>

            {/* ── 2. Pricing ── */}
            <Section
              title="Pricing"
              subtitle="How the price is calculated when this add-on is selected"
            >
              {/* Pricing type tiles */}
              <div className="grid grid-cols-3 gap-2">
                {PRICING_OPTIONS.map(({ value, label, desc, Icon }) => (
                  <OptionCard
                    key={value}
                    selected={form.pricingType === value}
                    onClick={() => f("pricingType", value)}
                    Icon={Icon}
                    label={label}
                    desc={desc}
                  />
                ))}
              </div>

              {/* Price input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    {isPercentage ? "Percentage (%)" : "Price ($)"}
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
                      onChange={(e) => f("price", parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-sm"
                    />
                  </div>
                  {isPercentage && (
                    <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <Info className="size-3" />
                      Applied to the base service price at booking time
                    </p>
                  )}
                </div>
                {(form.pricingType === "per_session" ||
                  form.pricingType === "per_hour" ||
                  form.pricingType === "per_item") && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Unit Label</Label>
                    <Input
                      value={form.unitLabel ?? ""}
                      onChange={(e) => f("unitLabel", e.target.value)}
                      placeholder={
                        form.pricingType === "per_hour"
                          ? "hr"
                          : form.pricingType === "per_item"
                            ? "item"
                            : "session"
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.duration ?? ""}
                    onChange={(e) =>
                      f("duration", e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="Optional"
                    className="h-9 text-sm"
                  />
                </div>
                {form.pricingType === "per_item" && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Max Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.maxQuantity ?? ""}
                      onChange={(e) =>
                        f("maxQuantity", e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      placeholder="No limit"
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Taxes */}
              <div className="space-y-2">
                <FieldRow
                  label="Taxes apply"
                  hint="Toggle whether this add-on is subject to tax"
                >
                  <Switch
                    checked={form.taxEnabled ?? true}
                    onCheckedChange={(v) => f("taxEnabled", v)}
                  />
                </FieldRow>
                {form.taxEnabled && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Tax Rate % override
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.taxRate ?? ""}
                      onChange={(e) =>
                        f("taxRate", e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      placeholder="Leave blank to use facility default"
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Size-based pricing */}
              <div className="space-y-2">
                <FieldRow
                  label="Size-based pricing"
                  hint="Add a price modifier for each pet size"
                >
                  <Switch checked={sizePricingOn} onCheckedChange={setSizePricingOn} />
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
                        <span className="text-muted-foreground w-14 text-xs font-medium capitalize">
                          {SIZE_LABELS[row.size]}
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
                                  ? { ...r, priceModifier: parseFloat(e.target.value) || 0 }
                                  : r,
                              ),
                            )
                          }
                          className="h-7 flex-1 text-xs"
                        />
                        <Select
                          value={row.modifierType}
                          onValueChange={(v) =>
                            setSizeRows((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? { ...r, modifierType: v as "flat" | "percentage" }
                                  : r,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">$ Add</SelectItem>
                            <SelectItem value="percentage">% Add</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* ── 3. Pet Scope ── */}
            <Section
              title="Pet Scope"
              subtitle="Is this add-on charged per booking or per pet?"
            >
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "per_booking" as AddOnPetScope,
                      label: "Per Booking",
                      desc: "Charged once regardless of how many pets are in the booking",
                      Icon: Package,
                    },
                    {
                      value: "per_pet" as AddOnPetScope,
                      label: "Per Pet",
                      desc: "Charged separately for each pet included in the booking",
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
              title="Scheduling"
              subtitle="How this add-on is booked and fulfilled"
            >
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULING_OPTIONS.map(({ value, label, desc, Icon }) => (
                  <OptionCard
                    key={value}
                    selected={form.schedulingType === value}
                    onClick={() => f("schedulingType", value)}
                    Icon={Icon}
                    label={label}
                    desc={desc}
                  />
                ))}
              </div>

              {/* Quantity cap for quantity-only mode */}
              {form.schedulingType === "quantity" && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Max Quantity per booking</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxQuantity ?? ""}
                    onChange={(e) =>
                      f("maxQuantity", e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="No limit"
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Extended scheduling options — only shown when time slot or grooming-linked */}
              {needsScheduling && (
                <div className="mt-1 space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-800">
                      Scheduling Options
                    </span>
                  </div>

                  {/* Who can schedule */}
                  <FieldRow
                    label="Who can schedule"
                    hint="Staff only, or allow customers to self-schedule"
                  >
                    <Select
                      value={form.scheduleConfig?.schedulableBy ?? "staff_only"}
                      onValueChange={(v) =>
                        sc("schedulableBy", v as "staff_only" | "customer_and_staff")
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff_only">Staff only</SelectItem>
                        <SelectItem value="customer_and_staff">Customer & staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  {/* Show staff on customer summary */}
                  <FieldRow
                    label="Show staff on summary"
                    hint="Display assigned staff member on the customer's booking summary"
                  >
                    <Switch
                      checked={form.scheduleConfig?.showStaffOnSummary ?? false}
                      onCheckedChange={(v) => sc("showStaffOnSummary", v)}
                    />
                  </FieldRow>

                  {/* Show on dashboard */}
                  <FieldRow
                    label="Show icon on dashboard"
                    hint="Display a scheduling badge on boarding/daycare dashboard cards"
                  >
                    <Switch
                      checked={form.scheduleConfig?.showOnDashboard ?? false}
                      onCheckedChange={(v) => sc("showOnDashboard", v)}
                    />
                  </FieldRow>

                  {/* Schedule category */}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Schedule category
                    </Label>
                    <Input
                      value={form.scheduleConfig?.scheduleCategory ?? ""}
                      onChange={(e) => sc("scheduleCategory", e.target.value)}
                      placeholder="e.g. Grooming, Activity, Communication"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Max per day */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">
                        Max bookings per day
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.scheduleConfig?.maxPerDay ?? ""}
                        onChange={(e) =>
                          sc(
                            "maxPerDay",
                            e.target.value ? parseInt(e.target.value) : undefined,
                          )
                        }
                        placeholder="Unlimited"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">
                        Buffer between bookings (min)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.scheduleConfig?.bufferMinutes ?? ""}
                        onChange={(e) =>
                          sc(
                            "bufferMinutes",
                            e.target.value ? parseInt(e.target.value) : undefined,
                          )
                        }
                        placeholder="0"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Slots per unit */}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Schedulable slots per quantity unit
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
                      className="h-8 text-xs"
                    />
                    <p className="text-muted-foreground text-[11px]">
                      How many slots this add-on consumes per quantity selected (e.g. a walk-pair = 2)
                    </p>
                  </div>
                </div>
              )}
            </Section>

            {/* ── 5. Staff ── */}
            <Section title="Staff Requirement">
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    val: false,
                    label: "No Assignment",
                    desc: "No staff assignment required",
                    Icon: UserX,
                  },
                  {
                    val: true,
                    label: "Staff Assigned",
                    desc: "A staff member must be assigned when this add-on is added",
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
            <Section title="Applicable Services" subtitle="Which services can include this add-on">
              <div className="mb-3 flex gap-2">
                {(
                  [
                    { key: "all" as const, label: "All Services" },
                    { key: "specific" as const, label: "Specific Services" },
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
                          ? "border-primary bg-primary/8 text-primary"
                          : "text-muted-foreground hover:border-slate-300",
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
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-slate-300 hover:bg-slate-50",
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
              title="Pet Eligibility"
              subtitle="Restrict this add-on to specific pet types, breeds, or sizes"
              collapsible
              defaultOpen={false}
            >
              <p className="text-muted-foreground -mt-1 text-xs">
                Leave all fields blank to allow this add-on for every pet.
              </p>
              <AddOnPetFilter
                value={form.petTypeFilter}
                onChange={(v) => f("petTypeFilter", v)}
              />
            </Section>

            {/* ── 8. Auto-Task ── */}
            <Section
              title="Auto-Task"
              subtitle="Automatically create a staff task when this add-on is booked"
              collapsible
              defaultOpen={false}
            >
              <FieldRow
                label="Generate staff task"
                hint="Creates a reminder task in the staff queue when this add-on is booked"
              >
                <Switch
                  checked={form.generatesTask}
                  onCheckedChange={(v) => f("generatesTask", v)}
                />
              </FieldRow>
              {form.generatesTask && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Task Category</Label>
                  <Input
                    value={form.taskCategory ?? ""}
                    onChange={(e) => f("taskCategory", e.target.value)}
                    placeholder="e.g. grooming, communication, exercise"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </Section>

            {/* ── 9. Status ── */}
            <Section title="Status">
              <FieldRow
                label="Active"
                hint="Inactive add-ons won't appear in the booking flow"
              >
                <div className="flex items-center justify-end gap-2">
                  <Badge
                    variant={form.isActive ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {form.isActive ? "Active" : "Inactive"}
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
            Cancel
          </Button>
          <Button disabled={!isValid} onClick={handleSave}>
            {editing && editing.id !== "" ? "Save Changes" : "Create Add-On"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
