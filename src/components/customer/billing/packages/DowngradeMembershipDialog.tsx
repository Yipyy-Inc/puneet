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
import { ArrowDownCircle, Minus, CalendarClock, Coins } from "lucide-react";
import type { Membership, MembershipPlan } from "@/data/services-pricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function DowngradeMembershipDialog({
  open,
  onOpenChange,
  membership,
  currentPlan,
  allPlans,
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const eligiblePlans = useMemo(() => {
    if (!currentPlan) return [];
    const explicitIds = currentPlan.downgradePlanIds;
    if (explicitIds && explicitIds.length > 0) {
      return allPlans.filter(
        (p) =>
          explicitIds.includes(p.id) && p.isActive && p.id !== currentPlan.id,
      );
    }
    return allPlans.filter(
      (p) =>
        p.isActive &&
        p.id !== currentPlan.id &&
        p.monthlyPrice < currentPlan.monthlyPrice,
    );
  }, [allPlans, currentPlan]);

  const selected = allPlans.find((p) => p.id === selectedId) ?? null;
  const target =
    selected ?? (eligiblePlans.length === 1 ? eligiblePlans[0] : null);

  // Perks that disappear on the lower tier.
  const lost = useMemo(() => {
    if (!target || !currentPlan) return [];
    return currentPlan.perks.filter((perk) => !target.perks.includes(perk));
  }, [target, currentPlan]);

  const unusedCredits =
    membership.creditsRemaining > 0 ? membership.creditsRemaining : 0;

  const handleClose = (v: boolean) => {
    if (!v) setSelectedId(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="size-5 text-blue-600" />
            Downgrade your plan
          </DialogTitle>
          <DialogDescription>
            Downgrades take effect on your next billing date. Your current plan
            and perks continue until then.
          </DialogDescription>
        </DialogHeader>

        {eligiblePlans.length === 0 ? (
          <div className="bg-muted/30 rounded-lg border p-4 text-center text-sm">
            <p className="text-muted-foreground">
              No lower-tier plans are available for your subscription.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {eligiblePlans.length > 1 && (
              <div className="space-y-2">
                {eligiblePlans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      selectedId === p.id
                        ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.tierLabel && (
                        <Badge variant="outline" className="text-[10px]">
                          {p.tierLabel}
                        </Badge>
                      )}
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(p.monthlyPrice)}
                      <span className="text-muted-foreground text-[11px] font-normal">
                        {" "}
                        / mo
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!target || !currentPlan ? (
              <p className="text-muted-foreground text-center text-sm">
                Select a plan above to review what changes.
              </p>
            ) : (
              <>
                {/* What's lost */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="mb-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Moving to {target.name} — what you&apos;ll lose
                  </p>
                  {lost.length > 0 ? (
                    <ul className="space-y-1">
                      {lost.map((perk, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-200"
                        >
                          <Minus className="size-3 shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                      Your perks stay the same, but your monthly credit
                      allotment drops from {currentPlan.credits} to{" "}
                      {target.credits}.
                    </p>
                  )}
                </div>

                {/* Effective date */}
                <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <CalendarClock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Effective next cycle</p>
                    <p className="text-muted-foreground text-xs">
                      Your new plan starts on{" "}
                      {formatDate(membership.nextBillingDate)}. Until then you
                      keep {currentPlan.name}.
                    </p>
                  </div>
                </div>

                {/* Fate of unused credits */}
                <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <Coins className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Your unused credits</p>
                    <p className="text-muted-foreground text-xs">
                      {unusedCredits > 0
                        ? `You have ${unusedCredits} unused credit${
                            unusedCredits === 1 ? "" : "s"
                          }. Use them before ${formatDate(
                            membership.nextBillingDate,
                          )} — they don't carry over, and your new plan resets to ${
                            target.credits
                          } credits per cycle.`
                        : `No unused credits remain. Your new plan provides ${target.credits} credits per cycle.`}
                    </p>
                  </div>
                </div>

                {/* Price change */}
                <div className="bg-muted/30 flex justify-between rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">
                    New monthly price
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(target.monthlyPrice)}
                    <span className="text-muted-foreground text-[11px] font-normal">
                      {" "}
                      (−
                      {formatCurrency(
                        currentPlan.monthlyPrice - target.monthlyPrice,
                      )}{" "}
                      / mo)
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Keep current plan
          </Button>
          <Button
            variant="secondary"
            disabled={!target}
            onClick={() => {
              if (target) {
                onConfirm(target.id);
                handleClose(false);
              }
            }}
          >
            Downgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
