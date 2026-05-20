"use client";

import { useState } from "react";
import { Package, TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 9.2 Take Action — open the item's detail to adjust threshold and
 * default reorder quantity in response to a usage spike.
 */

const ITEM = {
  name: "Ear Cleaning Solution",
  unit: "bottles",
  currentStock: 11,
  currentThreshold: 8,
  currentDefaultQty: 12,
  weeklyUsage60d: 9.2,
  weeklyUsageCurrent: 14,
};

const HISTORY = [
  { week: "Week of May 4", used: 9 },
  { week: "Week of May 11", used: 11 },
  { week: "Week of May 18", used: 14 },
  { week: "60-day avg", used: 9.2 },
];

export function InventoryItemEditPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [threshold, setThreshold] = useState<number>(ITEM.currentThreshold);
  const [defaultQty, setDefaultQty] = useState<number>(ITEM.currentDefaultQty);

  const valid = threshold >= 0 && defaultQty > 0;
  const thresholdChanged = threshold !== ITEM.currentThreshold;
  const qtyChanged = defaultQty !== ITEM.currentDefaultQty;

  if (step === "form") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Package className="size-3.5" />
            Inventory · Grooming
          </div>
          <p className="font-semibold">{ITEM.name}</p>
          <p className="text-muted-foreground text-xs">
            In stock: {ITEM.currentStock} {ITEM.unit}
          </p>
        </div>

        <div className="rounded-lg border bg-amber-50/60 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            <TrendingUp className="size-3.5" />
            Usage spike
          </div>
          <ul className="space-y-1 text-xs text-amber-900">
            {HISTORY.map((h) => (
              <li key={h.week} className="flex justify-between">
                <span>{h.week}</span>
                <span className="font-semibold">{h.used} {ITEM.unit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ie-threshold">Reorder threshold</Label>
            <Input
              id="ie-threshold"
              type="number"
              min={0}
              value={Number.isFinite(threshold) ? threshold : ""}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              Current: {ITEM.currentThreshold} {ITEM.unit}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ie-qty">Default order qty</Label>
            <Input
              id="ie-qty"
              type="number"
              min={1}
              value={Number.isFinite(defaultQty) ? defaultQty : ""}
              onChange={(e) => setDefaultQty(parseFloat(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              Current: {ITEM.currentDefaultQty} {ITEM.unit}
            </p>
          </div>
        </div>

        {(thresholdChanged || qtyChanged) && (
          <div className="flex flex-wrap gap-2">
            {thresholdChanged && (
              <Badge variant="outline">
                Threshold {ITEM.currentThreshold} → {threshold}
              </Badge>
            )}
            {qtyChanged && (
              <Badge variant="outline">
                Default qty {ITEM.currentDefaultQty} → {defaultQty}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Review changes"
            onPrimary={() => setStep("confirm")}
            primaryDisabled={!valid || (!thresholdChanged && !qtyChanged)}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <ConfirmBeforeModify
        title="Confirm inventory settings"
        changes={[
          { field: "Item", to: ITEM.name },
          ...(thresholdChanged
            ? [{
                field: "Threshold",
                from: `${ITEM.currentThreshold} ${ITEM.unit}`,
                to: `${threshold} ${ITEM.unit}`,
              }]
            : []),
          ...(qtyChanged
            ? [{
                field: "Default qty",
                from: `${ITEM.currentDefaultQty} ${ITEM.unit}`,
                to: `${defaultQty} ${ITEM.unit}`,
              }]
            : []),
        ]}
        note="Future low-stock insights will use the updated threshold. Existing reorders are unaffected."
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Save settings"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setStep("form")}
        />
      </div>
    </div>
  );
}
