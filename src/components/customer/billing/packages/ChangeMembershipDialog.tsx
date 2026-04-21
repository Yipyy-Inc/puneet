"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Check } from "lucide-react";
import type { Membership, MembershipPlan } from "@/data/services-pricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: "upgrade" | "downgrade";
  membership: Membership;
  currentPlan: MembershipPlan | undefined;
  allPlans: MembershipPlan[];
  onConfirm: (newPlanId: string) => void;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

export function ChangeMembershipDialog({
  open,
  onOpenChange,
  direction,
  membership,
  currentPlan,
  allPlans,
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const eligiblePlans = useMemo(() => {
    if (!currentPlan) return [];
    // Explicit plan IDs take precedence when set
    const explicitIds =
      direction === "upgrade"
        ? currentPlan.upgradePlanIds
        : currentPlan.downgradePlanIds;
    if (explicitIds && explicitIds.length > 0) {
      return allPlans.filter(
        (p) => explicitIds.includes(p.id) && p.isActive && p.id !== currentPlan.id,
      );
    }
    // Otherwise, filter by price above/below the current plan
    return allPlans.filter((p) => {
      if (!p.isActive || p.id === currentPlan.id) return false;
      return direction === "upgrade"
        ? p.monthlyPrice > currentPlan.monthlyPrice
        : p.monthlyPrice < currentPlan.monthlyPrice;
    });
  }, [allPlans, currentPlan, direction]);

  const selected = allPlans.find((p) => p.id === selectedId);

  // Simple proration estimate for upgrade: difference * remaining days / cycle length
  const prorationEstimate = useMemo(() => {
    if (!selected || !currentPlan || direction !== "upgrade") return null;
    const diff = selected.monthlyPrice - currentPlan.monthlyPrice;
    const nextMs = new Date(membership.nextBillingDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((nextMs - nowMs) / 86_400_000));
    const cycleDays =
      membership.billingCycle === "annually" ||
      membership.billingCycle === "yearly"
        ? 365
        : membership.billingCycle === "quarterly"
          ? 90
          : membership.billingCycle === "weekly"
            ? 7
            : 30;
    return Math.round((diff * daysLeft) / cycleDays);
  }, [selected, currentPlan, direction, membership, nowMs]);

  const title = direction === "upgrade" ? "Upgrade your plan" : "Downgrade your plan";
  const actionLabel =
    direction === "upgrade" ? "Confirm upgrade" : "Schedule downgrade";
  const icon =
    direction === "upgrade" ? (
      <ArrowUpCircle className="size-5 text-green-600" />
    ) : (
      <ArrowDownCircle className="size-5 text-blue-600" />
    );

  const handleClose = (v: boolean) => {
    if (!v) setSelectedId(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>
            {direction === "upgrade"
              ? "Upgrades take effect immediately. You'll be charged a prorated amount for the remainder of this cycle."
              : "Downgrades take effect on your next billing date. Your current perks continue until then."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {eligiblePlans.length === 0 ? (
            <div className="bg-muted/30 rounded-lg border p-4 text-center text-sm">
              <p className="text-muted-foreground">
                No{" "}
                {direction === "upgrade"
                  ? "higher tier plans"
                  : "lower tier plans"}{" "}
                available for your subscription.
              </p>
            </div>
          ) : (
            eligiblePlans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`flex w-full items-start justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedId === p.id
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {p.tierLabel && (
                      <Badge variant="outline" className="text-[10px]">
                        {p.tierLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {p.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.perks.slice(0, 2).map((perk, i) => (
                      <span
                        key={i}
                        className="text-muted-foreground flex items-center gap-1 text-[11px]"
                      >
                        <Check className="size-3 text-green-500" />
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <p className="font-semibold">
                    {formatCurrency(p.monthlyPrice)}
                  </p>
                  <p className="text-muted-foreground text-[11px]">/ month</p>
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="bg-muted/30 space-y-1 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">New monthly price</span>
              <span className="font-medium">
                {formatCurrency(selected.monthlyPrice)}
              </span>
            </div>
            {direction === "upgrade" && prorationEstimate !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Prorated charge today
                </span>
                <span className="font-medium">
                  {formatCurrency(Math.max(0, prorationEstimate))}
                </span>
              </div>
            )}
            {direction === "downgrade" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective date</span>
                <span className="font-medium">
                  {new Date(membership.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) onConfirm(selectedId);
              handleClose(false);
            }}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
