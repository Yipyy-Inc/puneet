"use client";

import { useMemo, useState } from "react";
import { Boxes, DollarSign } from "lucide-react";
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
import type { PetSize } from "@/types/base";
import type { HqGroomingService } from "@/types/hq-services";
import {
  HqComparisonTable,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { useSaveGroomingService } from "@/lib/api/grooming-catalogue";
import { locationStyles } from "@/lib/hq/location-styles";

// ============================================================================
// Real per-location grooming prices — see supabase migration 20260825180000
// and src/lib/api/mappers/grooming.ts's `perLocationSizePricing`.
//
// GROOMING ONLY. Boarding has its own sibling component
// (`BoardingServiceCatalogClient.tsx`, migration 20260826150000) — kept
// separate rather than merged in here because the two price shapes differ
// (four sizes vs. one nightly rate) and neither file should carry both.
// Daycare and training/spa/transport/custom still have no real per-location
// priced catalog at all — see the plan for why those stay out.
//
// SERVICES ARE CREATED FROM THE GROOMING RATES PAGE, not from here — this
// screen manages PRICING across locations for services that already exist.
// Add-on/package per-location linking and a "create master service" flow are
// dropped: neither has a real per-location table backing it.
// ============================================================================

const SIZE_ORDER: PetSize[] = ["small", "medium", "large", "giant"];
const SIZE_LABELS: Record<PetSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  giant: "Giant",
};

function shortName(loc: FacilityLocation): string {
  return loc.name.split("–")[1]?.trim() ?? loc.name;
}

/** This location's own price for a size, or the facility-wide default. */
function effectivePrice(
  service: HqGroomingService,
  locationId: string,
  size: PetSize,
): number | undefined {
  const override = service.locationPricing.find(
    (o) => o.locationId === locationId,
  );
  return override?.sizePricing[size] ?? service.sizePricing[size];
}

function hasOverride(service: HqGroomingService, locationId: string): boolean {
  return service.locationPricing.some((o) => o.locationId === locationId);
}

interface Props {
  services: HqGroomingService[];
  locations: FacilityLocation[];
}

export function ServiceCatalogClient({ services, locations }: Props) {
  const save = useSaveGroomingService();
  const [editing, setEditing] = useState<{
    service: HqGroomingService;
    location: FacilityLocation;
  } | null>(null);
  const [draft, setDraft] = useState<Partial<Record<PetSize, string>>>({});

  function startEdit(service: HqGroomingService, location: FacilityLocation) {
    const seed: Partial<Record<PetSize, string>> = {};
    for (const size of SIZE_ORDER) {
      const price = effectivePrice(service, location.id, size);
      if (price !== undefined) seed[size] = String(price);
    }
    setDraft(seed);
    setEditing({ service, location });
  }

  function resetToFacilityWide() {
    if (!editing) return;
    const { service, location } = editing;
    save.mutate(
      { id: service.id, locationId: location.id, sizePricing: {} },
      {
        onSuccess: () => {
          toast.success(`${shortName(location)} now uses the base price`);
          setEditing(null);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  function commitEdit() {
    if (!editing) return;
    const { service } = editing;
    const sizePricing: Partial<Record<PetSize, number>> = {};
    for (const size of SIZE_ORDER) {
      const raw = draft[size]?.trim();
      if (!raw) continue;
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        toast.error(`${SIZE_LABELS[size]} price must be a positive number.`);
        return;
      }
      sizePricing[size] = num;
    }
    save.mutate(
      {
        id: service.id,
        locationId: editing.location.id,
        sizePricing,
      },
      {
        onSuccess: () => {
          toast.success(`Price saved for ${shortName(editing.location)}`);
          setEditing(null);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  const columns = useMemo<ColumnDef<HqGroomingService>[]>(
    () => [
      {
        key: "name",
        label: "Service",
        align: "left",
        sortable: true,
        sortValue: (s) => s.name,
        render: (s) => (
          <div className="min-w-0">
            <p className="font-medium">{s.name}</p>
            <p className="text-muted-foreground truncate text-[11px]">
              {s.description}
            </p>
          </div>
        ),
      },
      {
        key: "base",
        label: "Base (medium)",
        align: "right",
        sortable: true,
        sortValue: (s) => s.sizePricing.medium ?? s.basePrice,
        render: (s) => (
          <span className="tabular-nums">
            ${s.sizePricing.medium ?? s.basePrice}
          </span>
        ),
      },
      ...locations.map<ColumnDef<HqGroomingService>>((loc) => ({
        key: loc.id,
        label: loc.shortCode ?? shortName(loc),
        align: "right",
        render: (s) => {
          const overridden = hasOverride(s, loc.id);
          const price = effectivePrice(s, loc.id, "medium");
          const ls = locationStyles(loc);
          return (
            <button
              type="button"
              onClick={() => startEdit(s, loc)}
              title={
                overridden
                  ? "This branch has its own prices — click to edit"
                  : "Using the base price — click to set this branch's own"
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
        sortValue: (s) => (s.isActive ? 1 : 0),
        render: (s) =>
          s.isActive ? (
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
          <Boxes className="size-5 text-sky-600" />
          Grooming
        </h2>
        <p className="text-muted-foreground text-sm">
          Grooming prices across every branch. Click a branch&apos;s price to
          set its own, or reset it back to the base. New services are added from
          each branch&apos;s Rates page — this screen prices what already
          exists, network-wide.
        </p>
      </div>

      <HqComparisonTable
        data={services}
        columns={columns}
        searchKeys={["name", "description"]}
        searchPlaceholder="Search services…"
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing?.service.name} ·{" "}
              {editing ? shortName(editing.location) : ""}
            </DialogTitle>
            <DialogDescription>
              Sizes left blank use the base price. Saving replaces this
              branch&apos;s whole price list for this service.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {SIZE_ORDER.map((size) => (
              <div key={size} className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="size-3" />
                  {SIZE_LABELS[size]}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={
                    editing
                      ? String(editing.service.sizePricing[size] ?? "—")
                      : ""
                  }
                  value={draft[size] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [size]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            {editing && hasOverride(editing.service, editing.location.id) && (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={resetToFacilityWide}
                disabled={save.isPending}
              >
                Reset to base price
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
