"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultServiceAddOns } from "@/data/service-addons";
import type { ServiceAddOn } from "@/types/facility";

function loadServiceAddOns(serviceFilter: string): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns.filter((a) => a.applicableServices.includes(serviceFilter));
  try {
    const raw = localStorage.getItem("settings-service-addons");
    const all = raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
    return all.filter((a) => a.isActive && a.applicableServices.includes(serviceFilter));
  } catch {
    return defaultServiceAddOns.filter((a) => a.applicableServices.includes(serviceFilter));
  }
}

function fmtPrice(addon: ServiceAddOn): string {
  switch (addon.pricingType) {
    case "flat": return `$${addon.price}`;
    case "per_day": return `$${addon.price}/day`;
    case "per_session": return `$${addon.price}/${addon.unitLabel ?? "session"}`;
    case "per_hour": return `$${addon.price}/${addon.unitLabel ?? "hr"}`;
    case "per_item": return `$${addon.price}/${addon.unitLabel ?? "item"}`;
    case "percentage_of_booking": return `${addon.price}% of booking`;
  }
}

interface Props {
  serviceFilter: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function IncludedAddOnsPicker({ serviceFilter, selectedIds, onChange }: Props) {
  const [addOns, setAddOns] = useState<ServiceAddOn[]>([]);

  useEffect(() => {
    setAddOns(loadServiceAddOns(serviceFilter));
  }, [serviceFilter]);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="flex items-center gap-1.5 text-sm">
          <Gift className="size-3.5 text-emerald-600" />
          Included Add-Ons (free)
        </Label>
        <p className="text-muted-foreground mt-0.5 text-xs">
          These add-ons are bundled into this rate at no extra charge, even if they have a price in your catalog.
        </p>
      </div>

      {addOns.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          No active {serviceFilter} add-ons found.{" "}
          <a
            href={`/facility/dashboard/services/${serviceFilter}/add-ons`}
            className="text-primary underline underline-offset-2"
          >
            Create add-ons first
          </a>
        </p>
      ) : (
        <div className="rounded-lg border">
          {addOns.map((addon, i) => {
            const selected = selectedIds.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => toggle(addon.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                  i > 0 && "border-t",
                  selected && "bg-emerald-50/60",
                )}
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    selected ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground/30",
                  )}
                >
                  {selected && <Check className="size-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none">{addon.name}</p>
                  {addon.description && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{addon.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="outline" className="text-xs line-through opacity-60">
                    {fmtPrice(addon)}
                  </Badge>
                  <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                    <Gift className="size-2.5" /> Free
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {selectedIds.length} add-on{selectedIds.length > 1 ? "s" : ""} included free with this rate
        </p>
      )}
    </div>
  );
}
