"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import type { Location } from "@/types/location";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  masterServices,
  locationServiceOverrides,
} from "@/data/service-catalog";
import {
  locationDetailStore,
  useLocationPatch,
} from "@/data/location-detail-store";

const UNIT_LABEL: Record<string, string> = {
  per_visit: "/visit",
  per_night: "/night",
  per_hour: "/hr",
  per_session: "/session",
  flat: "",
};

interface Props {
  location: Location;
}

export function ServicesPricingTab({ location }: Props) {
  const patch = useLocationPatch(location.id);
  const overrideEnabled = patch.pricingOverride ?? location.pricingOverride;

  // Services enabled here = master services whose category the location offers.
  const services = masterServices.filter((s) =>
    location.services.includes(s.category),
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function networkPrice(serviceId: string) {
    return masterServices.find((s) => s.id === serviceId)?.defaultPrice ?? 0;
  }

  function effectivePrice(serviceId: string) {
    const patched = patch.servicePrices?.[serviceId];
    if (patched !== undefined) return patched;
    const ov = locationServiceOverrides.find(
      (o) => o.serviceId === serviceId && o.locationId === location.id,
    );
    return ov?.priceOverride ?? networkPrice(serviceId);
  }

  function isOverridden(serviceId: string) {
    if (patch.servicePrices?.[serviceId] !== undefined) return true;
    const ov = locationServiceOverrides.find(
      (o) => o.serviceId === serviceId && o.locationId === location.id,
    );
    return ov?.priceOverride != null;
  }

  function commit(serviceId: string) {
    const raw = drafts[serviceId];
    if (raw === undefined) return;
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setDrafts((d) => {
      if (!(serviceId in d)) return d;
      const rest = { ...d };
      delete rest[serviceId];
      return rest;
    });
    if (next === networkPrice(serviceId)) {
      locationDetailStore.setServicePrice(location.id, serviceId, null);
      toast.success("Reset to network price");
    } else {
      locationDetailStore.setServicePrice(location.id, serviceId, next);
      toast.success("Location price saved");
    }
  }

  function reset(serviceId: string) {
    setDrafts((d) => {
      if (!(serviceId in d)) return d;
      const rest = { ...d };
      delete rest[serviceId];
      return rest;
    });
    locationDetailStore.setServicePrice(location.id, serviceId, null);
    toast.success("Reset to network price");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <Label htmlFor="pricing-override" className="text-sm font-semibold">
            Use location price overrides
          </Label>
          <p className="text-muted-foreground text-xs">
            When off, every service uses the network price.
          </p>
        </div>
        <Switch
          id="pricing-override"
          checked={overrideEnabled}
          onCheckedChange={(v) => {
            locationDetailStore.setPricingOverride(location.id, v);
            toast.success(
              v ? "Location overrides enabled" : "Using network prices",
            );
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-muted-foreground px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                Service
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider uppercase">
                Network price
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider uppercase">
                This location
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                Pricing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {services.map((svc) => {
              const overridden = overrideEnabled && isOverridden(svc.id);
              const unit = UNIT_LABEL[svc.unit] ?? "";
              const value =
                drafts[svc.id] ??
                String(
                  overrideEnabled
                    ? effectivePrice(svc.id)
                    : networkPrice(svc.id),
                );
              return (
                <tr key={svc.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{svc.name}</p>
                    <p className="text-muted-foreground text-[11px] capitalize">
                      {svc.category}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    ${svc.defaultPrice}
                    <span className="text-muted-foreground">{unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Input
                      type="number"
                      min={0}
                      value={value}
                      disabled={!overrideEnabled}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [svc.id]: e.target.value }))
                      }
                      onBlur={() => commit(svc.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="ml-auto h-8 w-24 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          overridden
                            ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {overridden ? "Location override" : "Network price"}
                      </Badge>
                      {overridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-1.5 text-[11px]"
                          onClick={() => reset(svc.id)}
                        >
                          <RotateCcw className="size-3" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {services.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-muted-foreground px-4 py-8 text-center text-sm"
                >
                  No services enabled at this location.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
