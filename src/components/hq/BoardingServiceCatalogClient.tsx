"use client";

import { useMemo, useState } from "react";
import { BedDouble, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { FacilityLocation } from "@/types/location";
import type { RoomCategory } from "@/types/rooms";
import {
  HqComparisonTable,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { useSaveBoardingCategoryLocationPrice } from "@/lib/api/hq-services";
import { locationStyles } from "@/lib/hq/location-styles";

// ============================================================================
// Real per-location boarding prices — migration 20260826150000,
// `room_category_location_prices`. Sibling of `ServiceCatalogClient.tsx`
// (grooming); kept separate because the price shapes differ (four sizes vs.
// one nightly rate per kennel class) and the two share nothing but the page.
//
// Daycare shares `room_categories` with boarding but has no per-location
// price table -- it prices from a flat `facility_settings` day rate that this
// table cannot reach, so the caller filters to `service === "boarding"`
// before this component ever sees the categories.
// ============================================================================

function shortName(loc: FacilityLocation): string {
  return loc.name.split("–")[1]?.trim() ?? loc.name;
}

/** This branch's own nightly rate for the class, or the facility-wide default. */
function effectivePrice(
  category: RoomCategory,
  locationId: string,
): number | undefined {
  const override = category.locationPricing.find(
    (p) => p.locationId === locationId,
  );
  return override?.price ?? category.defaultBasePrice;
}

function hasOverride(category: RoomCategory, locationId: string): boolean {
  return category.locationPricing.some((p) => p.locationId === locationId);
}

interface Props {
  categories: RoomCategory[];
  locations: FacilityLocation[];
}

export function BoardingServiceCatalogClient({ categories, locations }: Props) {
  const save = useSaveBoardingCategoryLocationPrice();
  const [editing, setEditing] = useState<{
    category: RoomCategory;
    location: FacilityLocation;
  } | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(category: RoomCategory, location: FacilityLocation) {
    const override = category.locationPricing.find(
      (p) => p.locationId === location.id,
    );
    setDraft(override ? String(override.price) : "");
    setEditing({ category, location });
  }

  function resetToFacilityWide() {
    if (!editing) return;
    const { category, location } = editing;
    save.mutate(
      { categoryId: category.id, locationId: location.id, price: null },
      {
        onSuccess: () => {
          toast.success(`${shortName(location)} now uses the base rate`);
          setEditing(null);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  function commitEdit() {
    if (!editing) return;
    const raw = draft.trim();
    if (!raw) {
      toast.error("Enter a nightly rate, or reset to the base rate instead.");
      return;
    }
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("The nightly rate must be a positive number.");
      return;
    }
    save.mutate(
      {
        categoryId: editing.category.id,
        locationId: editing.location.id,
        price,
      },
      {
        onSuccess: () => {
          toast.success(`Rate saved for ${shortName(editing.location)}`);
          setEditing(null);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  const columns = useMemo<ColumnDef<RoomCategory>[]>(
    () => [
      {
        key: "name",
        label: "Kennel class",
        align: "left",
        sortable: true,
        sortValue: (c) => c.name,
        render: (c) => (
          <div className="min-w-0">
            <p className="font-medium">{c.name}</p>
            {c.description && (
              <p className="text-muted-foreground truncate text-[11px]">
                {c.description}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "base",
        label: "Base rate",
        align: "right",
        sortable: true,
        sortValue: (c) => c.defaultBasePrice ?? 0,
        render: (c) => (
          <span className="tabular-nums">
            {c.defaultBasePrice !== undefined
              ? `$${c.defaultBasePrice}/night`
              : "—"}
          </span>
        ),
      },
      ...locations.map<ColumnDef<RoomCategory>>((loc) => ({
        key: loc.id,
        label: loc.shortCode ?? shortName(loc),
        align: "right",
        render: (c) => {
          const overridden = hasOverride(c, loc.id);
          const price = effectivePrice(c, loc.id);
          const ls = locationStyles(loc);
          return (
            <button
              type="button"
              onClick={() => startEdit(c, loc)}
              title={
                overridden
                  ? "This branch has its own rate — click to edit"
                  : "Using the base rate — click to set this branch's own"
              }
              className={cn(
                "hover:bg-muted/60 rounded-md px-1.5 py-1 text-xs tabular-nums transition-colors",
                overridden
                  ? cn("font-semibold", ls.text)
                  : "text-muted-foreground",
              )}
            >
              {price !== undefined ? `$${price}` : "—"}
            </button>
          );
        },
      })),
      {
        key: "status",
        label: "Status",
        align: "center",
        sortable: true,
        sortValue: (c) => (c.active ? 1 : 0),
        render: (c) =>
          c.active ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Disabled
            </Badge>
          ),
      },
    ],
    [locations],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BedDouble className="size-5 text-slate-600" />
          Boarding
        </h2>
        <p className="text-muted-foreground text-sm">
          Nightly kennel-class rates across every branch. Click a branch&apos;s
          rate to set its own, or reset it back to the base. Classes and kennels
          themselves are managed from each branch&apos;s Rooms &amp; Rates
          pages.
        </p>
      </div>

      <HqComparisonTable
        data={categories}
        columns={columns}
        searchKeys={["name", "description"]}
        searchPlaceholder="Search kennel classes…"
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing?.category.name} ·{" "}
              {editing ? shortName(editing.location) : ""}
            </DialogTitle>
            <DialogDescription>
              Leave blank and reset to use the base rate. Saving replaces this
              branch&apos;s rate for this class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="size-3" />
              Nightly rate
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder={
                editing ? String(editing.category.defaultBasePrice ?? "—") : ""
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            {editing && hasOverride(editing.category, editing.location.id) && (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={resetToFacilityWide}
                disabled={save.isPending}
              >
                Reset to base rate
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={commitEdit}
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
