"use client";

import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import { ServiceTaxToggle } from "@/components/facility/pricing/service-tax-toggle";
import { PetEligibility } from "@/components/facility/services/pet-eligibility";
import { useRooms } from "@/hooks/use-rooms";
import { useLocationContext } from "@/hooks/use-location-context";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";
import {
  useSaveBoardingService,
  type BoardingServiceCategory,
} from "@/lib/api/boarding-catalogue";
import type {
  BoardingPriceUnit,
  BoardingService,
} from "@/lib/api/mappers/boarding-service";

// ============================================================================
// One boarding service — the menu item, not the kennel.
//
// ── THE TWO FIELDS THAT ONLY BOARDING HAS ─────────────────────────────────
//
// UNIT. MoéGo, verbatim, because it is the whole reason the column exists:
// "Monday to Wednesday is 2 nights or 3 days." Which one a facility charges is
// theirs to say, and the price means nothing without it — so the unit sits
// beside the number rather than in a settings page somewhere else.
//
// LODGING TYPES. MoéGo: "By default all lodging types are selected. Toggle off
// All Lodging Types to limit." EMPTY MEANS EVERY TYPE, the convention every
// eligibility array in this schema uses, so switching every box off is the
// same as leaving them all on — said out loud on the screen because a reader
// cannot be expected to infer it.
//
// THEY ARE KEYED BY `rowId`, NEVER `id`. `lodging_type_ids` is a `uuid[]`;
// `RoomCategory.id` is the category's `legacy_id` (`cat-suite`). Both are
// `string`, so the wrong one typechecks and matches nothing — which is
// precisely what emptied the booking wizard's kennel list until a screenshot
// caught it. A category with no `rowId` is a draft and cannot be named.
//
// ── THE DRAFT IS SEEDED ONCE, FROM A KEY ──────────────────────────────────
//
// `useState` seeded from a prop keeps the first value forever. The dialog is
// remounted by its `key` in the parent instead — the reason
// `check:settings-seeding` exists: an editor seeded from a value that arrives
// late saves the fallback over the facility's real one.
// ============================================================================

const FACILITY_WIDE = "facility";
/** Radix Select throws on an item whose value is the empty string. */
const NO_CATEGORY = "__none__";

export interface BoardingServiceDraft {
  name: string;
  description: string;
  categoryId: string | null;
  imageUrl: string;
  color: string;
  price: string;
  unit: BoardingPriceUnit;
  taxable: boolean;
  lodgingTypeIds: string[];
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: string[];
  eligiblePetTags: string[];
  blockedPetTags: string[];
  locationIds: string[];
  requiresEvaluation: boolean;
  requiresEvaluationOnline: boolean;
  isActive: boolean;
  branchPrices: Record<string, string>;
}

export function draftFrom(
  service: BoardingService | null,
): BoardingServiceDraft {
  const branchPrices: Record<string, string> = {};
  for (const p of service?.locationPricing ?? []) {
    branchPrices[p.locationId ?? FACILITY_WIDE] = String(p.price);
  }
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    categoryId: service?.categoryId ?? null,
    imageUrl: service?.imageUrl ?? "",
    color: service?.color ?? "#1668E3",
    price: service ? String(service.facilityPrice) : "",
    unit: service?.unit ?? "night",
    taxable: service?.taxable ?? true,
    lodgingTypeIds: service?.lodgingTypeIds ?? [],
    eligibleSpecies: service?.eligibleSpecies ?? [],
    eligibleBreeds: service?.eligibleBreeds ?? [],
    eligibleWeightTiers: service?.eligibleWeightTiers ?? [],
    eligiblePetTags: service?.eligiblePetTags ?? [],
    blockedPetTags: service?.blockedPetTags ?? [],
    locationIds: service?.locationIds ?? [],
    requiresEvaluation: service?.requiresEvaluation ?? false,
    requiresEvaluationOnline: service?.requiresEvaluationOnline ?? false,
    isActive: service?.isActive ?? true,
    branchPrices,
  };
}

