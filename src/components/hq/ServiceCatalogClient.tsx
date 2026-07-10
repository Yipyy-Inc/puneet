"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Plus,
  CheckCircle2,
  Minus,
  Info,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import type {
  MasterService,
  LocationServiceOverride,
} from "@/types/service-catalog";
import { resolveService } from "@/types/service-catalog";
import {
  HqComparisonTable,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { NewServiceDialog } from "@/components/hq/NewServiceDialog";
import { serviceCatalogPerformance } from "@/data/hq-analytics";
import { locationStyles } from "@/lib/hq/location-styles";

interface Props {
  masterServices: MasterService[];
  overrides: LocationServiceOverride[];
  locations: Location[];
}

const CATEGORY_LABELS: Record<string, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  addon: "Add-ons",
  spa: "Spa",
  transport: "Transport",
  custom: "Custom",
};

const UNIT_LABELS: Record<MasterService["unit"], string> = {
  per_visit: "/ visit",
  per_night: "/ night",
  per_hour: "/ hour",
  per_session: "/ session",
  flat: "flat",
};

function shortName(loc: Location): string {
  return loc.name.split("–")[1]?.trim() ?? loc.name;
}

export function ServiceCatalogClient({
  masterServices,
  overrides: initialOverrides,
  locations,
}: Props) {
  const [services, setServices] = useState(masterServices);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [editing, setEditing] = useState<{
    serviceId: string;
    locationId: string;
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [syncTarget, setSyncTarget] = useState<MasterService | null>(null);

  const justCreated = services.find((s) => s.id === justCreatedId);

  // This-month bookings + revenue per service (network-wide), keyed by id.
  const perfById = useMemo(
    () => new Map(serviceCatalogPerformance.map((p) => [p.serviceId, p])),
    [],
  );

  // Locations that currently override this service's price.
  const priceOverrideCount = (serviceId: string) =>
    overrides.filter(
      (o) => o.serviceId === serviceId && o.priceOverride != null,
    ).length;

  // Push the base price to every location that has a price override — clearing
  // the override (and dropping it when nothing else remains custom).
  function syncPrices(service: MasterService) {
    setOverrides((prev) =>
      prev.flatMap((o) => {
        if (o.serviceId !== service.id || o.priceOverride == null) return [o];
        const cleared = {
          ...o,
          priceOverride: null,
          updatedAt: new Date().toISOString(),
        };
        const matchesMaster =
          cleared.isActive === service.isActive &&
          !cleared.notes &&
          (cleared.addOnIds?.length ?? 0) === 0 &&
          (cleared.packageIds?.length ?? 0) === 0;
        return matchesMaster ? [] : [cleared];
      }),
    );
    toast.success(`Base price synced to all locations for "${service.name}"`);
    setSyncTarget(null);
  }

  // A new master service is created network-wide but disabled at every location,
  // so it must be explicitly enabled per location via the toggles.
  function createService(service: MasterService) {
    setServices((prev) => [service, ...prev]);
    setOverrides((prev) => [
      ...prev,
      ...locations.map((loc) => ({
        serviceId: service.id,
        locationId: loc.id,
        isActive: false,
        priceOverride: null,
        addOnIds: [],
        packageIds: [],
        updatedAt: service.createdAt,
      })),
    ]);
    setJustCreatedId(service.id);
    setNewOpen(false);
    toast.success(
      `"${service.name}" created as a master service — now enable it per location`,
    );
  }

  const findOverride = (serviceId: string, locationId: string) =>
    overrides.find(
      (o) => o.serviceId === serviceId && o.locationId === locationId,
    ) ?? null;

  const upsertOverride = (next: LocationServiceOverride) => {
    setOverrides((prev) => {
      const idx = prev.findIndex(
        (o) =>
          o.serviceId === next.serviceId && o.locationId === next.locationId,
      );
      if (idx === -1) return [...prev, next];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  };

  const removeOverride = (serviceId: string, locationId: string) => {
    setOverrides((prev) =>
      prev.filter(
        (o) => !(o.serviceId === serviceId && o.locationId === locationId),
      ),
    );
  };

  function startEdit(s: MasterService, loc: Location, price: number) {
    setEditing({ serviceId: s.id, locationId: loc.id });
    setDraft(String(price));
  }

  // Enable/disable the service at a location. Drops the override entirely when
  // the location once again matches the master default (active + base price).
  function toggleActive(s: MasterService, loc: Location) {
    const current = findOverride(s.id, loc.id);
    const resolved = resolveService(s, current);
    const nextActive = !resolved.isActiveAtLocation;
    const matchesMaster =
      nextActive === s.isActive &&
      current?.priceOverride == null &&
      !current?.notes &&
      (current?.addOnIds?.length ?? 0) === 0 &&
      (current?.packageIds?.length ?? 0) === 0;
    if (matchesMaster) {
      if (current) removeOverride(s.id, loc.id);
      return;
    }
    upsertOverride({
      serviceId: s.id,
      locationId: loc.id,
      isActive: nextActive,
      priceOverride: current?.priceOverride ?? null,
      addOnIds: current?.addOnIds ?? [],
      packageIds: current?.packageIds ?? [],
      notes: current?.notes,
      updatedAt: new Date().toISOString(),
    });
  }

  function commitEdit() {
    if (!editing) return;
    const { serviceId, locationId } = editing;
    const svc = services.find((s) => s.id === serviceId);
    setEditing(null);
    if (!svc) return;
    const raw = draft.trim();
    const num = Number(raw);
    if (raw === "" || !Number.isFinite(num) || num < 0) return; // invalid → cancel
    const current = findOverride(serviceId, locationId);
    const newPrice = num === svc.defaultPrice ? null : num;
    // Resetting to the base price with nothing else on the override → drop it.
    const hasOtherState =
      current?.isActive === false ||
      Boolean(current?.notes) ||
      (current?.addOnIds?.length ?? 0) > 0 ||
      (current?.packageIds?.length ?? 0) > 0;
    if (newPrice === null && !hasOtherState) {
      if (current) removeOverride(serviceId, locationId);
      return;
    }
    upsertOverride({
      serviceId,
      locationId,
      isActive: current?.isActive ?? svc.isActive,
      priceOverride: newPrice,
      addOnIds: current?.addOnIds ?? [],
      packageIds: current?.packageIds ?? [],
      notes: current?.notes,
      updatedAt: new Date().toISOString(),
    });
  }

  function renderPriceCell(s: MasterService, loc: Location) {
    const override = findOverride(s.id, loc.id);
    const resolved = resolveService(s, override);
    const isEditing =
      editing?.serviceId === s.id && editing.locationId === loc.id;
    const active = resolved.isActiveAtLocation;
    const usesBase =
      override?.priceOverride == null &&
      resolved.effectivePrice === s.defaultPrice;
    const ls = locationStyles(loc);

    return (
      <div className="flex items-center justify-end gap-2">
        {/* Price field — only when the service is enabled here */}
        {active &&
          (isEditing ? (
            <input
              type="number"
              min={0}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditing(null);
              }}
              className="border-input bg-background focus-visible:ring-ring block h-7 w-20 rounded-md border px-2 text-right text-xs tabular-nums focus-visible:ring-2 focus-visible:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => startEdit(s, loc, resolved.effectivePrice)}
              title="Click to edit this location's price"
              className={cn(
                "hover:bg-muted/60 rounded-md px-1.5 py-1 text-xs tabular-nums transition-colors",
                usesBase
                  ? "text-muted-foreground"
                  : cn("font-semibold", ls.text),
              )}
            >
              ${resolved.effectivePrice}
            </button>
          ))}

        {/* Enable/disable toggle: green check = enabled, grey dash = disabled */}
        <button
          type="button"
          onClick={() => toggleActive(s, loc)}
          aria-pressed={active}
          title={
            active ? "Enabled — click to disable" : "Disabled — click to enable"
          }
          className="hover:bg-muted/60 flex size-6 items-center justify-center rounded-md transition-colors"
        >
          {active ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Minus className="text-muted-foreground/60 size-4" />
          )}
        </button>
      </div>
    );
  }

  const columns = useMemo<ColumnDef<MasterService>[]>(
    () => [
      {
        key: "name",
        label: "Service Name",
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
        key: "type",
        label: "Type",
        align: "left",
        sortable: true,
        sortValue: (s) => s.category,
        render: (s) => (
          <Badge variant="outline" className="text-[10px] capitalize">
            {CATEGORY_LABELS[s.category] ?? s.category}
          </Badge>
        ),
      },
      {
        key: "base",
        label: "Base Price",
        align: "right",
        sortable: true,
        sortValue: (s) => s.defaultPrice,
        render: (s) => (
          <span className="tabular-nums">
            ${s.defaultPrice}
            <span className="text-muted-foreground text-[10px]">
              {" "}
              {UNIT_LABELS[s.unit]}
            </span>
          </span>
        ),
      },
      {
        key: "performance",
        label: "This Month",
        align: "right",
        sortable: true,
        sortValue: (s) => perfById.get(s.id)?.revenue ?? -1,
        render: (s) => {
          const perf = perfById.get(s.id);
          if (!perf)
            return (
              <span className="text-muted-foreground text-[11px]">No data</span>
            );
          return (
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                ${perf.revenue.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-[10px] tabular-nums">
                {perf.bookings.toLocaleString()} bookings
              </p>
            </div>
          );
        },
      },
      ...locations.map<ColumnDef<MasterService>>((loc) => ({
        key: loc.id,
        label: shortName(loc),
        align: "right",
        render: (s) => renderPriceCell(s, loc),
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
    // renderPriceCell closes over editing/draft/overrides; rebuild when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locations, editing, draft, overrides],
  );

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Boxes className="size-6 text-sky-600" />
            Service Catalog
          </h1>
          <p className="text-muted-foreground text-sm">
            Services here are <strong>network-level master definitions</strong>.
            Create one, then enable and price it per location using the toggles
            in each location column.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            New Service
          </Button>
          <span className="text-muted-foreground text-[11px]">
            Adds a master service (disabled everywhere)
          </span>
        </div>
      </div>

      {/* Post-create hint pointing to the per-location toggles */}
      {justCreated && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-300/50 bg-sky-50/60 px-3 py-2.5 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
          <p className="flex-1">
            <strong>&ldquo;{justCreated.name}&rdquo;</strong> was created as a
            master service. It&apos;s{" "}
            <strong>disabled at every location</strong> for now — use the
            location toggles in its row below (grey dash → green check) to
            enable and price it where you offer it.
          </p>
          <button
            type="button"
            onClick={() => setJustCreatedId(null)}
            aria-label="Dismiss"
            className="rounded-md p-0.5 hover:bg-sky-500/10"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <HqComparisonTable
        data={services}
        columns={columns}
        searchKeys={["name", "description"]}
        searchPlaceholder="Search services…"
        rowClassName={(s) =>
          s.id === justCreatedId ? "bg-sky-50/60 dark:bg-sky-950/20" : ""
        }
        actions={(s) => {
          const n = priceOverrideCount(s.id);
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={n === 0}
              onClick={() => setSyncTarget(s)}
              title={
                n === 0
                  ? "All locations already use the base price"
                  : `Push base price to ${n} location${n === 1 ? "" : "s"}`
              }
            >
              <RefreshCw className="size-3.5" />
              Sync Prices
            </Button>
          );
        }}
      />

      <NewServiceDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={createService}
      />

      {/* Sync-prices confirmation */}
      <AlertDialog
        open={syncTarget !== null}
        onOpenChange={(o) => !o && setSyncTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Sync base price to all locations?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite location-specific prices for{" "}
              <strong>{syncTarget?.name}</strong> at{" "}
              {syncTarget ? priceOverrideCount(syncTarget.id) : 0} location
              {syncTarget && priceOverrideCount(syncTarget.id) === 1 ? "" : "s"}
              . Their prices reset to the ${syncTarget?.defaultPrice} base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => syncTarget && syncPrices(syncTarget)}
            >
              Overwrite prices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
