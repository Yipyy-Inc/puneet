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
import { IncludedAddOnsPicker } from "@/components/facility/add-ons/IncludedAddOnsPicker";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import { useLocationContext } from "@/hooks/use-location-context";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  useSaveDaycareService,
  type DaycareServiceCategory,
} from "@/lib/api/daycare-catalogue";
import type { DaycareService } from "@/lib/api/mappers/daycare-service";

import { DaycarePetEligibility } from "./daycare-pet-eligibility";

// ============================================================================
// One daycare service, in MoéGo's own seven sections and MoéGo's own order.
//
// ── THE TWO THINGS THAT ARE NOT OBVIOUS ───────────────────────────────────
//
// MAX STAY DURATION is where the price stops covering the stay. Null is NO
// ceiling and is different from 0, which the table refuses outright — MoéGo's
// floor is thirty minutes in half-hour steps, and so is ours.
//
// AUTO ROLLOVER is what happens past that ceiling: the booking BECOMES another
// service and is re-priced. That is why the target cannot be this service —
// the stay would pass the ceiling, become itself, and pass it again.
//
// ── THE DRAFT IS SEEDED ONCE, FROM A KEY ──────────────────────────────────
//
// `useState` seeded from a prop keeps the first value forever. The dialog is
// remounted by its `key` in the parent instead, which is the pattern
// `care-fees-settings-card.tsx` uses and the reason `check:settings-seeding`
// exists: an editor seeded from a value that arrives late saves the fallback
// over the facility's real one.
// ============================================================================

const FACILITY_WIDE = "facility";
/** Radix Select throws on an item whose value is the empty string. */
const NO_CATEGORY = "__none__";
const NO_ROLLOVER = "__none__";

export interface DaycareServiceDraft {
  name: string;
  description: string;
  categoryId: string | null;
  imageUrl: string;
  color: string;
  price: string;
  taxable: boolean;
  maxDurationHours: string;
  rolloverAfterMinutes: string;
  rolloverToServiceId: string | null;
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: string[];
  eligiblePetTags: string[];
  blockedPetTags: string[];
  allowedSectionIds: string[];
  includedAddOnIds: string[];
  locationIds: string[];
  requiresEvaluation: boolean;
  requiresEvaluationOnline: boolean;
  isActive: boolean;
  branchPrices: Record<string, string>;
}

