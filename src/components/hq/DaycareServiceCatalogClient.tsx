"use client";

import { useCallback, useMemo, useState } from "react";
import { Sun, DollarSign } from "lucide-react";
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
import {
  HqComparisonTable,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import {
  useSaveDaycareLocationPrice,
  type DaycareLocationPrice,
} from "@/lib/api/hq-services";
import { locationStyles } from "@/lib/hq/location-styles";

// ============================================================================
// Real per-location daycare pricing — migration 20260826160000,
// `daycare_location_prices`. Unlike grooming and boarding, daycare has no
// catalog item to price: one flat rate per branch, so this table has exactly
// one row rather than one per service or kennel class.
// ============================================================================

function shortName(loc: FacilityLocation): string {
  return loc.name.split("–")[1]?.trim() ?? loc.name;
}

/** A synthetic single row — daycare has no catalogue to iterate. */
interface DaycareRow {
  id: "daycare";
}

function effectivePrice(
  overrides: DaycareLocationPrice[],
  locationId: string,
  facilityDefault: number,
): number {
  return (
    overrides.find((p) => p.locationId === locationId)?.basePrice ??
    facilityDefault
  );
}

function hasOverride(overrides: DaycareLocationPrice[], locationId: string) {
  return overrides.some((p) => p.locationId === locationId);
}

interface Props {
  facilityDefault: number;
  overrides: DaycareLocationPrice[];
  locations: FacilityLocation[];
}

export function DaycareServiceCatalogClient({
  facilityDefault,
  overrides,
  locations,
}: Props) {
  const save = useSaveDaycareLocationPrice();
  const [editing, setEditing] = useState<FacilityLocation | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = useCallback(
    (location: FacilityLocation) => {
      const override = overrides.find((p) => p.locationId === location.id);
      setDraft(override ? String(override.basePrice) : "");
      setEditing(location);
    },
    [overrides],
  );

  function resetToFacilityWide() {
    if (!editing) return;
    save.mutate(
      { locationId: editing.id, basePrice: null },
      {
        onSuccess: () => {
          toast.success(`${shortName(editing)} now uses the base rate`);
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
      toast.error("Enter a daily rate, or reset to the base rate instead.");
      return;
    }
    const basePrice = Number(raw);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      toast.error("The daily rate must be a positive number.");
      return;
    }
    save.mutate(
      { locationId: editing.id, basePrice },
      {
        onSuccess: () => {
          toast.success(`Rate saved for ${shortName(editing)}`);
          setEditing(null);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  const columns = useMemo<ColumnDef<DaycareRow>[]>(
    () => [
      {
        key: "name",
        label: "Service",
        align: "left",
        render: (_row: DaycareRow) => (
          <div className="min-w-0">
            <p className="font-medium">Daycare — full day</p>
            <p className="text-muted-foreground truncate text-[11px]">
              Half day is always half this rate
            </p>
          </div>
        ),
      },
      {
        key: "base",
        label: "Base rate",
        align: "right",
        render: (_row: DaycareRow) => (
          <span className="tabular-nums">${facilityDefault}/day</span>
        ),
      },
      ...locations.map<ColumnDef<DaycareRow>>((loc) => ({
        key: loc.id,
        label: loc.shortCode ?? shortName(loc),
        align: "right",
        render: (_row: DaycareRow) => {
          const overridden = hasOverride(overrides, loc.id);
          const price = effectivePrice(overrides, loc.id, facilityDefault);
          const ls = locationStyles(loc);
          return (
            <button
              type="button"
              onClick={() => startEdit(loc)}
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
              ${price}
            </button>
          );
        },
      })),
      {
        key: "status",
        label: "Status",
        align: "center",
        render: (_row: DaycareRow) => (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            Active
          </Badge>
        ),
      },
    ],
    [locations, overrides, facilityDefault, startEdit],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sun className="size-5 text-amber-500" />
          Daycare
        </h2>
        <p className="text-muted-foreground text-sm">
          The full-day rate across every branch. Click a branch&apos;s rate to
          set its own, or reset it back to the base. The base rate itself is set
          from each branch&apos;s own settings.
        </p>
      </div>

      <HqComparisonTable data={[{ id: "daycare" }]} columns={columns} />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Daycare · {editing ? shortName(editing) : ""}
            </DialogTitle>
            <DialogDescription>
              Leave blank and reset to use the base rate. Half day is always
              half of whichever rate applies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="size-3" />
              Full-day rate
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder={String(facilityDefault)}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            {editing && hasOverride(overrides, editing.id) && (
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
