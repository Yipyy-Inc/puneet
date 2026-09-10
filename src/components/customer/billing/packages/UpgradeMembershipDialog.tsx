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
import { ArrowUpCircle, Check, Plus } from "lucide-react";
import type { Membership, MembershipPlan } from "@/data/services-pricing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatList, formatMoney } from "@/lib/i18n/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership;
  currentPlan: MembershipPlan | undefined;
  allPlans: MembershipPlan[];
  onConfirm: (newPlanId: string) => void;
}

function cycleLengthDays(cycle: Membership["billingCycle"]) {
  if (cycle === "annually" || cycle === "yearly") return 365;
  if (cycle === "quarterly") return 90;
  if (cycle === "weekly") return 7;
  return 30;
}

export function UpgradeMembershipDialog({
  open,
  onOpenChange,
  membership,
  currentPlan,
  allPlans,
  onConfirm,
}: Props) {
  const { t, fill, locale } = useCustomerText("packages");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const eligiblePlans = useMemo(() => {
    if (!currentPlan) return [];
    const explicitIds = currentPlan.upgradePlanIds;
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
        p.monthlyPrice > currentPlan.monthlyPrice,
    );
  }, [allPlans, currentPlan]);

  const selected = allPlans.find((p) => p.id === selectedId) ?? null;

  const priceDiff =
    selected && currentPlan
      ? selected.monthlyPrice - currentPlan.monthlyPrice
      : 0;

  const proratedCharge = useMemo(() => {
    if (!selected || !currentPlan) return 0;
    const nextMs = new Date(membership.nextBillingDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((nextMs - nowMs) / 86_400_000));
    const cycleDays = cycleLengthDays(membership.billingCycle);
    return Math.max(0, Math.round((priceDiff * daysLeft) / cycleDays));
  }, [selected, currentPlan, membership, nowMs, priceDiff]);

  // Perks the customer gains by moving to the selected plan.
  const gains = useMemo(() => {
    if (!selected || !currentPlan) return [];
    return selected.perks.filter((perk) => !currentPlan.perks.includes(perk));
  }, [selected, currentPlan]);

  const handleClose = (v: boolean) => {
    if (!v) setSelectedId(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="size-5 text-emerald-600" />
            {t("upgradeYourPlan")}
          </DialogTitle>
          <DialogDescription>{t("upgradesTakeEffect")}</DialogDescription>
        </DialogHeader>

        {eligiblePlans.length === 0 ? (
          <div className="bg-muted/30 rounded-lg border p-4 text-center text-sm">
            <p className="text-muted-foreground">{t("noHigherTierPlansAre")}</p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Choose target plan (skipped visually when only one option) */}
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
                      {formatMoney(p.monthlyPrice, locale)}
                      <span className="text-muted-foreground text-[11px] font-normal">
                        {" "}
                        {t("perMonth")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Side-by-side comparison */}
            {(() => {
              const target =
                selected ??
                (eligiblePlans.length === 1 ? eligiblePlans[0] : null);
              if (!target || !currentPlan) {
                return (
                  <p className="text-muted-foreground text-center text-sm">
                    {t("selectAPlanAboveTo2")}
                  </p>
                );
              }
              const activeTarget = target;
              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Current */}
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-[11px] uppercase">
                        {t("current")}
                      </p>
                      <p className="mt-0.5 font-semibold">{currentPlan.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatMoney(currentPlan.monthlyPrice, locale)}{" "}
                        {t("perMonth")}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {currentPlan.perks.map((perk, i) => (
                          <li
                            key={i}
                            className="text-muted-foreground flex items-center gap-1.5 text-xs"
                          >
                            <Check className="size-3 shrink-0" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* New */}
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                      <p className="text-[11px] text-emerald-700 uppercase dark:text-emerald-400">
                        {t("new")}
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {activeTarget.name}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {formatMoney(activeTarget.monthlyPrice, locale)}{" "}
                        {t("perMonth")}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {activeTarget.perks.map((perk, i) => {
                          const isGain = !currentPlan.perks.includes(perk);
                          return (
                            <li
                              key={i}
                              className={`flex items-center gap-1.5 text-xs ${
                                isGain
                                  ? "font-medium text-emerald-700 dark:text-emerald-300"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isGain ? (
                                <Plus className="size-3 shrink-0 text-emerald-600" />
                              ) : (
                                <Check className="size-3 shrink-0" />
                              )}
                              {perk}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {gains.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <span className="font-semibold">
                        {fill(
                          gains.length === 1
                            ? "youGainPerksOne"
                            : "youGainPerksOther",
                          { n: gains.length },
                        )}
                      </span>{" "}
                      {formatList(gains, locale)}.
                    </div>
                  )}

                  {/* Price difference + prorated charge */}
                  <div className="bg-muted/30 space-y-1 rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("priceDifference")}
                      </span>
                      <span className="font-medium">
                        +
                        {formatMoney(
                          activeTarget.monthlyPrice - currentPlan.monthlyPrice,
                          locale,
                        )}{" "}
                        {t("perMonth")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("proratedChargeToday")}
                      </span>
                      <span className="font-semibold">
                        {formatMoney(proratedCharge, locale)}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={eligiblePlans.length === 0}
            onClick={() => {
              const target =
                selected ??
                (eligiblePlans.length === 1 ? eligiblePlans[0] : null);
              if (target) {
                onConfirm(target.id);
                handleClose(false);
              }
            }}
          >
            {t("upgradeNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
