"use client";

import { useState } from "react";
import type { ServiceAddOn, AddOnCategory } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import {
  defaultAddOnCategories,
  ADDONS_CATEGORIES_STORAGE_KEY,
} from "@/data/add-on-categories";
import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";
import { getAllServiceCategories } from "@/lib/service-registry";
import { useCustomServices } from "@/hooks/use-custom-services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Package,
  Calendar,
  ListChecks,
  Pencil,
  Trash2,
  MoreVertical,
  FolderOpen,
  Hash,
  Clock,
  Repeat,
  Scissors,
  Search,
  Sparkles,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AddOnFormDialog,
  type AddOnFormValues,
} from "@/components/facility/add-ons/AddOnFormDialog";
import { AddOnCategorySheet } from "@/components/facility/add-ons/AddOnCategorySheet";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";

// ── Storage ────────────────────────────────────────────────────────────────────

const ADDONS_STORAGE_KEY = "settings-service-addons";

function loadAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem(ADDONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
  } catch {
    return defaultServiceAddOns;
  }
}

function loadCategories(): AddOnCategory[] {
  if (typeof window === "undefined") return defaultAddOnCategories;
  try {
    const raw = localStorage.getItem(ADDONS_CATEGORIES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AddOnCategory[]) : defaultAddOnCategories;
  } catch {
    return defaultAddOnCategories;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SCHEDULING_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  quantity: Hash,
  time_slot: Clock,
  per_stay_night: Repeat,
  grooming_linked: Scissors,
};

const SCHEDULING_LABEL: Record<string, string> = {
  quantity: "Qty",
  time_slot: "Scheduled",
  per_stay_night: "Per Night",
  grooming_linked: "Grooming",
};

function formatPrice(addon: ServiceAddOn): string {
  switch (addon.pricingType) {
    case "flat": return `$${addon.price}`;
    case "per_day": return `$${addon.price}/day`;
    case "per_session": return `$${addon.price}/${addon.unitLabel || "session"}`;
    case "per_hour": return `$${addon.price}/${addon.unitLabel || "hr"}`;
    case "per_item": return `$${addon.price}/${addon.unitLabel || "item"}`;
    case "percentage_of_booking": return `${addon.price}% of booking`;
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AddOnsManagerProps {
  /** When set, only show add-ons applicable to this service and default new ones to it */
  serviceFilter?: string;
}

export function AddOnsManager({ serviceFilter }: AddOnsManagerProps = {}) {
  const { modules } = useCustomServices();
  const allServices = getAllServiceCategories(SERVICE_CATEGORIES, modules)
    .filter(
      (s) =>
        [
          "daycare",
          "boarding",
          "grooming",
          "training",
          "retail",
          "vet",
        ].includes(s.id) || s.isCustom,
    )
    .map((s) => ({ id: s.id, name: s.name }));

  const [addOns, setAddOns] = useState<ServiceAddOn[]>(loadAddOns);
  const [categories, setCategories] = useState<AddOnCategory[]>(loadCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddOn | null>(null);
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function persistAddOns(next: ServiceAddOn[]) {
    setAddOns(next);
    if (typeof window !== "undefined")
      localStorage.setItem(ADDONS_STORAGE_KEY, JSON.stringify(next));
  }

  function persistCategories(next: AddOnCategory[]) {
    setCategories(next);
    if (typeof window !== "undefined")
      localStorage.setItem(ADDONS_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
  }

  function openCreate() {
    if (serviceFilter) {
      // Pre-seed applicableServices so the new add-on is scoped to this service
      setEditingAddon({
        id: "",
        name: "",
        description: "",
        image: "",
        category: "",
        colorCode: "#3b82f6",
        pricingType: "flat",
        price: 0,
        unitLabel: "",
        applicableServices: [serviceFilter],
        schedulingType: "quantity",
        requiresScheduling: false,
        generatesTask: true,
        isActive: true,
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      } as ServiceAddOn);
    } else {
      setEditingAddon(null);
    }
    setDialogOpen(true);
  }
  function openEdit(addon: ServiceAddOn) {
    setEditingAddon(addon);
    setDialogOpen(true);
  }

  function handleSave(values: AddOnFormValues) {
    const now = new Date().toISOString();
    if (editingAddon && editingAddon.id !== "") {
      persistAddOns(
        addOns.map((a) =>
          a.id === editingAddon.id
            ? { ...editingAddon, ...values, updatedAt: now }
            : a,
        ),
      );
      toast.success(`"${values.name}" updated`);
    } else {
      const newAddon: ServiceAddOn = {
        id: `addon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...values,
        sortOrder: addOns.length + 1,
        createdAt: now,
        updatedAt: now,
      };
      persistAddOns([...addOns, newAddon]);
      toast.success(`"${values.name}" created`);
    }
    setDialogOpen(false);
  }

  function handleDelete(addon: ServiceAddOn) {
    persistAddOns(addOns.filter((a) => a.id !== addon.id));
    toast.success(`"${addon.name}" removed`);
  }

  function handleToggle(addon: ServiceAddOn) {
    persistAddOns(
      addOns.map((a) =>
        a.id === addon.id
          ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() }
          : a,
      ),
    );
  }

  // Stats (scoped to serviceFilter when set)
  const scopedAddOns = serviceFilter
    ? addOns.filter((a) => a.applicableServices.includes(serviceFilter))
    : addOns;
  const active = scopedAddOns.filter((a) => a.isActive).length;
  const scheduled = scopedAddOns.filter(
    (a) => a.requiresScheduling || a.schedulingType === "time_slot",
  ).length;

  // Filtered + grouped
  const filtered = addOns
    .filter((a) => !serviceFilter || a.applicableServices.includes(serviceFilter))
    .filter((a) => !filterCat || a.category === filterCat)
    .filter(
      (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const grouped = filtered.reduce<Record<string, ServiceAddOn[]>>(
    (acc, addon) => {
      const key = addon.category || "Uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(addon);
      return acc;
    },
    {},
  );

  const groupOrder = [
    ...categories.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name),
    "Uncategorized",
  ].filter((g) => grouped[g]);

  const enabledPct =
    scopedAddOns.length === 0
      ? 0
      : Math.round((active / scopedAddOns.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">Add-Ons</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure optional services customers can add to their bookings.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatSheetOpen(true)}
            className="h-9 gap-1.5"
          >
            <FolderOpen className="size-4" />
            Categories
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 px-1.5 text-[10px]"
            >
              {categories.length}
            </Badge>
          </Button>
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5">
            <Plus className="size-4" />
            Create Add-On
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          label="Total Add-Ons"
          value={scopedAddOns.length}
          icon={Sparkles}
          tone="violet"
        />
        <KpiTile
          label="Active"
          value={active}
          hint={`${enabledPct}% enabled`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Scheduled"
          value={scheduled}
          hint="require a time slot"
          icon={CalendarClock}
          tone="indigo"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search add-ons…"
            className="h-10 pl-9 text-sm"
          />
        </div>
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterCat(null)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
              filterCat === null
                ? "bg-foreground text-background border-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted",
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const isActive = filterCat === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCat(isActive ? null : cat.name)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground border-border"
                    : "text-muted-foreground hover:bg-muted border-transparent",
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: cat.colorCode ?? "#64748b" }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20 text-center">
          <div className="bg-background mb-3 flex size-14 items-center justify-center rounded-2xl border shadow-sm">
            <Package className="text-muted-foreground/60 size-6" />
          </div>
          <p className="font-semibold">No add-ons found</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {search
              ? "Try a different search term or clear the active filters."
              : "Create your first add-on so customers can enhance their bookings."}
          </p>
          {!search && (
            <Button size="sm" onClick={openCreate} className="mt-4 gap-1.5">
              <Plus className="size-4" />
              Create Add-On
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {groupOrder.map((groupName) => {
            const cat = categories.find((c) => c.name === groupName);
            const items = grouped[groupName] ?? [];
            return (
              <section key={groupName} className="space-y-3">
                {/* Group header */}
                <div className="bg-muted/40 flex items-center gap-2.5 rounded-xl px-3 py-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat?.colorCode ?? "#64748b" }}
                  />
                  <h3 className="text-sm font-semibold">{groupName}</h3>
                  <span className="text-muted-foreground text-xs">
                    {items.length} {items.length === 1 ? "add-on" : "add-ons"}
                  </span>
                  {cat?.description && (
                    <span className="text-muted-foreground hidden truncate text-xs sm:inline">
                      · {cat.description}
                    </span>
                  )}
                </div>
                {/* Cards */}
                <div className="space-y-2">
                  {items.map((addon) => {
                    const schedKey = addon.schedulingType ?? "quantity";
                    const SchedIcon = SCHEDULING_ICON[schedKey] ?? Hash;
                    const services =
                      addon.applicableServices.length === 0
                        ? ["All services"]
                        : addon.applicableServices.map(
                            (s) =>
                              allServices.find((sv) => sv.id === s)?.name ??
                              s.charAt(0).toUpperCase() + s.slice(1),
                          );
                    return (
                      <div
                        key={addon.id}
                        className={cn(
                          "group bg-card relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:border-foreground/10 hover:shadow-sm",
                          !addon.isActive && "opacity-60",
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="bg-muted border-border/60 relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                          {addon.image ? (
                            <img
                              src={addon.image}
                              alt={addon.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Package className="text-muted-foreground/50 size-6" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          {/* Title row */}
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {addon.name}
                            </span>
                            {addon.isDefault && (
                              <Badge className="h-5 shrink-0 border-blue-200 bg-blue-50 px-1.5 text-[10px] text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                                Default
                              </Badge>
                            )}
                            <span className="text-muted-foreground/40 text-xs">
                              ·
                            </span>
                            <span className="text-foreground/90 text-sm font-semibold tabular-nums">
                              {formatPrice(addon)}
                            </span>
                          </div>

                          {/* Description */}
                          {addon.description && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                              {addon.description}
                            </p>
                          )}

                          {/* Meta row */}
                          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            <span className="inline-flex items-center gap-1">
                              <SchedIcon className="size-3" />
                              {SCHEDULING_LABEL[schedKey]}
                            </span>
                            {addon.duration && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {addon.duration} min
                              </span>
                            )}
                            {addon.generatesTask && (
                              <span className="inline-flex items-center gap-1">
                                <ListChecks className="size-3" />
                                Auto-Task
                              </span>
                            )}
                            {addon.requiresScheduling &&
                              schedKey !== "time_slot" && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="size-3" />
                                  Scheduled
                                </span>
                              )}
                            <span className="bg-border/70 hidden h-3 w-px sm:inline" />
                            <span className="truncate">
                              {services.join(" · ")}
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Switch
                            checked={addon.isActive}
                            onCheckedChange={() => handleToggle(addon)}
                            aria-label={`Toggle ${addon.name}`}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 opacity-60 transition-opacity group-hover:opacity-100"
                              >
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
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AddOnFormDialog
        open={dialogOpen}
        editing={editingAddon}
        categories={categories}
        allServices={allServices}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <AddOnCategorySheet
        open={catSheetOpen}
        onOpenChange={setCatSheetOpen}
        categories={categories}
        onSave={persistCategories}
      />
    </div>
  );
}
