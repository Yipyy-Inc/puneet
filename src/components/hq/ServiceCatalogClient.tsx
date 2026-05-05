"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Plus,
  Pencil,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import type {
  MasterService,
  LocationServiceOverride,
} from "@/types/service-catalog";
import { resolveService } from "@/types/service-catalog";

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

export function ServiceCatalogClient({
  masterServices,
  overrides: initialOverrides,
  locations,
}: Props) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"master" | string>("master");
  const [editingOverride, setEditingOverride] = useState<{
    service: MasterService;
    locationId: string;
  } | null>(null);

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return masterServices;
    return masterServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [masterServices, search]);

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

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Boxes className="size-6 text-sky-600" />
            Service Catalog
          </h1>
          <p className="text-muted-foreground text-sm">
            Define services once at HQ, customize availability and pricing per
            location.
          </p>
        </div>
        <Button>
          <Plus className="mr-1.5 size-4" />
          New Service
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="master">
            Master Catalog ({masterServices.length})
          </TabsTrigger>
          {locations.map((loc) => (
            <TabsTrigger
              key={loc.id}
              value={loc.id}
              style={{ borderColor: activeTab === loc.id ? loc.color : undefined }}
            >
              <span
                className="mr-1.5 size-2 rounded-full"
                style={{ backgroundColor: loc.color }}
              />
              {loc.shortCode}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Search bar */}
        <div className="relative my-4 max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="pl-9"
          />
        </div>

        {/* Master catalog tab */}
        <TabsContent value="master" className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Master entries define what every location can offer. Edit them here,
            then customize per location.
          </p>
          {filteredServices.map((s) => (
            <MasterServiceCard
              key={s.id}
              service={s}
              locations={locations}
              overrides={overrides.filter((o) => o.serviceId === s.id)}
            />
          ))}
        </TabsContent>

        {/* Per-location tabs */}
        {locations.map((loc) => (
          <TabsContent key={loc.id} value={loc.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: loc.color }}
              />
              <span className="font-semibold">{loc.name}</span>
              <span className="text-muted-foreground">
                · Showing master services with this location&apos;s overrides
                applied
              </span>
            </div>

            {filteredServices.map((s) => {
              const override = findOverride(s.id, loc.id);
              const resolved = resolveService(s, override);
              return (
                <Card
                  key={s.id}
                  className={cn(!resolved.isActiveAtLocation && "opacity-60")}
                >
                  <CardContent className="flex flex-wrap items-center gap-3 py-3">
                    {/* Status */}
                    <Switch
                      checked={resolved.isActiveAtLocation}
                      onCheckedChange={(checked) => {
                        upsertOverride({
                          serviceId: s.id,
                          locationId: loc.id,
                          isActive: checked,
                          priceOverride: override?.priceOverride ?? null,
                          addOnIds: override?.addOnIds ?? [],
                          packageIds: override?.packageIds ?? [],
                          notes: override?.notes,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold">{s.name}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {CATEGORY_LABELS[s.category]}
                        </Badge>
                        {resolved.isUsingOverride && (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                          >
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {s.description}
                      </p>
                      {override?.notes && (
                        <p className="text-amber-700 dark:text-amber-300 mt-1 text-[11px] italic">
                          Note: {override.notes}
                        </p>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="text-right">
                      <p className="text-base font-bold tabular-nums">
                        ${resolved.effectivePrice}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {UNIT_LABELS[s.unit]}
                      </p>
                      {resolved.isUsingOverride &&
                        resolved.effectivePrice !== s.defaultPrice && (
                          <p className="text-muted-foreground line-through text-[10px]">
                            ${s.defaultPrice} master
                          </p>
                        )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditingOverride({ service: s, locationId: loc.id })
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {resolved.isUsingOverride && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOverride(s.id, loc.id)}
                          title="Reset to master"
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Override editor dialog */}
      <Dialog
        open={Boolean(editingOverride)}
        onOpenChange={(o) => !o && setEditingOverride(null)}
      >
        <DialogContent className="max-w-md">
          {editingOverride && (
            <OverrideEditor
              service={editingOverride.service}
              locationId={editingOverride.locationId}
              location={
                locations.find((l) => l.id === editingOverride.locationId)!
              }
              currentOverride={findOverride(
                editingOverride.service.id,
                editingOverride.locationId,
              )}
              onSave={(o) => {
                upsertOverride(o);
                setEditingOverride(null);
              }}
              onCancel={() => setEditingOverride(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MasterServiceCard({
  service,
  locations,
  overrides,
}: {
  service: MasterService;
  locations: Location[];
  overrides: LocationServiceOverride[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {service.name}
              <Badge variant="outline" className="capitalize text-[10px]">
                {CATEGORY_LABELS[service.category]}
              </Badge>
              {!service.isActive && (
                <Badge variant="outline" className="text-[10px]">
                  Disabled
                </Badge>
              )}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {service.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums">
              ${service.defaultPrice}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {UNIT_LABELS[service.unit]}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {locations.map((loc) => {
            const override = overrides.find((o) => o.locationId === loc.id);
            const resolved = resolveService(service, override ?? null);
            return (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-md border bg-muted/20 px-2.5 py-1.5"
                style={{ borderLeft: `3px solid ${loc.color}` }}
              >
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: loc.color }}>
                    {loc.shortCode}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      !resolved.isActiveAtLocation && "text-muted-foreground line-through",
                    )}
                  >
                    ${resolved.effectivePrice}
                  </p>
                </div>
                {resolved.isActiveAtLocation ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                ) : (
                  <XCircle className="size-3.5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function OverrideEditor({
  service,
  locationId,
  location,
  currentOverride,
  onSave,
  onCancel,
}: {
  service: MasterService;
  locationId: string;
  location: Location;
  currentOverride: LocationServiceOverride | null;
  onSave: (override: LocationServiceOverride) => void;
  onCancel: () => void;
}) {
  const [isActive, setIsActive] = useState(
    currentOverride?.isActive ?? service.isActive,
  );
  const [priceOverride, setPriceOverride] = useState(
    currentOverride?.priceOverride !== null &&
      currentOverride?.priceOverride !== undefined
      ? String(currentOverride.priceOverride)
      : "",
  );
  const [notes, setNotes] = useState(currentOverride?.notes ?? "");

  const handleSave = () => {
    onSave({
      serviceId: service.id,
      locationId,
      isActive,
      priceOverride: priceOverride === "" ? null : Number(priceOverride),
      addOnIds: currentOverride?.addOnIds ?? [],
      packageIds: currentOverride?.packageIds ?? [],
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: location.color }}
          />
          {service.name} · {location.name}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <Label>Active at this location</Label>
            <p className="text-muted-foreground text-xs">
              Disable to hide this service from {location.name}
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Price override</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">$</span>
            <Input
              type="number"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              placeholder={`${service.defaultPrice} (master default)`}
            />
            <span className="text-muted-foreground text-xs">
              {UNIT_LABELS[service.unit]}
            </span>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Leave blank to use master default of ${service.defaultPrice}.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Internal notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this overridden? Visible to staff."
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Override</Button>
      </DialogFooter>
    </>
  );
}
