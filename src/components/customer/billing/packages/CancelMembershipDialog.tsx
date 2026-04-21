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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership;
  plan: MembershipPlan | undefined;
  onConfirm: () => void;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

export function CancelMembershipDialog({
  open,
  onOpenChange,
  membership,
  plan,
  onConfirm,
}: Props) {
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
    const refund = Math.round(
      (membership.monthlyPrice * daysLeft) / cycleDays,
    );
    refundLine = `Estimated prorated refund: ${formatCurrency(refund)} to your original payment method.`;
  } else if (policy.refundRule === "remaining_credits_as_store_credit") {
    const remaining =
      membership.creditsRemaining > 0 ? membership.creditsRemaining : 0;
    refundLine = `${remaining} unused credits will convert to store credit you can use for future bookings.`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Cancel {membership.planName}?
          </DialogTitle>
          <DialogDescription>
            Please review what happens when you cancel this membership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Access ends</p>
            <p className="mt-0.5 font-medium">
              {effectiveDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {policy.cancellationPolicy === "immediate"
                ? " (immediately)"
                : ` (end of current ${membership.billingCycle} cycle)`}
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
                This plan requires {policy.noticeRequiredDays} days notice; your
                next billing date already accounts for that.
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
            Keep membership
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Cancel membership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
