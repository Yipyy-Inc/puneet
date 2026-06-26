"use client";

import { useState } from "react";
import { ArrowUp, Check, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/data/subscription-tiers";
import type { BillingCycle } from "@/types/facility-billing";

function priceFor(tier: SubscriptionTier, cycle: BillingCycle): number {
  return tier.pricing[cycle];
}

function cycleSuffix(cycle: BillingCycle): string {
  return cycle === "yearly" ? "/yr" : cycle === "quarterly" ? "/qtr" : "/mo";
}

function fmtLimit(n: number): string {
  return n === -1 ? "Unlimited" : n.toLocaleString();
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: SubscriptionTier;
  upgradeTiers: SubscriptionTier[];
  billingCycle: BillingCycle;
  onConfirm: (tier: SubscriptionTier) => void;
}

export function UpgradePlanDialog({
  open,
  onOpenChange,
  currentTier,
  upgradeTiers,
  billingCycle,
  onConfirm,
}: UpgradePlanDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    upgradeTiers[0]?.id ?? null,
  );
  const selected = upgradeTiers.find((t) => t.id === selectedId) ?? null;
  const currentFeatures = new Set(currentTier?.features ?? []);
  const gained = selected
    ? selected.features.filter((f) => !currentFeatures.has(f))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            You&apos;re currently on {currentTier?.name ?? "your plan"}. Choose
            a higher tier — the new rate applies from your next billing cycle.
          </DialogDescription>
        </DialogHeader>

        {upgradeTiers.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            You&apos;re already on the highest available plan. 🎉
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {upgradeTiers.map((tier) => {
                const active = tier.id === selectedId;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedId(tier.id)}
                    data-active={active ? "true" : undefined}
                    className={cn(
                      "flex flex-col rounded-xl border p-4 text-left transition-colors",
                      "hover:bg-muted/40 data-[active=true]:border-emerald-500 data-[active=true]:ring-2 data-[active=true]:ring-emerald-500/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{tier.name}</span>
                      {active && <Check className="size-4 text-emerald-600" />}
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      ${priceFor(tier, billingCycle).toLocaleString()}
                      <span className="text-muted-foreground text-sm font-normal">
                        {cycleSuffix(billingCycle)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {tier.description}
                    </p>
                    <div className="mt-3 space-y-1 text-xs">
                      <LimitRow
                        label="Staff users"
                        value={fmtLimit(tier.limitations.maxUsers)}
                      />
                      <LimitRow
                        label="Reservations / mo"
                        value={fmtLimit(tier.limitations.maxReservations)}
                      />
                      <LimitRow
                        label="Locations"
                        value={fmtLimit(tier.limitations.maxLocations)}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {selected && gained.length > 0 && (
              <div className="rounded-lg border bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="size-4 text-emerald-600" />
                  What you gain with {selected.name}
                </p>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {gained.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            <ArrowUp className="mr-1.5 size-4" />
            Upgrade to {selected?.name ?? "plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
