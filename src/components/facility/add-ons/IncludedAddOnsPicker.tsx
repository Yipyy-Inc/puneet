"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { addOnsForCareType } from "@/lib/add-ons/availability";
import { addOnRef, namesAddOn } from "@/lib/add-ons/bookable";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { AddOn } from "@/types/add-on";

// One price, and the booking says how many — so one unit. The JSON this list
// replaced priced by day, session, hour or a share of the booking.
function fmtPrice(addon: AddOn, t: (key: string) => string): string {
  return `$${addon.price}/${t("item")}`;
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
  const { t } = useStaffText("includedAddOns");
  // The facility's own extras. One of thirteen localStorage loaders, and this
  // one disagreed with the others: its SSR branch skipped the isActive check,
  // so a retired add-on appeared on the server render and vanished on hydration.
  const { addOns: allAddOns } = useServiceAddOns();
  const addOns = useMemo(
    () => addOnsForCareType(allAddOns, serviceFilter),
    [allAddOns, serviceFilter],
  );

  // An included add-on is named as a booking line names it (`addOnRef`),
  // because the booking step matches its lines against this list; one written
  // as the row's uuid is recognised and cleared the same way.
  const isIncluded = (addOn: AddOn) =>
    selectedIds.some((id) => namesAddOn(id, addOn));

  function toggle(addOn: AddOn) {
    onChange(
      isIncluded(addOn)
        ? selectedIds.filter((id) => !namesAddOn(id, addOn))
        : [...selectedIds, addOnRef(addOn)],
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="flex items-center gap-1.5 text-sm">
          <Gift className="size-3.5 text-emerald-600" />
          {t("title")}
        </Label>
        <p className="text-muted-foreground mt-0.5 text-xs">{t("blurb")}</p>
      </div>

      {addOns.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
          {t("noneFound")}
        </p>
      ) : (
        <div className="rounded-lg border">
          {addOns.map((addon, i) => {
            const selected = isIncluded(addon);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => toggle(addon)}
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
                    {fmtPrice(addon, t)}
                  </Badge>
                  <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                    <Gift className="size-2.5" /> {t("free")}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {/* One sentence with the number INSIDE it: French does not
              pluralise by appending an "s" to the English word. */}
          {t("includedCount").replace("{n}", String(selectedIds.length))}
        </p>
      )}
    </div>
  );
}
