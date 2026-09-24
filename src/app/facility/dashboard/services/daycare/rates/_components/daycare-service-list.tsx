"use client";

import { useMemo, useState } from "react";
import { Clock, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useLocationContext } from "@/hooks/use-location-context";
import {
  useDaycareServiceCategories,
  useDaycareServices,
  useDeleteDaycareService,
  useSaveDaycareService,
} from "@/lib/api/daycare-catalogue";
import type { DaycareService } from "@/lib/api/mappers/daycare-service";

import { DaycareServiceDialog } from "./daycare-service-dialog";

// ============================================================================
// The daycare menu, grouped the way the facility grouped it.
//
// ── NOTHING RENDERS AGAINST A FALLBACK ────────────────────────────────────
//
// A skeleton until the menu has arrived. Mounting the list against an empty
// array and letting the query land afterwards shows "no services yet" to a
// facility that has six — and the Add button beside that sentence invites
// them to fix a problem they do not have.
//
// ── AN EMPTY MENU IS MEANINGFUL ───────────────────────────────────────────
//
// No mock fallback. A facility with no daycare services has none, and the
// booking wizard refuses rather than pricing against something invented.
// ============================================================================

function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function ServiceCard({
  service,
  branchCount,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  service: DaycareService;
  branchCount: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t, locale } = useStaffText("daycareServices");

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
            {/* The colour code is internal — a swatch, never type. */}
            <span
              aria-hidden
              className="mt-1 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: service.color ?? "var(--primary)" }}
            />
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
          <p className="shrink-0 text-[17px] font-bold tabular-nums">
            {money(service.facilityPrice, locale)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!service.isActive ? (
            <Badge variant="outline">{t("inactive")}</Badge>
          ) : null}
          {service.maxDurationHours != null ? (
            <Badge variant="outline" className="gap-1">
              <Clock className="size-3" aria-hidden />
              {t("upToHours").replace("{n}", String(service.maxDurationHours))}
            </Badge>
          ) : null}
          {service.rolloverToServiceId ? (
            <Badge variant="outline">{t("rollsOver")}</Badge>
          ) : null}
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

export function DaycareServiceList() {
  const { t } = useStaffText("daycareServices");
  const { isMultiLocation } = useLocationContext();
  const { data: services, isPending } = useDaycareServices();
  const { data: categories } = useDaycareServiceCategories();
  const save = useSaveDaycareService();
  const remove = useDeleteDaycareService();

  const [editing, setEditing] = useState<DaycareService | null>(null);
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

  async function duplicate(service: DaycareService) {
    try {
      await save.mutateAsync({
        input: {
          name: t("copyOf").replace("{name}", service.name),
          description: service.description,
          categoryId: service.categoryId,
          color: service.color,
          price: service.facilityPrice,
          taxable: service.taxable,
          maxDurationHours: service.maxDurationHours,
          eligibleSpecies: service.eligibleSpecies,
          eligibleBreeds: service.eligibleBreeds,
          eligibleWeightTiers: service.eligibleWeightTiers,
          eligiblePetTags: service.eligiblePetTags,
          blockedPetTags: service.blockedPetTags,
          allowedSectionIds: service.allowedSectionIds,
          includedAddOnIds: service.includedAddOnIds,
          locationIds: service.locationIds,
          requiresEvaluation: service.requiresEvaluation,
          requiresEvaluationOnline: service.requiresEvaluationOnline,
          // A copy starts as a DRAFT. Duplicating a live service and having it
          // appear on the booking wizard the same second is not what anybody
          // means by "duplicate".
          isActive: false,
          // Deliberately NOT the rollover target: it points at a service by
          // id, and a copy pointing where the original pointed is a guess.
        },
      });
      toast.success(t("duplicated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("couldNotSaveService"),
      );
    }
  }

  async function confirmRemove(service: DaycareService) {
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
      <DaycareServiceDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        service={editing}
        categories={categories ?? []}
        siblings={services ?? []}
      />
    </div>
  );
}
