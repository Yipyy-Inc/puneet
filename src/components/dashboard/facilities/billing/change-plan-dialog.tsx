"use client";

import { useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/data/subscription-tiers";
import type { BillingCycle } from "@/types/facility-billing";

const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  yearly: "/yr",
};

export interface ChangePlanResult {
  tierId: string;
  planName: string;
  amount: number;
  billingCycle: BillingCycle;
  effective: "immediately" | "next_renewal";
}

export function ChangePlanDialog({
  tiers,
  currentTierId,
  billingCycle,
  currency,
  onConfirm,
  onClose,
}: {
  tiers: SubscriptionTier[];
  currentTierId: string;
  billingCycle: BillingCycle;
  currency: string;
  onConfirm: (result: ChangePlanResult) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(currentTierId);
  const [effective, setEffective] = useState<"immediately" | "next_renewal">(
    "next_renewal",
  );

  const currentTier = tiers.find((t) => t.id === currentTierId);
  const selectedTier = tiers.find((t) => t.id === selectedId);
  const changed = selectedId !== currentTierId;

  const gained =
    selectedTier && currentTier
      ? selectedTier.features.filter((f) => !currentTier.features.includes(f))
      : [];
  const lost =
    selectedTier && currentTier
      ? currentTier.features.filter((f) => !selectedTier.features.includes(f))
      : [];

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>
            Choose a new tier and when the change takes effect.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-1">
          <div className="grid gap-3 sm:grid-cols-2">
            {tiers.map((t) => {
              const isCurrent = t.id === currentTierId;
              const isSelected = t.id === selectedId;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  data-on={isSelected ? "true" : undefined}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all hover:border-violet-300",
                    "data-[on=true]:border-violet-500 data-[on=true]:ring-1 data-[on=true]:ring-violet-500",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      {t.name}
                      {isCurrent && (
                        <Badge variant="secondary" className="text-[10px]">
                          Current
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {fmt(t.pricing[billingCycle])}
                      <span className="text-muted-foreground font-normal">
                        {CYCLE_SUFFIX[billingCycle]}
                      </span>
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t.description}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {t.features.slice(0, 3).map((f) => (
                      <li
                        key={f}
                        className="text-foreground/80 flex items-center gap-1.5 text-xs"
                      >
                        <Check className="size-3 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label>When should this take effect?</Label>
            <RadioGroup
              value={effective}
              onValueChange={(v) =>
                setEffective(v as "immediately" | "next_renewal")
              }
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <RadioGroupItem value="immediately" />
                Immediately (prorated)
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <RadioGroupItem value="next_renewal" />
                At next renewal
              </label>
            </RadioGroup>
          </div>

          {changed && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <p className="mb-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Features gained
                </p>
                {gained.length > 0 ? (
                  <ul className="space-y-1">
                    {gained.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs">
                        <Check className="size-3 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">None</p>
                )}
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/40 dark:bg-rose-950/10">
                <p className="mb-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Features lost
                </p>
                {lost.length > 0 ? (
                  <ul className="space-y-1">
                    {lost.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs">
                        <Minus className="size-3 shrink-0 text-rose-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">None</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!changed}
            onClick={() => {
              if (!selectedTier) return;
              onConfirm({
                tierId: selectedTier.id,
                planName: selectedTier.name,
                amount: selectedTier.pricing[billingCycle],
                billingCycle,
                effective,
              });
              onClose();
            }}
          >
            Confirm change
            <ArrowRight className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
