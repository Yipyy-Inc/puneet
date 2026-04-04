"use client";

import { useState } from "react";
import type { ServiceAddOn, AddOnPricingType } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";
import { useCustomServices } from "@/hooks/use-custom-services";
import { getAllServiceCategories } from "@/lib/service-registry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Package,
  Calendar,
  ListChecks,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "settings-service-addons";

const PRICING_TYPE_LABELS: Record<AddOnPricingType, string> = {
  flat: "Flat",
  per_day: "Per Day",
  per_session: "Per Session",
  per_hour: "Per Hour",
};

const PRICING_TYPE_PRICE_LABELS: Record<AddOnPricingType, string> = {
  flat: "Price ($)",
  per_day: "Price per Day ($)",
  per_session: "Price per Session ($)",
  per_hour: "Price per Hour ($)",
};

const SIZE_LABELS = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  giant: "Giant",
} as const;

type SizeKey = keyof typeof SIZE_LABELS;

// ============================================================================
// Storage helpers
// ============================================================================

function loadAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as ServiceAddOn[];
  } catch {
    // ignore
  }
  return defaultServiceAddOns;
}

function persistAddOns(addOns: ServiceAddOn[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addOns));
}

// ============================================================================
// Empty form state
// ============================================================================

function createEmptyAddOn(): Omit<
  ServiceAddOn,
  "id" | "createdAt" | "updatedAt" | "sortOrder"
> {
  return {
    name: "",
    description: "",
    image: "",
    category: "",
    colorCode: "",
    pricingType: "flat",
    price: 0,
    unitLabel: "",
    maxQuantity: undefined,
    duration: undefined,
    taxRate: undefined,
    applicableServices: [],
    requiresStaff: false,
    requiresScheduling: false,
    generatesTask: false,
    taskCategory: "",
    isDefault: false,
    petTypeFilter: undefined,
    sizePricing: undefined,
    isActive: true,
  };
}

// ============================================================================
// Price display helper
// ============================================================================

function formatPriceLabel(addon: ServiceAddOn): string {
  switch (addon.pricingType) {
    case "flat":
      return `$${addon.price}`;
    case "per_day":
      return `$${addon.price}/day`;
    case "per_session":
      return `$${addon.price}/${addon.unitLabel || "session"}`;
    case "per_hour":
      return `$${addon.price}/${addon.unitLabel || "hr"}`;
  }
}

// ============================================================================
// Component
// ============================================================================