function Section({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold text-[var(--ink-heading)]">
          {index} · {title}
        </h3>
        {hint ? (
          <p className="text-muted-foreground text-[13.5px]">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function BoardingServiceDialog({
  open,
  onOpenChange,
  service,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = adding a new one. */
  service: BoardingService | null;
  categories: BoardingServiceCategory[];
}) {
  const { t } = useStaffText("boardingServices");
  const { categories: roomCategories } = useRooms();
  const { locations, isMultiLocation } = useLocationContext();
  const save = useSaveBoardingService();

  const [draft, setDraft] = useState<BoardingServiceDraft>(() =>
    draftFrom(service),
  );
  const [allLodging, setAllLodging] = useState(
    (service?.lodgingTypeIds ?? []).length === 0,
  );
  const [overrideByBranch, setOverrideByBranch] = useState(
    Object.keys(draftFrom(service).branchPrices).some(
      (k) => k !== FACILITY_WIDE,
    ),
  );

  // The dialog is remounted by key, so this only runs when it opens fresh.
  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(service));
    setAllLodging((service?.lodgingTypeIds ?? []).length === 0);
  }, [open, service]);

  const patch = (next: Partial<BoardingServiceDraft>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  // Boarding classes only, and only ones carrying a uuid — see the header.
  const lodgingOptions = roomCategories
    .filter((c) => c.service === "boarding" && c.rowId)
    .map((c) => ({ id: c.rowId as string, label: c.name }));

  const priceValue = Number(draft.price);
  const valid = draft.name.trim().length > 0 && Number.isFinite(priceValue);

  async function handleSave() {
    if (!valid) return;

    const branchPrices: Record<string, number> = {};
    // The facility-wide row always exists once a price is typed, so a branch
    // that overrides nothing still falls back to something real.
    branchPrices[FACILITY_WIDE] = Math.max(0, priceValue);
    if (overrideByBranch) {
      for (const [key, value] of Object.entries(draft.branchPrices)) {
        if (key === FACILITY_WIDE) continue;
        const n = Number(value);
        if (value !== "" && Number.isFinite(n)) branchPrices[key] = n;
      }
    }

    try {
      const result = await save.mutateAsync({
        id: service?.id,
        input: {
          name: draft.name.trim(),
          description: draft.description,
          categoryId: draft.categoryId,
          imageUrl: draft.imageUrl.trim() || null,
          color: draft.color,
          price: Math.max(0, priceValue),
          unit: draft.unit,
          taxable: draft.taxable,
          // Empty is EVERY type, which is why "all" writes `[]` rather than
          // listing them: a service pinned to today's list would silently stop
          // covering a lodging type added tomorrow.
          lodgingTypeIds: allLodging ? [] : draft.lodgingTypeIds,
          eligibleSpecies: draft.eligibleSpecies,
          eligibleBreeds: draft.eligibleBreeds,
          eligibleWeightTiers: draft.eligibleWeightTiers,
          eligiblePetTags: draft.eligiblePetTags,
          blockedPetTags: draft.blockedPetTags,
          locationIds: draft.locationIds,
          requiresEvaluation: draft.requiresEvaluation,
          requiresEvaluationOnline: draft.requiresEvaluationOnline,
          isActive: draft.isActive,
          branchPrices,
        },
      });

      // A partial success is a real outcome: `manage_services` saved the
      // service, `manage_rates` was missing, so the prices did not move.
      if (result.pricesWritten) {
        toast.success(t("saved"));
      } else {
        toast.warning(t("savedButNotPriced"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("couldNotSaveService"),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {service ? t("editService") : t("addService")}
          </DialogTitle>
          <DialogDescription>{t("dialogBlurb")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh] pr-4">
          <div className="space-y-8 py-2">
            {/* ── 1 Basic info ──────────────────────────────────────── */}
            <Section index={1} title={t("basicInfo")}>
              <div className="space-y-2">
                <Label htmlFor="bsv-name">{t("serviceName")}</Label>
                <Input
                  id="bsv-name"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder={t("serviceNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bsv-desc">{t("description")}</Label>
                <Textarea
                  id="bsv-desc"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bsv-cat">{t("category")}</Label>
                  <Select
                    value={draft.categoryId ?? NO_CATEGORY}
                    onValueChange={(v) =>
                      patch({ categoryId: v === NO_CATEGORY ? null : v })
                    }
                  >
                    <SelectTrigger id="bsv-cat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>
                        {t("ungrouped")}
                      </SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {/* Internal only — MoéGo is explicit that the colour is for
                      the calendar and never shown to a client.

                      THE LABEL IS THE PICKER'S, not a sibling of it. A
                      `<Label>` here rendered "Colour (internal only)" directly
                      above the picker's own "Colour" — two labels for one
                      control, which a screenshot showed and nothing else
                      could. `RateColorPicker` takes the word precisely so its
                      call sites do not each invent one. */}
                  <RateColorPicker
                    label={t("colourInternal")}
                    value={draft.color}
                    onChange={(color) => patch({ color })}
                  />
                </div>
              </div>
            </Section>

            {/* ── 2 Price and unit ──────────────────────────────────── */}
            <Section index={2} title={t("priceSection")} hint={t("unitHint")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bsv-price">{t("price")}</Label>
                  <div className="relative">
                    <DollarSign
                      className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                      aria-hidden
                    />
                    <Input
                      id="bsv-price"
                      className="pl-9"
                      inputMode="decimal"
                      value={draft.price}
                      onChange={(e) => patch({ price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("chargedPer")}</Label>
                  {/* Two buttons rather than a select: there are exactly two
                      answers and the difference is the price. A 2px ring, not
                      an edge accent and not a tint fill (§6 rules 1 and 2). */}
                  <div className="grid grid-cols-2 gap-2">
                    {(["night", "day"] as const).map((unit) => {
                      const chosen = draft.unit === unit;
                      return (
                        <button
                          key={unit}
                          type="button"
                          aria-pressed={chosen}
                          onClick={() => patch({ unit })}
                          className={cn(
                            "bg-card min-h-10 rounded-full border px-4 text-[14.5px] font-semibold max-lg:min-h-12",
                            "transition-[box-shadow,border-color] duration-150",
                            chosen
                              ? "border-transparent shadow-[inset_0_0_0_2px_var(--primary)]"
                              : "border-[var(--line)] hover:border-[var(--line-strong)]",
                          )}
                        >
                          {unit === "night" ? t("perNight") : t("perDay")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <ServiceTaxToggle
                taxable={draft.taxable}
                onChange={(taxable) => patch({ taxable })}
              />

              {isMultiLocation ? (
                <div className="space-y-3 rounded-2xl border border-[var(--line)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold">
                        {t("branchPrices")}
                      </p>
                      <p className="text-muted-foreground text-[13.5px]">
                        {t("branchPricesHint")}
                      </p>
                    </div>
                    <Switch
                      checked={overrideByBranch}
                      onCheckedChange={setOverrideByBranch}
                    />
                  </div>
                  {overrideByBranch ? (
                    <div className="space-y-2">
                      {locations.map((loc) => (
                        <div key={loc.id} className="flex items-center gap-3">
                          <Label
                            htmlFor={`bsv-branch-${loc.id}`}
                            className="min-w-0 flex-1 truncate text-[14.5px] font-normal"
                          >
                            {loc.name}
                          </Label>
                          <Input
                            id={`bsv-branch-${loc.id}`}
                            className="w-32"
                            inputMode="decimal"
                            placeholder={draft.price || "0.00"}
                            value={draft.branchPrices[loc.id] ?? ""}
                            onChange={(e) =>
                              patch({
                                branchPrices: {
                                  ...draft.branchPrices,
                                  [loc.id]: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Section>

            {/* ── 3 Lodging types ───────────────────────────────────── */}
            <Section
              index={3}
              title={t("lodgingSection")}
              hint={t("lodgingHint")}
            >
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="bsv-all-lodging"
                  className="text-[14.5px] font-normal"
                >
                  {t("allLodgingTypes")}
                </Label>
                <Switch
                  id="bsv-all-lodging"
                  checked={allLodging}
                  onCheckedChange={setAllLodging}
                />
              </div>

              {!allLodging ? (
                lodgingOptions.length === 0 ? (
                  <p className="text-muted-foreground text-[13.5px]">
                    {t("noLodgingTypes")}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lodgingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex min-h-10 items-center gap-3 rounded-2xl border border-[var(--line)] px-3 text-[14.5px] max-lg:min-h-12"
                      >
                        <Checkbox
                          checked={draft.lodgingTypeIds.includes(opt.id)}
                          onCheckedChange={(checked) =>
                            patch({
                              lodgingTypeIds: checked
                                ? [...draft.lodgingTypeIds, opt.id]
                                : draft.lodgingTypeIds.filter(
                                    (id) => id !== opt.id,
                                  ),
                            })
                          }
                        />
                        <span className="min-w-0 truncate">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )
              ) : null}
            </Section>

            {/* ── 4 Pet details ─────────────────────────────────────── */}
            <Section index={4} title={t("petDetailsSection")}>
              <PetEligibility
                eligibleSpecies={draft.eligibleSpecies}
                eligibleBreeds={draft.eligibleBreeds}
                eligibleWeightTiers={draft.eligibleWeightTiers}
                eligiblePetTags={draft.eligiblePetTags}
                blockedPetTags={draft.blockedPetTags}
                onChange={patch}
              />
            </Section>

            {/* ── 5 Evaluation and availability ─────────────────────── */}
            <Section
              index={5}
              title={t("availabilitySection")}
              hint={t("evaluationHint")}
            >
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="bsv-eval" className="text-[14.5px] font-normal">
                  {t("requiresEvaluation")}
                </Label>
                <Switch
                  id="bsv-eval"
                  checked={draft.requiresEvaluation}
                  onCheckedChange={(v) => patch({ requiresEvaluation: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="bsv-eval-online"
                  className="text-[14.5px] font-normal"
                >
                  {t("requiresEvaluationOnline")}
                </Label>
                <Switch
                  id="bsv-eval-online"
                  checked={draft.requiresEvaluationOnline}
                  onCheckedChange={(v) =>
                    patch({ requiresEvaluationOnline: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="bsv-active"
                  className="text-[14.5px] font-normal"
                >
                  {t("activeLabel")}
                </Label>
                <Switch
                  id="bsv-active"
                  checked={draft.isActive}
                  onCheckedChange={(v) => patch({ isActive: v })}
                />
              </div>
            </Section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void handleSave()} disabled={!valid}>
            {save.isPending ? t("saving") : t("saveService")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
