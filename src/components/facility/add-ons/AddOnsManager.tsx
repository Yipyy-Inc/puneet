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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Add-Ons</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Configure optional services customers can add to their bookings.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatSheetOpen(true)}
            className="gap-1.5"
          >
            <FolderOpen className="size-4" />
            Categories
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Create Add-On
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Add-Ons",
            value: scopedAddOns.length,
            color: "text-slate-700",
          },
          {
            label: "Active",
            value: active,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Scheduled",
            value: scheduled,
            sub: "require time slot",
            color: "text-blue-600 dark:text-blue-400",
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-card rounded-xl border px-4 py-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            {sub && (
              <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search add-ons…"
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button
            size="sm"
            variant={filterCat === null ? "secondary" : "ghost"}
            onClick={() => setFilterCat(null)}
            className="h-8 shrink-0 text-xs"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={filterCat === cat.name ? "secondary" : "ghost"}
              onClick={() =>
                setFilterCat(filterCat === cat.name ? null : cat.name)
              }
              className="h-8 shrink-0 gap-1.5 text-xs"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: cat.colorCode ?? "#64748b" }}
              />
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20 text-center">
          <Package className="text-muted-foreground/30 mb-3 size-10" />
          <p className="font-semibold text-slate-700">No add-ons found</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {search
              ? "Try a different search term."
              : "Create your first add-on to get started."}
          </p>
          {!search && (
            <Button size="sm" onClick={openCreate} className="mt-4 gap-1.5">
              <Plus className="size-4" />
              Create Add-On
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupOrder.map((groupName) => {
            const cat = categories.find((c) => c.name === groupName);
            const items = grouped[groupName] ?? [];
            return (
              <div key={groupName} className="space-y-3">
                {/* Group header */}
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: cat?.colorCode ?? "#64748b" }}
                  />
                  <h3 className="text-sm font-semibold text-slate-700">
                    {groupName}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {items.length}
                  </Badge>
                </div>
                {/* Cards */}
                <div className="space-y-2.5">
                  {items.map((addon) => {
                    const SchedIcon =
                      SCHEDULING_ICON[addon.schedulingType ?? "quantity"] ??
                      Hash;
                    return (
                      <div
                        key={addon.id}
                        className={cn(
                          "group bg-card flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                          !addon.isActive && "opacity-55",
                        )}
                      >
                        {/* Color stripe */}
                        <div
                          className="w-1 shrink-0 self-stretch rounded-full"
                          style={{
                            backgroundColor: addon.colorCode ?? "#64748b",
                          }}
                        />

                        {/* Thumbnail */}
                        <div className="bg-muted flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl">
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">
                              {addon.name}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {formatPrice(addon)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px]"
                            >
                              <SchedIcon className="size-2.5" />
                              {
                                SCHEDULING_LABEL[
                                  addon.schedulingType ?? "quantity"
                                ]
                              }
                            </Badge>
                            {addon.generatesTask && (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground gap-1 text-[10px]"
                              >
                                <ListChecks className="size-2.5" />
                                Auto-Task
                              </Badge>
                            )}
                            {addon.requiresScheduling && (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground gap-1 text-[10px]"
                              >
                                <Calendar className="size-2.5" />
                                Scheduled
                              </Badge>
                            )}
                            {addon.isDefault && (
                              <Badge className="border border-blue-200 bg-blue-50 text-[10px] text-blue-700">
                                Default
                              </Badge>
                            )}
                            {addon.duration && (
                              <Badge variant="outline" className="text-[10px]">
                                {addon.duration}min
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {addon.description}
                          </p>
                          <p className="text-muted-foreground/60 mt-1 text-[11px]">
                            {addon.applicableServices.length === 0
                              ? "All services"
                              : addon.applicableServices
                                  .map(
                                    (s) =>
                                      allServices.find((sv) => sv.id === s)
                                        ?.name ??
                                      s.charAt(0).toUpperCase() + s.slice(1),
                                  )
                                  .join(", ")}
                          </p>
                        </div>

                        {/* Controls */}
                        <div className="flex shrink-0 items-center gap-3">
                          <Switch
                            checked={addon.isActive}
                            onCheckedChange={() => handleToggle(addon)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
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
              </div>
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