export function AddOnsSettings() {
  const { modules } = useCustomServices();
  const allCategories = getAllServiceCategories(SERVICE_CATEGORIES, modules);

  const [addOns, setAddOns] = useState<ServiceAddOn[]>(loadAddOns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyAddOn());
  const [sizePricingEnabled, setSizePricingEnabled] = useState(false);
  const [sizePricingRows, setSizePricingRows] = useState<
    Array<{
      size: SizeKey;
      priceModifier: number;
      modifierType: "flat" | "percentage";
    }>
  >([
    { size: "small", priceModifier: 0, modifierType: "flat" },
    { size: "medium", priceModifier: 0, modifierType: "flat" },
    { size: "large", priceModifier: 0, modifierType: "flat" },
    { size: "giant", priceModifier: 0, modifierType: "flat" },
  ]);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function updateAndPersist(next: ServiceAddOn[]) {
    setAddOns(next);
    persistAddOns(next);
  }

  function openCreate() {
    setEditingId(null);
    setForm(createEmptyAddOn());
    setSizePricingEnabled(false);
    setSizePricingRows([
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 0, modifierType: "flat" },
      { size: "large", priceModifier: 0, modifierType: "flat" },
      { size: "giant", priceModifier: 0, modifierType: "flat" },
    ]);
    setDialogOpen(true);
  }

  function openEdit(addon: ServiceAddOn) {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      description: addon.description,
      image: addon.image || "",
      category: addon.category || "",
      colorCode: addon.colorCode || "",
      pricingType: addon.pricingType,
      price: addon.price,
      unitLabel: addon.unitLabel || "",
      maxQuantity: addon.maxQuantity,
      duration: addon.duration,
      taxRate: addon.taxRate,
      applicableServices: [...addon.applicableServices],
      requiresStaff: addon.requiresStaff ?? false,
      requiresScheduling: addon.requiresScheduling,
      generatesTask: addon.generatesTask,
      taskCategory: addon.taskCategory || "",
      isDefault: addon.isDefault ?? false,
      petTypeFilter: addon.petTypeFilter,
      sizePricing: addon.sizePricing,
      isActive: addon.isActive,
    });
    const hasSizePricing = !!addon.sizePricing && addon.sizePricing.length > 0;
    setSizePricingEnabled(hasSizePricing);
    if (hasSizePricing && addon.sizePricing) {
      setSizePricingRows(addon.sizePricing.map((sp) => ({ ...sp })));
    } else {
      setSizePricingRows([
        { size: "small", priceModifier: 0, modifierType: "flat" },
        { size: "medium", priceModifier: 0, modifierType: "flat" },
        { size: "large", priceModifier: 0, modifierType: "flat" },
        { size: "giant", priceModifier: 0, modifierType: "flat" },
      ]);
    }
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }

    const now = new Date().toISOString();

    const sharedFields = {
      ...form,
      image: form.image || undefined,
      category: form.category || undefined,
      colorCode: form.colorCode || undefined,
      unitLabel: form.unitLabel || undefined,
      duration: form.duration || undefined,
      taxRate: form.taxRate || undefined,
      taskCategory: form.generatesTask
        ? form.taskCategory || undefined
        : undefined,
      sizePricing: sizePricingEnabled ? sizePricingRows : undefined,
      petTypeFilter:
        form.petTypeFilter &&
        (form.petTypeFilter.types?.length ||
          form.petTypeFilter.breeds?.length ||
          form.petTypeFilter.weightMin ||
          form.petTypeFilter.weightMax ||
          form.petTypeFilter.coatTypes?.length)
          ? form.petTypeFilter
          : undefined,
    };

    if (editingId) {
      const next = addOns.map((a) =>
        a.id === editingId ? { ...a, ...sharedFields, updatedAt: now } : a,
      );
      updateAndPersist(next);
      toast.success(`"${form.name}" updated`);
    } else {
      const newAddOn: ServiceAddOn = {
        id: `addon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...sharedFields,
        taskCategory: form.generatesTask
          ? form.taskCategory || undefined
          : undefined,
        sizePricing: sizePricingEnabled ? sizePricingRows : undefined,
        sortOrder: addOns.length + 1,
        createdAt: now,
        updatedAt: now,
      };
      updateAndPersist([...addOns, newAddOn]);
      toast.success(`"${form.name}" created`);
    }

    setDialogOpen(false);
  }

  function handleDelete(addon: ServiceAddOn) {
    const next = addOns.filter((a) => a.id !== addon.id);
    updateAndPersist(next);
    toast.success(`"${addon.name}" deleted`);
  }

  function handleToggleActive(addon: ServiceAddOn) {
    const next = addOns.map((a) =>
      a.id === addon.id
        ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() }
        : a,
    );
    updateAndPersist(next);
    toast.success(
      `"${addon.name}" ${addon.isActive ? "deactivated" : "activated"}`,
    );
  }

  function toggleService(serviceId: string) {
    setForm((prev) => {
      const services = prev.applicableServices.includes(serviceId)
        ? prev.applicableServices.filter((s) => s !== serviceId)
        : [...prev.applicableServices, serviceId];
      return { ...prev, applicableServices: services };
    });
  }

  // --------------------------------------------------
  // Sorted list
  // --------------------------------------------------

  const sortedAddOns = [...addOns].sort((a, b) => a.sortOrder - b.sortOrder);

  // Group by category for list display
  const existingCategories = [
    ...new Set(addOns.map((a) => a.category).filter(Boolean)),
  ] as string[];
  const grouped = sortedAddOns.reduce<Record<string, ServiceAddOn[]>>(
    (acc, addon) => {
      const cat = addon.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(addon);
      return acc;
    },
    {},
  );
  const categoryOrder = [
    ...existingCategories,
    ...(grouped["Uncategorized"] ? ["Uncategorized"] : []),
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Service Add-Ons</h2>
          <p className="text-muted-foreground text-sm">
            Configure optional add-on services that customers can select when
            booking daycare, boarding, and other services.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Create Add-On
        </Button>
      </div>

      {/* Add-on cards list grouped by category */}
      <div className="space-y-6">
        {categoryOrder.map((cat) => (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">{cat}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {grouped[cat]?.length ?? 0}
              </Badge>
            </div>
            {(grouped[cat] ?? []).map((addon) => (
              <div
                key={addon.id}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                  !addon.isActive && "opacity-60",
                )}
              >
                {/* Thumbnail */}
                <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                  {addon.image ? (
                    <img
                      src={addon.image}
                      alt={addon.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package className="text-muted-foreground size-5" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {addon.colorCode && (
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: addon.colorCode }}
                      />
                    )}
                    <span className="truncate font-medium">{addon.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {PRICING_TYPE_LABELS[addon.pricingType]}
                    </Badge>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {formatPriceLabel(addon)}
                    </Badge>
                    {addon.requiresScheduling && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground shrink-0 gap-1 text-[10px]"
                      >
                        <Calendar className="size-3" />
                        Scheduling
                      </Badge>
                    )}
                    {addon.generatesTask && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground shrink-0 gap-1 text-[10px]"
                      >
                        <ListChecks className="size-3" />
                        Auto-Task
                      </Badge>
                    )}
                    {addon.isDefault && (
                      <Badge className="shrink-0 bg-blue-100 text-[10px] text-blue-700">
                        Default
                      </Badge>
                    )}
                    {addon.duration && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {addon.duration}min
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                    {addon.description}
                  </p>
                  <p className="text-muted-foreground/70 mt-1 text-xs">
                    {addon.applicableServices
                      .map(
                        (s) =>
                          allCategories.find((c) => c.id === s)?.name ||
                          s.charAt(0).toUpperCase() + s.slice(1),
                      )
                      .join(", ")}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex shrink-0 items-center gap-3">
                  <Switch
                    checked={addon.isActive}
                    onCheckedChange={() => handleToggleActive(addon)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-8 p-0">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(addon)}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(addon)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ))}

        {sortedAddOns.length === 0 && (
          <div className="bg-muted/30 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
            <Package className="text-muted-foreground/40 size-10" />
            <p className="text-muted-foreground mt-3 text-sm">
              No add-ons configured yet. Create your first add-on to get
              started.
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Add-On" : "Create Add-On"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-5 py-1">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="addon-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="addon-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Extended Walk"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="addon-desc">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="addon-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe this add-on..."
                  rows={3}
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="addon-image">Image URL (optional)</Label>
                <Input
                  id="addon-image"
                  value={form.image || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, image: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>

              {/* Category + Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={form.category || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder="e.g. Grooming & Hygiene"
                    list="addon-categories"
                  />
                  <datalist id="addon-categories">
                    {existingCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label>Color Code</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.colorCode || "#6366f1"}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          colorCode: e.target.value,
                        }))
                      }
                      className="size-9 cursor-pointer rounded-lg border p-0.5"
                    />
                    <Input
                      value={form.colorCode || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          colorCode: e.target.value,
                        }))
                      }
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Duration + Tax */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.duration ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        duration: e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      }))
                    }
                    placeholder="e.g. 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate % (override)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.taxRate ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        taxRate: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="Uses facility default"
                  />
                </div>
              </div>

              {/* Requires Staff + Default */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Requires Staff</p>
                    <p className="text-muted-foreground text-xs">
                      Staff member must be assigned when this add-on is booked
                    </p>
                  </div>
                  <Switch
                    checked={form.requiresStaff ?? false}
                    onCheckedChange={(c) =>
                      setForm((prev) => ({ ...prev, requiresStaff: c }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Default Add-On
                    </p>
                    <p className="text-xs text-blue-600">
                      Auto-applied to new bookings for applicable services
                    </p>
                  </div>
                  <Switch
                    checked={form.isDefault ?? false}
                    onCheckedChange={(c) =>
                      setForm((prev) => ({ ...prev, isDefault: c }))
                    }
                  />
                </div>
              </div>

              {/* Pet Eligibility */}
              <div className="space-y-2">
                <Label>Pet Eligibility (optional)</Label>
                <p className="text-muted-foreground text-xs">
                  Restrict this add-on to specific pet types or sizes. Leave
                  blank to allow all pets.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Pet Types</Label>
                    <Input
                      value={form.petTypeFilter?.types?.join(", ") ?? ""}
                      onChange={(e) => {
                        const types = e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        setForm((prev) => ({
                          ...prev,
                          petTypeFilter: {
                            ...prev.petTypeFilter,
                            types: types.length > 0 ? types : undefined,
                          },
                        }));
                      }}
                      placeholder="e.g. Dog, Cat"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Coat Types</Label>
                    <Input
                      value={form.petTypeFilter?.coatTypes?.join(", ") ?? ""}
                      onChange={(e) => {
                        const coats = e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        setForm((prev) => ({
                          ...prev,
                          petTypeFilter: {
                            ...prev.petTypeFilter,
                            coatTypes: coats.length > 0 ? coats : undefined,
                          },
                        }));
                      }}
                      placeholder="e.g. long, wire"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min Weight (lbs)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.petTypeFilter?.weightMin ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          petTypeFilter: {
                            ...prev.petTypeFilter,
                            weightMin: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          },
                        }))
                      }
                      placeholder="Any"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Weight (lbs)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.petTypeFilter?.weightMax ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          petTypeFilter: {
                            ...prev.petTypeFilter,
                            weightMax: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          },
                        }))
                      }
                      placeholder="Any"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Type */}
              <div className="space-y-2">
                <Label>Pricing Type</Label>
                <Select
                  value={form.pricingType}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      pricingType: v as AddOnPricingType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(PRICING_TYPE_LABELS) as [
                        AddOnPricingType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="addon-price">
                  {PRICING_TYPE_PRICE_LABELS[form.pricingType]}
                </Label>
                <Input
                  id="addon-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              {/* Unit Label - only for per_session / per_hour */}
              {(form.pricingType === "per_session" ||
                form.pricingType === "per_hour") && (
                <div className="space-y-2">
                  <Label htmlFor="addon-unit">Unit Label</Label>
                  <Input
                    id="addon-unit"
                    value={form.unitLabel || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        unitLabel: e.target.value,
                      }))
                    }
                    placeholder={
                      form.pricingType === "per_session"
                        ? 'e.g. "walk", "session"'
                        : 'e.g. "hr", "hour"'
                    }
                  />
                </div>
              )}

              {/* Max Quantity - only for non-flat */}
              {form.pricingType !== "flat" && (
                <div className="space-y-2">
                  <Label htmlFor="addon-max">Max Quantity</Label>
                  <Input
                    id="addon-max"
                    type="number"
                    min={1}
                    value={form.maxQuantity ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxQuantity: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              )}

              {/* Applicable Services */}
              <div className="space-y-2">
                <Label>Applicable Services</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allCategories.map((cat) => (
                    <label
                      key={cat.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                    >
                      <Checkbox
                        checked={form.applicableServices.includes(cat.id)}
                        onCheckedChange={() => toggleService(cat.id)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Size-Based Pricing Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Size-Based Pricing</Label>
                  <Switch
                    checked={sizePricingEnabled}
                    onCheckedChange={setSizePricingEnabled}
                  />
                </div>

                {sizePricingEnabled && (
                  <div className="rounded-lg border">
                    <div className="text-muted-foreground grid grid-cols-[1fr_100px_110px] gap-2 border-b px-3 py-2 text-xs font-medium">
                      <span>Size</span>
                      <span>Modifier</span>
                      <span>Type</span>
                    </div>
                    {sizePricingRows.map((row, idx) => (
                      <div
                        key={row.size}
                        className={cn(
                          "grid grid-cols-[1fr_100px_110px] items-center gap-2 px-3 py-2",
                          idx < sizePricingRows.length - 1 && "border-b",
                        )}
                      >
                        <span className="text-sm">{SIZE_LABELS[row.size]}</span>
                        <Input
                          type="number"
                          min={0}
                          value={row.priceModifier}
                          onChange={(e) => {
                            const next = [...sizePricingRows];
                            next[idx] = {
                              ...next[idx],
                              priceModifier: parseFloat(e.target.value) || 0,
                            };
                            setSizePricingRows(next);
                          }}
                          className="h-8"
                        />
                        <Select
                          value={row.modifierType}
                          onValueChange={(v) => {
                            const next = [...sizePricingRows];
                            next[idx] = {
                              ...next[idx],
                              modifierType: v as "flat" | "percentage",
                            };
                            setSizePricingRows(next);
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat ($)</SelectItem>
                            <SelectItem value="percentage">
                              Percent (%)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Requires Scheduling */}
              <div className="flex items-center justify-between">
                <Label>Requires Scheduling</Label>
                <Switch
                  checked={form.requiresScheduling}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      requiresScheduling: v,
                      generatesTask: v ? prev.generatesTask : false,
                    }))
                  }
                />
              </div>

              {/* Auto-Generate Task - only when scheduling on */}
              {form.requiresScheduling && (
                <div className="flex items-center justify-between">
                  <Label>Auto-Generate Task</Label>
                  <Switch
                    checked={form.generatesTask}
                    onCheckedChange={(v) =>
                      setForm((prev) => ({ ...prev, generatesTask: v }))
                    }
                  />
                </div>
              )}

              {/* Task Category - only when generatesTask on */}
              {form.generatesTask && (
                <div className="space-y-2">
                  <Label htmlFor="addon-task-cat">Task Category</Label>
                  <Input
                    id="addon-task-cat"
                    value={form.taskCategory || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        taskCategory: e.target.value,
                      }))
                    }
                    placeholder='e.g. "exercise", "grooming"'
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