export function draftFrom(service: DaycareService | null): DaycareServiceDraft {
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
    taxable: service?.taxable ?? true,
    maxDurationHours:
      service?.maxDurationHours != null ? String(service.maxDurationHours) : "",
    rolloverAfterMinutes:
      service?.rolloverAfterMinutes != null
        ? String(service.rolloverAfterMinutes)
        : "",
    rolloverToServiceId: service?.rolloverToServiceId ?? null,
    eligibleSpecies: service?.eligibleSpecies ?? [],
    eligibleBreeds: service?.eligibleBreeds ?? [],
    eligibleWeightTiers: service?.eligibleWeightTiers ?? [],
    eligiblePetTags: service?.eligiblePetTags ?? [],
    blockedPetTags: service?.blockedPetTags ?? [],
    allowedSectionIds: service?.allowedSectionIds ?? [],
    includedAddOnIds: service?.includedAddOnIds ?? [],
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

export function DaycareServiceDialog({
  open,
  onOpenChange,
  service,
  categories,
  siblings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = adding a new one. */
  service: DaycareService | null;
  categories: DaycareServiceCategory[];
  /** Every other service, for the rollover target. */
  siblings: DaycareService[];
}) {
  const { t } = useStaffText("daycareServices");
  const { areas, sections } = useDaycareAreas();
  const { locations, isMultiLocation } = useLocationContext();
  const save = useSaveDaycareService();

  const [draft, setDraft] = useState<DaycareServiceDraft>(() =>
    draftFrom(service),
  );
  const [allAreas, setAllAreas] = useState(
    (service?.allowedSectionIds ?? []).length === 0,
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
    setAllAreas((service?.allowedSectionIds ?? []).length === 0);
  }, [open, service]);

  const patch = (next: Partial<DaycareServiceDraft>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  // `useDaycareAreas` returns sections as a FLAT list carrying `playAreaId`,
  // not nested inside their area — so the yard's name is looked up, not walked.
  const sectionOptions = sections
    .filter((section) => section.isActive)
    .map((section) => ({
      id: section.id,
      label:
        `${areas.find((a) => a.id === section.playAreaId)?.name ?? ""} · ${section.name}`.replace(
          /^ · /,
          "",
        ),
    }));

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
          taxable: draft.taxable,
          maxDurationHours: draft.maxDurationHours
            ? Number(draft.maxDurationHours)
            : null,
          rolloverAfterMinutes: draft.rolloverAfterMinutes
            ? Number(draft.rolloverAfterMinutes)
            : null,
          rolloverToServiceId: draft.rolloverToServiceId,
          eligibleSpecies: draft.eligibleSpecies,
          eligibleBreeds: draft.eligibleBreeds,
          eligibleWeightTiers: draft.eligibleWeightTiers,
          eligiblePetTags: draft.eligiblePetTags,
          blockedPetTags: draft.blockedPetTags,
          allowedSectionIds: allAreas ? [] : draft.allowedSectionIds,
          includedAddOnIds: draft.includedAddOnIds,
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
                <Label htmlFor="dsv-name">{t("serviceName")}</Label>
                <Input
                  id="dsv-name"
                  value={draft.name}
                  placeholder={t("serviceNamePlaceholder")}
                  onChange={(e) => patch({ name: e.target.value })}
                />
                <p className="text-muted-foreground text-[13.5px]">
                  {t("serviceNameHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dsv-category">{t("category")}</Label>
                <Select
                  value={draft.categoryId ?? NO_CATEGORY}
                  onValueChange={(v) =>
                    patch({ categoryId: v === NO_CATEGORY ? null : v })
                  }
                >
                  <SelectTrigger id="dsv-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>
                      {t("noCategory")}
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
                <Label htmlFor="dsv-description">{t("description")}</Label>
                <Textarea
                  id="dsv-description"
                  value={draft.description}
                  rows={3}
                  placeholder={t("descriptionPlaceholder")}
                  onChange={(e) => patch({ description: e.target.value })}
                />
                <p className="text-muted-foreground text-[13.5px]">
                  {t("descriptionHint")}
                </p>
              </div>

              <div className="bg-card flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{t("status")}</p>
                  <p className="text-muted-foreground text-[13.5px]">
                    {t("statusHint")}
                  </p>
                </div>
                <Switch
                  checked={draft.isActive}
                  onCheckedChange={(v) => patch({ isActive: v })}
                  aria-label={t("status")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dsv-image">{t("image")}</Label>
                <Input
                  id="dsv-image"
                  value={draft.imageUrl}
                  placeholder={t("imagePlaceholder")}
                  onChange={(e) => patch({ imageUrl: e.target.value })}
                />
                <p className="text-muted-foreground text-[13.5px]">
                  {t("imageHint")}
                </p>
              </div>

              <div className="space-y-1">
                <RateColorPicker
                  value={draft.color}
                  onChange={(color) => patch({ color })}
                  label={t("colourCode")}
                />
                <p className="text-muted-foreground text-[13.5px]">
                  {t("colourHint")}
                </p>
              </div>
            </Section>

            {/* ── 2 Lodgings ────────────────────────────────────────── */}
            <Section index={2} title={t("lodgings")} hint={t("lodgingsHint")}>
              <div className="bg-card flex items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3">
                <p className="text-[15px] font-semibold">{t("allPlayAreas")}</p>
                <Switch
                  checked={allAreas}
                  onCheckedChange={(v) => {
                    setAllAreas(v);
                    if (v) patch({ allowedSectionIds: [] });
                  }}
                  aria-label={t("allPlayAreas")}
                />
              </div>

              {!allAreas ? (
                <div className="space-y-2">
                  {sectionOptions.length === 0 ? (
                    <p className="text-muted-foreground text-[13.5px]">
                      {t("noPlayAreasYet")}
                    </p>
                  ) : (
                    sectionOptions.map((s) => (
                      <label
                        key={s.id}
                        className="flex min-h-10 items-center gap-3 max-lg:min-h-12"
                      >
                        <Checkbox
                          checked={draft.allowedSectionIds.includes(s.id)}
                          onCheckedChange={() =>
                            patch({
                              allowedSectionIds:
                                draft.allowedSectionIds.includes(s.id)
                                  ? draft.allowedSectionIds.filter(
                                      (x) => x !== s.id,
                                    )
                                  : [...draft.allowedSectionIds, s.id],
                            })
                          }
                        />
                        <span className="text-[14.5px]">{s.label}</span>
                      </label>
                    ))
                  )}
                </div>
              ) : null}
            </Section>

            {/* ── 3 Businesses ──────────────────────────────────────── */}
            {isMultiLocation ? (
              <Section
                index={3}
                title={t("businesses")}
                hint={t("businessesHint")}
              >
                {locations.map((loc) => (
                  <label
                    key={loc.id}
                    className="flex min-h-10 items-center gap-3 max-lg:min-h-12"
                  >
                    <Checkbox
                      checked={
                        draft.locationIds.length === 0 ||
                        draft.locationIds.includes(loc.id)
                      }
                      onCheckedChange={() => {
                        const all = locations.map((l) => l.id);
                        const current =
                          draft.locationIds.length === 0
                            ? all
                            : draft.locationIds;
                        const next = current.includes(loc.id)
                          ? current.filter((x) => x !== loc.id)
                          : [...current, loc.id];
                        // Every branch selected means no restriction, which is
                        // the empty array the table stores.
                        patch({
                          locationIds: next.length === all.length ? [] : next,
                        });
                      }}
                    />
                    <span className="text-[14.5px]">{loc.name}</span>
                  </label>
                ))}
              </Section>
            ) : null}

            {/* ── 4 Price ───────────────────────────────────────────── */}
            <Section index={isMultiLocation ? 4 : 3} title={t("price")}>
              <div className="space-y-2">
                <Label htmlFor="dsv-price">{t("priceLabel")}</Label>
                <div className="relative max-w-[200px]">
                  <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="dsv-price"
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-9 tabular-nums"
                    value={draft.price}
                    placeholder="0.00"
                    onChange={(e) => patch({ price: e.target.value })}
                  />
                </div>
              </div>

              <ServiceTaxToggle
                taxable={draft.taxable}
                onChange={(taxable) => patch({ taxable })}
              />

              {isMultiLocation ? (
                <div className="space-y-3">
                  <label className="flex min-h-10 items-center gap-3 max-lg:min-h-12">
                    <Checkbox
                      checked={overrideByBranch}
                      onCheckedChange={(v) => setOverrideByBranch(Boolean(v))}
                    />
                    <span className="text-[14.5px] font-medium">
                      {t("overrideByBusiness")}
                    </span>
                  </label>

                  {overrideByBranch
                    ? locations.map((loc) => (
                        <div
                          key={loc.id}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <span className="w-44 shrink-0 text-[13.5px]">
                            {loc.name}
                          </span>
                          <div className="relative max-w-[160px] flex-1">
                            <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="pl-9 tabular-nums"
                              value={draft.branchPrices[loc.id] ?? ""}
                              placeholder={draft.price || "0.00"}
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
                        </div>
                      ))
                    : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="dsv-max">{t("maxStayDuration")}</Label>
                <Input
                  id="dsv-max"
                  type="number"
                  min={0.5}
                  step={0.5}
                  className="max-w-[200px] tabular-nums"
                  value={draft.maxDurationHours}
                  placeholder={t("noCeiling")}
                  onChange={(e) => patch({ maxDurationHours: e.target.value })}
                />
                <p className="text-muted-foreground text-[13.5px]">
                  {t("maxStayHint")}
                </p>
              </div>

              <IncludedAddOnsPicker
                serviceFilter="daycare"
                selectedIds={draft.includedAddOnIds}
                onChange={(ids) => patch({ includedAddOnIds: ids })}
              />
            </Section>

            {/* ── 5 Auto rollover ───────────────────────────────────── */}
            <Section
              index={isMultiLocation ? 5 : 4}
              title={t("autoRollover")}
              hint={t("autoRolloverHint")}
            >
              <div className="space-y-2">
                <Label htmlFor="dsv-rollover-after">{t("rolloverAfter")}</Label>
                <Input
                  id="dsv-rollover-after"
                  type="number"
                  min={0}
                  className="max-w-[200px] tabular-nums"
                  value={draft.rolloverAfterMinutes}
                  placeholder={t("rolloverOff")}
                  onChange={(e) =>
                    patch({ rolloverAfterMinutes: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dsv-rollover-to">{t("rolloverTo")}</Label>
                <Select
                  value={draft.rolloverToServiceId ?? NO_ROLLOVER}
                  onValueChange={(v) =>
                    patch({
                      rolloverToServiceId: v === NO_ROLLOVER ? null : v,
                    })
                  }
                >
                  <SelectTrigger id="dsv-rollover-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ROLLOVER}>
                      {t("rolloverOff")}
                    </SelectItem>
                    {/* Never this service: the stay would pass the ceiling,
                        become itself, and pass it again. */}
                    {siblings
                      .filter((s) => s.id !== service?.id)
                      .map((s) => (
                        <SelectItem key={s.rowId} value={s.rowId}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </Section>

            {/* ── 6 Pet details ─────────────────────────────────────── */}
            <Section index={isMultiLocation ? 6 : 5} title={t("petDetails")}>
              <DaycarePetEligibility
                eligibleSpecies={draft.eligibleSpecies}
                eligibleBreeds={draft.eligibleBreeds}
                eligibleWeightTiers={draft.eligibleWeightTiers}
                eligiblePetTags={draft.eligiblePetTags}
                blockedPetTags={draft.blockedPetTags}
                onChange={patch}
              />
            </Section>

            {/* ── 7 Evaluation ──────────────────────────────────────── */}
            <Section index={isMultiLocation ? 7 : 6} title={t("evaluation")}>
              <div className="bg-card flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    {t("requiresEvaluation")}
                  </p>
                  <p className="text-muted-foreground text-[13.5px]">
                    {t("requiresEvaluationHint")}
                  </p>
                </div>
                <Switch
                  checked={draft.requiresEvaluation}
                  onCheckedChange={(v) => patch({ requiresEvaluation: v })}
                  aria-label={t("requiresEvaluation")}
                />
              </div>

              <div className="bg-card flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    {t("requiresEvaluationOnline")}
                  </p>
                  <p className="text-muted-foreground text-[13.5px]">
                    {t("requiresEvaluationOnlineHint")}
                  </p>
                </div>
                <Switch
                  checked={draft.requiresEvaluationOnline}
                  onCheckedChange={(v) =>
                    patch({ requiresEvaluationOnline: v })
                  }
                  aria-label={t("requiresEvaluationOnline")}
                />
              </div>
            </Section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!valid || save.isPending}>
            {save.isPending ? t("saving") : t("saveService")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
