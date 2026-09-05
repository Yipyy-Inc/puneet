"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import { addOnsForService } from "@/lib/settings/addons";
import type { ServiceAddOn } from "@/types/facility";

function fmtPrice(addon: ServiceAddOn): string {
  switch (addon.pricingType) {
    case "flat":
      return `$${addon.price}`;
    case "per_day":
      return `$${addon.price}/day`;
    case "per_session":
      return `$${addon.price}/${addon.unitLabel ?? "session"}`;
    case "per_hour":
      return `$${addon.price}/${addon.unitLabel ?? "hr"}`;
    case "per_item":
      return `$${addon.price}/${addon.unitLabel ?? "item"}`;
    case "percentage_of_booking":
      return `${addon.price}% of booking`;
  }
}

interface Props {
  serviceFilter: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function IncludedAddOnsPicker({
  serviceFilter,
  selectedIds,
  onChange,
}: Props) {
  // The facility's own extras. One of thirteen localStorage loaders, and this
  // one disagreed with the others: its SSR branch skipped the isActive check,
  // so a retired add-on appeared on the server render and vanished on hydration.
  const { addOns: allAddOns } = useServiceAddOns();
  const addOns = useMemo(
    () => addOnsForService(allAddOns, serviceFilter),
    [allAddOns, serviceFilter],
  );

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
          These add-ons are bundled into this rate at no extra charge, even if
          they have a price in your catalog.
        </p>
      </div>

      {addOns.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          No active {serviceFilter} add-ons found. Create them in the Add-ons
          tab on this page.
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
                  "hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  i > 0 && "border-t",
                  selected && "bg-emerald-50/60",
                )}
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-sm border-2 transition-colors",
                    selected
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-muted-foreground/30",
                  )}
                >
                  {selected && <Check className="size-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-none font-medium">
                    {addon.name}
                  </p>
                  {addon.description && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {addon.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs line-through opacity-60"
                  >
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
          {selectedIds.length} add-on{selectedIds.length > 1 ? "s" : ""}{" "}
          included free with this rate
        </p>
      )}
    </div>
  );
}
