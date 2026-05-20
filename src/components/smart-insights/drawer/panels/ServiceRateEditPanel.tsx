"use client";

import { useState } from "react";
import { DollarSign, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 4.2 Take Action — open the Rates tab with the specific service
 * highlighted. Single-field price edit. Spec § 4.2 requires the disclaimer
 * about historical-data-not-a-guarantee — already on the card; we surface a
 * reminder here too.
 */

const SERVICE = {
  module: "Daycare",
  name: "Daycare Standard Rate",
  unit: "per day",
  currentPrice: 45,
  recommendedPrice: 48,
  annualImpact: 6800,
};

export function ServiceRateEditPanel({
  insight,
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [newPrice, setNewPrice] = useState<number>(SERVICE.recommendedPrice);

  const formValid = newPrice > 0 && newPrice !== SERVICE.currentPrice;
  const delta = newPrice - SERVICE.currentPrice;
  const deltaPct = (delta / SERVICE.currentPrice) * 100;

  if (step === "form") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <DollarSign className="size-3.5" />
            {SERVICE.module} · Rates
          </div>
          <p className="font-semibold">{SERVICE.name}</p>
          <p className="text-muted-foreground text-xs">{SERVICE.unit}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Current price</Label>
            <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm font-semibold">
              ${SERVICE.currentPrice.toFixed(2)}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-price">New price</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="new-price"
                type="number"
                step="0.5"
                min={0}
                value={Number.isFinite(newPrice) ? newPrice : ""}
                onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                className="pl-7"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Recommended: ${SERVICE.recommendedPrice}
            </p>
          </div>
        </div>

        {Number.isFinite(delta) && delta !== 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className={
                delta > 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-red-300 bg-red-50 text-red-800"
              }
            >
              {delta > 0 ? "+" : ""}${delta.toFixed(2)} ({deltaPct.toFixed(1)}%)
            </Badge>
            {newPrice === SERVICE.recommendedPrice && (
              <Badge variant="outline">
                Est. annual impact: ${SERVICE.annualImpact.toLocaleString()}
              </Badge>
            )}
          </div>
        )}

        {insight.disclaimer && (
          <div className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-2 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
            <span className="text-amber-900">{insight.disclaimer}</span>
          </div>
        )}

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Review change"
            onPrimary={() => setStep("confirm")}
            primaryDisabled={!formValid}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <ConfirmBeforeModify
        title="Confirm price update"
        changes={[
          { field: "Module", to: SERVICE.module },
          { field: "Service", to: SERVICE.name },
          {
            field: "Price",
            from: `$${SERVICE.currentPrice.toFixed(2)} ${SERVICE.unit}`,
            to: `$${newPrice.toFixed(2)} ${SERVICE.unit}`,
          },
        ]}
        note="Existing bookings keep their current price. The new rate applies to bookings created after this change."
      />

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Save new price"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setStep("form")}
        />
      </div>
    </div>
  );
}
