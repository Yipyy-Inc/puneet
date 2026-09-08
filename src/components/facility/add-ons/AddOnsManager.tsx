"use client";

import { useState } from "react";
import type { ServiceAddOn, AddOnCategory } from "@/types/facility";
import {
  useSaveFacilitySetting,
  useServiceAddOns,
} from "@/lib/api/facility-settings";
import { Skeleton } from "@/components/ui/skeleton";

import { useCustomServices } from "@/hooks/use-custom-services";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { formatDuration, formatMoney, formatPercent } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
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
//
// There isn't any here any more. Add-ons and their categories live in the
// `service_addons` settings domain, so this screen edits what the business
// sells rather than what this browser remembers — see lib/settings/addons.ts
// for what that was costing.

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

const SCHEDULING_KEY: Record<string, string> = {
  quantity: "schedQuantity",
  time_slot: "schedTimeSlot",
  per_stay_night: "schedPerNight",
  grooming_linked: "schedGrooming",
};

// ── The services an add-on can attach to ─────────────────────────────────
//
// This list used to be derived from SERVICE_CATEGORIES — the CUSTOMER
// booking flow's catalogue, carrying photographs, base prices and marketing
// bullets — and then everything but `{id, name}` was thrown away. Two things
// came of that. Sixty-four English strings entered this screen's translation
// surface through a file it used for two fields. And the filter beside it
// named `retail` and `vet`, neither of which SERVICE_CATEGORIES contains,
// so neither has ever rendered here — the four below are what a facility has
// actually seen. Adding the missing two is a product decision, not a
// translation one, so it is written down rather than made here.
const BUILTIN_ADDON_SERVICES = [
  "daycare",
  "boarding",
  "grooming",
  "training",
] as const;

const SERVICE_KEY: Record<(typeof BUILTIN_ADDON_SERVICES)[number], string> = {
  daycare: "svcDaycare",
  boarding: "svcBoarding",
  grooming: "svcGrooming",
  training: "svcTraining",
};

// The group a row with no category falls into. It is a KEY — it orders and
// buckets the rows — so it stays out of the catalogue and only its heading
// is translated, at the render site. The English word used to be the key,
// which meant a facility naming a category "Uncategorized" merged the two.
const UNCATEGORIZED = "__uncategorized__";

