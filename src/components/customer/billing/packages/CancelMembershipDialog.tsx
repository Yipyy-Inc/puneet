"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { Membership, MembershipPlan } from "@/data/services-pricing";
import { defaultMembershipChangePolicy } from "@/data/services-pricing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatMoney } from "@/lib/i18n/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership;
  plan: MembershipPlan | undefined;
  onConfirm: () => void;
}

export function CancelMembershipDialog({
  open,
  onOpenChange,
  membership,
  plan,
  onConfirm,
}: Props) {
  const { t, fill, locale } = useCustomerText("packages");
  const [nowMs] = useState(() => Date.now());
  const policy = plan?.changePolicy ?? defaultMembershipChangePolicy;

  const effectiveDate =
    policy.cancellationPolicy === "immediate"
      ? new Date(nowMs)
      : new Date(membership.nextBillingDate);

  let refundLine: string | null = null;
  if (policy.refundRule === "prorated") {
    const nextMs = new Date(membership.nextBillingDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((nextMs - nowMs) / 86_400_000));
    const cycleDays =
      membership.billingCycle === "annually" ||
      membership.billingCycle === "yearly"
        ? 365
        : membership.billingCycle === "quarterly"
          ? 90
          : 30;
    const refund = Math.round((membership.monthlyPrice * daysLeft) / cycleDays);
    refundLine = fill("estimatedProratedRefund", {
      amount: formatMoney(refund, locale),
    });
  } else if (policy.refundRule === "remaining_credits_as_store_credit") {
    const remaining =
      membership.creditsRemaining > 0 ? membership.creditsRemaining : 0;
    refundLine = fill("unusedCreditsToStoreCredit", { n: remaining });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {fill("cancelPlanQuestion", { plan: membership.planName })}
          </DialogTitle>
          <DialogDescription>
            {t("pleaseReviewWhatHappensWhen")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">{t("accessEnds")}</p>
            <p className="mt-0.5 font-medium">
              {formatDateLong(effectiveDate, locale)}{" "}
              {policy.cancellationPolicy === "immediate"
                ? t("immediatelyParen")
                : t("endOfCurrentCycleParen")}
            </p>
          </div>

          {refundLine && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              {refundLine}
            </div>
          )}

          {policy.noticeRequiredDays > 0 &&
            policy.cancellationPolicy === "end_of_cycle" && (
              <p className="text-muted-foreground text-xs">
                {fill("noticeRequired", { n: policy.noticeRequiredDays })}
              </p>
            )}

          {policy.policyNotes && (
            <p className="text-muted-foreground bg-muted/20 rounded-lg border p-3 text-xs">
              {policy.policyNotes}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keepMembership")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t("cancelMembership")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
