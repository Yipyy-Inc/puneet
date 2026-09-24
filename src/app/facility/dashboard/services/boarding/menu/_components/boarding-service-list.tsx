"use client";

import { useMemo, useState } from "react";
import { Bed, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useLocationContext } from "@/hooks/use-location-context";
import { BRAND_COLOR_PALETTE } from "@/lib/operations-calendar";
import {
  useBoardingServiceCategories,
  useBoardingServices,
  useDeleteBoardingService,
  useSaveBoardingService,
} from "@/lib/api/boarding-catalogue";
import type { BoardingService } from "@/lib/api/mappers/boarding-service";

import { BoardingServiceDialog } from "./boarding-service-dialog";

// ============================================================================
// The boarding menu, grouped the way the facility grouped it.
//
// ── THIS IS THE MENU, NOT THE BUILDING ────────────────────────────────────
//
// Until Phase 5 `room_categories` was both: the Rooms page and the Rates page
// were two editors over one table, so "Deluxe Suite" was the kennel, the
// nightly rate and the menu item at once — and a facility could not offer two
// priced services in one kennel class, nor one service across two. The Rooms
// page still owns the lodging types; this owns what may be sold into them.
//
// ── NOTHING RENDERS AGAINST A FALLBACK ────────────────────────────────────
//
// A skeleton until the menu has arrived. Mounting the list against an empty
// array and letting the query land afterwards shows "no services yet" to a
// facility that has ten, and the Add button beside that sentence invites them
// to fix a problem they do not have.
// ============================================================================

function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

/**
 * The swatch colour, from a column that holds TWO shapes.
 *
 * ── WHY THIS IS NOT JUST `service.color` ──────────────────────────────────
 *
 * `RateColorPicker` writes a HEX, so anything created through this screen
 * carries one. The ten services the Phase 5 migration carried over took
 * `room_categories.color`, which is a `RoomCategoryColor` NAME — "amber",
 * "slate", "violet".
 *
 * Passing a name straight to `backgroundColor` was a quiet mess, caught by
 * photographing this screen: "blue", "violet" and "orange" happen to be CSS
 * NAMED COLOURS and rendered as browser defaults nowhere near the palette,
 * while "amber" and "slate" are not and rendered as nothing at all. Two of the
 * four cards had no swatch and the other two were off-palette — with every
 * gate green, because CSS does not complain about a colour it cannot parse.
 *
 * So: a hex is used as given, a known name is resolved through
 * `BRAND_COLOR_PALETTE` — the same values the picker offers, never a new one —
 * and anything else returns null so the swatch is ABSENT rather than wrong. A
 * missing dot reads as "no colour set"; a browser-default dot reads as a
 * decision somebody made.
 */
function swatchHex(color: string | null): string | null {
  if (!color) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  const named = BRAND_COLOR_PALETTE.find(
    (c) => c.name.toLowerCase() === color.trim().toLowerCase(),
  );
  return named?.hex ?? null;
}