// `$${addon.price}` put a leading dollar sign on every figure and a `/` in
// front of every unit. Both are English-only shapes: fr-CA writes `42,50 $`,
// sign trailing, with a non-breaking space so the two never wrap apart — and
// it says `par jour`, not `/jour`. Intl decides the money; the catalogue
// supplies the whole suffix rather than a fragment glued to a slash.
export function formatPrice(
  addon: ServiceAddOn,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  const amount = formatMoney(addon.price, locale);
  const per = (unit: string) =>
    t("pricePerUnit").replace("{amount}", amount).replace("{unit}", unit);
  switch (addon.pricingType) {
    case "flat":
      return amount;
    case "per_day":
      return t("pricePerDay").replace("{amount}", amount);
    case "per_session":
      return per(addon.unitLabel || t("unitSession"));
    case "per_hour":
      return per(addon.unitLabel || t("unitHour"));
    case "per_item":
      return per(addon.unitLabel || t("unitItem"));
    case "percentage_of_booking":
      return t("priceOfBooking").replace(
        "{pct}",
        formatPercent(addon.price, locale),
      );
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AddOnsManagerProps {
  /** When set, only show add-ons applicable to this service and default new ones to it */
  serviceFilter?: string;
}

// Nothing renders until the extras have arrived. The editor below seeds
// `useState` from what it is handed and a `useState` initialiser runs once, so
// mounting against the empty fallback and letting the query land after would
// show a facility no add-ons whatever it had saved — and the first edit would
// report that emptiness back as the new catalogue.
export function AddOnsManager({ serviceFilter }: AddOnsManagerProps = {}) {
  const { addOns, categories, configured, isPending } = useServiceAddOns();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <AddOnsEditor
      key={configured ? "stored" : "empty"}
      serviceFilter={serviceFilter}
      initialAddOns={addOns}
      initialCategories={categories}
      configured={configured}
    />
  );
}

function AddOnsEditor({
  serviceFilter,
  initialAddOns,
  initialCategories,
  configured,
}: {
  serviceFilter?: string;
  initialAddOns: ServiceAddOn[];
  initialCategories: AddOnCategory[];
  configured: boolean;
}) {
  const { locale, section } = useSettingsText();
  const t = section("addons");
  // Intl picks the plural form, not `n === 1`: French counts 0 as singular.
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const plural = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));

  const { modules } = useCustomServices();
  const allServices = [
    ...BUILTIN_ADDON_SERVICES.map((id) => ({ id, name: t(SERVICE_KEY[id]) })),
    ...modules
      .filter((m) => m.status === "active" && m.onlineBooking.enabled)
      // A facility names its own service, so that name is a name: it never
      // passes through the locale layer.
      .map((m) => ({ id: m.slug, name: m.name })),
  ];

  const saveSetting = useSaveFacilitySetting();
  const [addOns, setAddOns] = useState<ServiceAddOn[]>(initialAddOns);
  const [categories, setCategories] =
    useState<AddOnCategory[]>(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddOn | null>(null);
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // One domain holds both lists, so every write sends both. They are edited
  // together on this screen and a category with no add-ons referencing it is
  // not a state worth being able to save on its own.
  function persist(
    nextAddOns: ServiceAddOn[],
    nextCategories: AddOnCategory[],
  ) {
    saveSetting.mutate(
      {
        domain: "service_addons",
        value: { addOns: nextAddOns, categories: nextCategories },
      },
      {
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("saveFailed")),
      },
    );
  }

  function persistAddOns(next: ServiceAddOn[]) {
    setAddOns(next);
    persist(next, categories);
  }

  function persistCategories(next: AddOnCategory[]) {
    setCategories(next);
    persist(addOns, next);
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
      toast.success(t("addOnUpdated").replace("{name}", values.name));
    } else {
      const newAddon: ServiceAddOn = {
        id: `addon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...values,
        sortOrder: addOns.length + 1,
        createdAt: now,
        updatedAt: now,
      };
      persistAddOns([...addOns, newAddon]);
      toast.success(t("addOnCreated").replace("{name}", values.name));
    }
    setDialogOpen(false);
  }

  function handleDelete(addon: ServiceAddOn) {
    persistAddOns(addOns.filter((a) => a.id !== addon.id));
    toast.success(t("addOnRemoved").replace("{name}", addon.name));
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
    .filter(
      (a) => !serviceFilter || a.applicableServices.includes(serviceFilter),
    )
    .filter((a) => !filterCat || a.category === filterCat)
    .filter(
      (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const grouped = filtered.reduce<Record<string, ServiceAddOn[]>>(
    (acc, addon) => {
      const key = addon.category || UNCATEGORIZED;
      if (!acc[key]) acc[key] = [];
      acc[key].push(addon);
      return acc;
    },
    {},
  );

  const groupOrder = [
    // Copied before sorting: `.sort()` is in place, and `categories` is
    // state.
    ...[...categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.name),
    UNCATEGORIZED,
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
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatSheetOpen(true)}
            className="gap-1.5"
          >
            <FolderOpen className="size-4" />
            {t("categories")}
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 px-1.5 text-[10px]"
            >
              {categories.length}
            </Badge>
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            {t("createAddOn")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          label={t("tileTotal")}
          value={scopedAddOns.length}
          icon={Sparkles}
          tone="violet"
        />
        <KpiTile
          label={t("tileActive")}
          value={active}
          hint={t("tileActiveHint").replace(
            "{pct}",
            formatPercent(enabledPct, locale),
          )}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label={t("tileScheduled")}
          value={scheduled}
          hint={t("tileScheduledHint")}
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
            placeholder={t("searchPlaceholder")}
            // `h-10` overrode Input's own `min-h-10 max-lg:min-h-12`, which is
            // what stops a French label clipping and what makes the control a
            // standing-staff tap target below 1024px (§5g, §5m).
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterCat(null)}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors max-lg:min-h-12",
              filterCat === null
                ? "bg-foreground text-background border-foreground"
                : "text-muted-foreground hover:bg-muted border-transparent",
            )}
          >
            {t("filterAll")}
          </button>
          {categories.map((cat) => {
            const isActive = filterCat === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCat(isActive ? null : cat.name)}
                className={cn(
                  "flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
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
          <p className="font-semibold">{t("emptyTitle")}</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {search ? t("emptyFiltered") : t("emptyFirst")}
          </p>
          {!search && (
            <Button size="sm" onClick={openCreate} className="mt-4 gap-1.5">
              <Plus className="size-4" />
              {t("createAddOn")}
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
                  <h3 className="text-sm font-semibold">
                    {groupName === UNCATEGORIZED
                      ? t("uncategorized")
                      : groupName}
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    {plural(items.length, "countOne", "countOther")}
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
                        ? [t("allServices")]
                        : addon.applicableServices.map(
                            // An id the list no longer holds is a service that was
                            // removed. Show it as it is stored, rather than
                            // capitalising it into an English-looking word no
                            // catalogue can translate.
                            (s) =>
                              allServices.find((sv) => sv.id === s)?.name ?? s,
                          );
                    return (
                      <div
                        key={addon.id}
                        className={cn(
                          // The inactive state was `opacity-60` over the whole card, which
                          // §6 rule 4 bans: opacity rewrites every ratio in the subtree, so
                          // the name, the price and the metadata all drop below the text
                          // floor at once. It is a chip now — a word, which is also the
                          // only version a colour-blind reader and a printout can read.
                          "group bg-card hover:border-foreground/10 relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm",
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
                              <Badge
                                variant="secondary"
                                className="shrink-0 px-1.5 text-[10px]"
                              >
                                {t("badgeDefault")}
                              </Badge>
                            )}
                            {!addon.isActive && (
                              <Badge
                                variant="secondary"
                                className="shrink-0 px-1.5 text-[10px]"
                              >
                                {t("badgeInactive")}
                              </Badge>
                            )}
                            <span className="text-muted-foreground/40 text-xs">
                              ·
                            </span>
                            <span className="text-foreground/90 text-sm font-semibold tabular-nums">
                              {formatPrice(addon, locale, t)}
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
                              {t(SCHEDULING_KEY[schedKey] ?? "schedQuantity")}
                            </span>
                            {addon.duration && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatDuration(addon.duration, locale)}
                              </span>
                            )}
                            {addon.generatesTask && (
                              <span className="inline-flex items-center gap-1">
                                <ListChecks className="size-3" />
                                {t("autoTaskTag")}
                              </span>
                            )}
                            {addon.requiresScheduling &&
                              schedKey !== "time_slot" && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="size-3" />
                                  {t("schedTimeSlot")}
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
                            aria-label={t("toggleAddOn").replace(
                              "{name}",
                              addon.name,
                            )}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 opacity-60 transition-opacity group-hover:opacity-100"
                              >
                                <MoreVertical className="size-4" />
                                <span className="sr-only">{t("openMenu")}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(addon)}>
                                <Pencil className="mr-2 size-4" />
                                {t("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(addon)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                {t("delete")}
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