function ServiceCard({
  service,
  branchCount,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  service: BoardingService;
  branchCount: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t, locale } = useStaffText("boardingServices");
  const swatch = swatchHex(service.color);

  const restrictions =
    service.eligibleSpecies.length +
    service.eligibleBreeds.length +
    service.eligibleWeightTiers.length +
    service.eligiblePetTags.length +
    service.blockedPetTags.length;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {/* The colour code is internal — a swatch, never type. Absent
                when the value is not one this product knows: see `swatchHex`. */}
            {swatch ? (
              <span
                aria-hidden
                className="mt-1 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: swatch }}
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">
                {service.name}
              </p>
              {service.description ? (
                <p className="text-muted-foreground line-clamp-2 text-[13.5px]">
                  {service.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[17px] font-bold tabular-nums">
              {money(service.facilityPrice, locale)}
            </p>
            {/* The unit is half of the price — never implied. */}
            <p className="text-muted-foreground text-[12px] font-bold tracking-[.06em] uppercase">
              {service.unit === "day" ? t("perDay") : t("perNight")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!service.isActive ? (
            <Badge variant="outline">{t("inactive")}</Badge>
          ) : null}
          <Badge variant="outline" className="gap-1">
            <Bed className="size-3" aria-hidden />
            {service.lodgingTypeIds.length === 0
              ? t("allLodgingTypes")
              : t("lodgingTypeCount").replace(
                  "{n}",
                  String(service.lodgingTypeIds.length),
                )}
          </Badge>
          {restrictions > 0 ? (
            <Badge variant="outline">
              {t("restrictionCount").replace("{n}", String(restrictions))}
            </Badge>
          ) : null}
          {branchCount > 0 ? (
            <Badge variant="outline">
              {t("branchPriceCount").replace("{n}", String(branchCount))}
            </Badge>
          ) : null}
          {service.requiresEvaluation ? (
            <Badge variant="outline">{t("needsEvaluation")}</Badge>
          ) : null}
        </div>

        {/* Persistent, never revealed on hover: §6 rule 11, and two of the
            three contexts have no hover at all. */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden />
            {t("edit")}
          </Button>
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="size-4" aria-hidden />
            {t("duplicate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-(--error)"
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
            {t("remove")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function BoardingServiceList() {
  const { t } = useStaffText("boardingServices");
  const { isMultiLocation } = useLocationContext();
  const { data: services, isPending } = useBoardingServices();
  const { data: categories } = useBoardingServiceCategories();
  const save = useSaveBoardingService();
  const remove = useDeleteBoardingService();

  const [editing, setEditing] = useState<BoardingService | null>(null);
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const list = services ?? [];
    const cats = categories ?? [];
    const groups = cats.map((c) => ({
      id: c.id,
      name: c.name,
      items: list.filter((s) => s.categoryId === c.id),
    }));
    const ungrouped = list.filter(
      (s) => !s.categoryId || !cats.some((c) => c.id === s.categoryId),
    );
    if (ungrouped.length > 0) {
      groups.push({
        id: "__ungrouped__",
        name: t("ungrouped"),
        items: ungrouped,
      });
    }
    return groups.filter((g) => g.items.length > 0);
  }, [services, categories, t]);

  async function duplicate(service: BoardingService) {
    try {
      await save.mutateAsync({
        input: {
          name: t("copyOf").replace("{name}", service.name),
          description: service.description,
          categoryId: service.categoryId,
          color: service.color,
          price: service.facilityPrice,
          unit: service.unit,
          taxable: service.taxable,
          lodgingTypeIds: service.lodgingTypeIds,
          eligibleSpecies: service.eligibleSpecies,
          eligibleBreeds: service.eligibleBreeds,
          eligibleWeightTiers: service.eligibleWeightTiers,
          eligiblePetTags: service.eligiblePetTags,
          blockedPetTags: service.blockedPetTags,
          locationIds: service.locationIds,
          requiresEvaluation: service.requiresEvaluation,
          requiresEvaluationOnline: service.requiresEvaluationOnline,
          // A copy starts as a DRAFT. Duplicating a live service and having it
          // appear on the booking wizard the same second is not what anybody
          // means by "duplicate".
          isActive: false,
        },
      });
      toast.success(t("duplicated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("couldNotSaveService"),
      );
    }
  }

  async function confirmRemove(service: BoardingService) {
    try {
      await remove.mutateAsync(service.id);
      toast.success(t("removed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("couldNotRemove"));
    }
  }

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-(--ink-heading)">
            {t("menuTitle")}
          </h2>
          <p className="text-muted-foreground text-[13.5px]">
            {t("menuBlurb")}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          {t("addService")}
        </Button>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-[15px] font-semibold">{t("noServicesTitle")}</p>
            <p className="text-muted-foreground text-[14.5px]">
              {t("noServicesBlurb")}
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <div key={group.id} className="space-y-3">
            <p className="text-[12px] font-bold tracking-[0.06em] text-(--ink-tertiary) uppercase">
              {group.name}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {group.items.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  branchCount={
                    isMultiLocation
                      ? service.locationPricing.filter(
                          (p) => p.locationId !== null,
                        ).length
                      : 0
                  }
                  onEdit={() => {
                    setEditing(service);
                    setOpen(true);
                  }}
                  onDuplicate={() => void duplicate(service)}
                  onDelete={() => void confirmRemove(service)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Keyed so the draft is seeded once per service, never kept from the
          last one the dialog happened to show. */}
      <BoardingServiceDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        service={editing}
        categories={categories ?? []}
      />
    </div>
  );
}
